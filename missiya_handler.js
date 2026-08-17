"use strict";

const {
  butunMissiyalariAl,
  missiyaniTap
} = require("./missiya_kataloqu");

const {
  missiyaStateTeminEt,
  missiyaGorunusunuHazirla,
  aktivMissiyaniTap,
  mukafatAlinib,
  serverHadiseSayiniAl,
  serverHadisesiniQeydEt
} = require("./missiya_proqres");

const {
  missiyaMukafatiniAl
} = require("./missiya_mukafat");

const {
  gameplayNeticesiniIzlemeyeHazirla
} = require("./missiya_gameplay_musahide");

const {
  missiyaDaimiVeziyyetiniAl,
  missiyaDaimiVeziyyetiniAlClient,
  daimiVeziyyetiStateIleBirlesdir
} = require("./missiya_postgres");

const {
  missiyaMukafatAuditiniYazClient
} = require("./missiya_mukafat_tranzaksiya");

const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MISSIYA_MESAJLARI = new Set([
  "mission_list_request",
  "mission_info_request",
  "mission_reward_claim_request",

  // Köhnə client compatibility mesajı.
  // Client state-i server state-inin üzərinə yaza bilməz.
  "save_state"
]);

const STATE_DEYISEN_MESAJLAR = new Set([
  "research_start",
  "technology_research_start",
  "expand_area_request",
  "expand_base",
  "build_request",
  "train_unit_request",
  "upgrade_request",
  "base_teleport_request",
  "move_request",
  "connect_road_request",
  "start_construction_request"
]);

const POSTGRES_ATOMIK_MUTASIYA_MESAJLARI = new Set([
  // Qoşun handler-i eyni oyunçu üçün PostgreSQL advisory lock alır,
  // son snapshot-ı kiliddən sonra oxuyur və commit olunmuş state-i RAM-a qaytarır.
  // Legacy setImmediate snapshot həmin commit-i köhnə state ilə əvəz edə bilər.
  "train_unit_request"
]);

const BERPA_MESAJLARI = new Set([
  "auth",
  "account_login_request",
  "account_session_refresh_request",
  "account_provider_login_request",
  "account_device_pin_verify_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function autentifikasiyaOlunmusPlayerIdAl(ws) {
  return metnAl(ws && ws._authedPlayerId, 128);
}

function derinKopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

function neticeTipiniAl(type) {
  if (type === "save_state") {
    return "save_rejected";
  }

  return String(type || "").replace("_request", "_result");
}

function ugursuzCavab(kontekst, type, message, elave = {}) {
  kontekst.send(kontekst.ws, {
    type,
    success: false,
    message,
    serverTimeUnixMs: kontekst.nowMs(),
    ...elave
  });
}

function oyunStateGonder(kontekst, playerId, state, xeriteleriDeGonder = false) {
  if (
    typeof kontekst.makeClientState !== "function" ||
    typeof kontekst.send !== "function"
  ) {
    return;
  }

  kontekst.send(kontekst.ws, {
    type: "state",
    playerId,
    serverTimeUnixMs: kontekst.nowMs(),
    payloadJson: JSON.stringify(
      kontekst.makeClientState(state)
    )
  });

  if (!xeriteleriDeGonder) return;

  if (typeof kontekst.sendStateLocalMapToPlayer === "function") {
    kontekst.sendStateLocalMapToPlayer(kontekst.ws, playerId);
  }

  if (typeof kontekst.sendWorldMapToPlayer === "function") {
    kontekst.sendWorldMapToPlayer(kontekst.ws, playerId);
  }
}

async function daimiMissiyaStateYukle(playerId, state) {
  const daimiVeziyyet = await missiyaDaimiVeziyyetiniAl(playerId);
  daimiVeziyyetiStateIleBirlesdir(state, daimiVeziyyet);
}

function stateIleEvezEt(hedef, menbe) {
  for (const acar of Object.keys(hedef)) {
    delete hedef[acar];
  }

  Object.assign(hedef, derinKopyala(menbe));
}

async function missiyaMukafatMutasiyasiniTetbiqEt(
  state,
  playerId,
  missionId,
  client
) {
  const daimiVeziyyet =
    await missiyaDaimiVeziyyetiniAlClient(client, playerId);

  daimiVeziyyetiStateIleBirlesdir(state, daimiVeziyyet);
  bazaGirisiKecidiniTeminEt(state);

  // Reward əvvəl clone üzərində hesablanır. Audit duplicate çıxarsa,
  // authoritative state-ə heç bir resurs artımı köçürülmür.
  const isState = derinKopyala(state);
  const netice = missiyaMukafatiniAl(isState, missionId);

  if (!netice.success) {
    return {
      ...netice,
      deyisdi: false
    };
  }

  bazaGirisiKecidiniTeminEt(isState);

  const auditNeticesi = await missiyaMukafatAuditiniYazClient(
    client,
    playerId,
    netice.missionId
  );

  if (auditNeticesi.artiqMovcuddur) {
    daimiVeziyyetiStateIleBirlesdir(state, {
      claimedRewardIds: [netice.missionId],
      eventCounters: {}
    });
    bazaGirisiKecidiniTeminEt(state);

    return {
      success: false,
      alreadyClaimed: true,
      locked: false,
      missionId: netice.missionId,
      message: "Missiya mükafatı artıq alınıb.",
      rewards: [],
      deyisdi: false
    };
  }

  stateIleEvezEt(state, isState);

  return {
    ...netice,
    deyisdi: true
  };
}

function bazaGirisiKecidiniTeminEt(state) {
  if (!mukafatAlinib(state, "M007")) {
    return;
  }

  if (serverHadiseSayiniAl(state, "baza_girisi_aktivlesdi") > 0) {
    return;
  }

  // M007 server claim-i giriş xəttinin hekayə üzrə aktivləşmə şərtidir.
  // Bu dəyər derived state-dir: restartdan sonra M007 DB claimindən yenidən qurulur.
  serverHadisesiniQeydEt(state, "baza_girisi_aktivlesdi", 1);
}

async function snapshotBerpasiniTeminEt(kontekst, playerId, stateGonderilsin = false) {
  if (oyuncuStateBerpaOlunub(playerId)) {
    return false;
  }

  const berpaOlundu = await oyunStateIniBerpaEt(kontekst, playerId);

  if (berpaOlundu && stateGonderilsin) {
    const state = kontekst.getOrCreatePlayerState(playerId);
    oyunStateGonder(kontekst, playerId, state, true);
  }

  return berpaOlundu;
}

function authdanSonraBerpaniPlanla(kontekst) {
  if (!BERPA_MESAJLARI.has(kontekst && kontekst.type)) {
    return;
  }

  const cehdEt = async () => {
    const playerId = autentifikasiyaOlunmusPlayerIdAl(
      kontekst && kontekst.ws
    );

    if (!playerId || oyuncuStateBerpaOlunub(playerId)) {
      return;
    }

    try {
      await snapshotBerpasiniTeminEt(kontekst, playerId, true);
    }
    catch (xeta) {
      console.error("[OYUN_STATE_BERPA] Xəta:", {
        playerId,
        message: xeta && xeta.message ? xeta.message : String(xeta)
      });
    }
  };

  // Legacy auth sinxron, hesab/Google login isə DB sorğulu ola bilər.
  setImmediate(() => void cehdEt());
  setTimeout(() => void cehdEt(), 350);
  setTimeout(() => void cehdEt(), 1200);
}

function gameplaySnapshotiTelebOlunur(type) {
  const mesajTipi = metnAl(type, 128);

  return (
    STATE_DEYISEN_MESAJLAR.has(mesajTipi) &&
    !POSTGRES_ATOMIK_MUTASIYA_MESAJLARI.has(mesajTipi)
  );
}

function gameplaySnapshotiniPlanla(kontekst, playerId) {
  const type = metnAl(kontekst && kontekst.type, 128);

  if (!gameplaySnapshotiTelebOlunur(type)) {
    return;
  }

  if (
    !kontekst ||
    typeof kontekst.getOrCreatePlayerState !== "function"
  ) {
    return;
  }

  const evvelkiState = derinKopyala(
    kontekst.getOrCreatePlayerState(playerId)
  );

  setImmediate(async () => {
    try {
      const sonState = kontekst.getOrCreatePlayerState(playerId);

      if (JSON.stringify(evvelkiState) === JSON.stringify(sonState)) {
        return;
      }

      await oyunStateIniYaddaSaxla(playerId, sonState);

      console.log("[OYUN_STATE_SNAPSHOT] Gameplay dəyişiklik saxlanıldı:", {
        playerId,
        type
      });
    }
    catch (xeta) {
      console.error("[OYUN_STATE_SNAPSHOT] Gameplay snapshot xətası:", {
        playerId,
        type,
        message: xeta && xeta.message ? xeta.message : String(xeta)
      });
    }
  });
}

async function missiyaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);

  // Auth/login başa çatandan sonra varsa PostgreSQL snapshot bərpa edilir.
  authdanSonraBerpaniPlanla(kontekst);

  // Gameplay sorğularının nəticəsini yalnız server state-i dəyişəndən
  // sonra yoxlayan observer. Client missiya progressini birbaşa yaza bilmir.
  gameplayNeticesiniIzlemeyeHazirla(kontekst);

  // Missiya mesajı deyilsə də bu wrapper bütün gameplay sorğularından keçir.
  // İlk gameplay əməliyyatından əvvəl snapshot bərpasını məcburi tamamlayırıq.
  if (!MISSIYA_MESAJLARI.has(type)) {
    const playerId = autentifikasiyaOlunmusPlayerIdAl(
      kontekst && kontekst.ws
    );

    if (
      playerId &&
      typeof kontekst.getOrCreatePlayerState === "function"
    ) {
      try {
        await snapshotBerpasiniTeminEt(kontekst, playerId, false);
      }
      catch (xeta) {
        console.error("[OYUN_STATE_BERPA] Gameplay-dən əvvəl bərpa alınmadı:", {
          playerId,
          type,
          message: xeta && xeta.message ? xeta.message : String(xeta)
        });

        ugursuzCavab(
          kontekst,
          "gameplay_temporarily_unavailable",
          "Oyun vəziyyəti daimi yaddaşdan bərpa edilə bilmədi. Bir az sonra yenidən yoxlayın.",
          { playerId }
        );
        return true;
      }

      gameplaySnapshotiniPlanla(kontekst, playerId);
    }

    return false;
  }

  const playerId = autentifikasiyaOlunmusPlayerIdAl(
    kontekst && kontekst.ws
  );

  if (!playerId) {
    ugursuzCavab(
      kontekst,
      neticeTipiniAl(type),
      "Bu əməliyyat üçün oyunçu autentifikasiya olunmayıb."
    );
    return true;
  }

  if (typeof kontekst.getOrCreatePlayerState !== "function") {
    ugursuzCavab(
      kontekst,
      neticeTipiniAl(type),
      "Server oyunçu state funksiyası əlçatan deyil."
    );
    return true;
  }

  try {
    await snapshotBerpasiniTeminEt(kontekst, playerId, false);
  }
  catch (xeta) {
    console.error("[OYUN_STATE_BERPA] Missiya əməliyyatından əvvəl bərpa alınmadı:", {
      playerId,
      type,
      message: xeta && xeta.message ? xeta.message : String(xeta)
    });

    ugursuzCavab(
      kontekst,
      neticeTipiniAl(type),
      "Oyun vəziyyəti daimi yaddaşdan bərpa edilə bilmədi. Bir az sonra yenidən yoxlayın.",
      { playerId }
    );
    return true;
  }

  const state = kontekst.getOrCreatePlayerState(playerId);
  missiyaStateTeminEt(state);

  // ==========================================================
  // LEGACY SAVE_STATE QORUMASI
  // ----------------------------------------------------------
  // Cari Unity kodu save_state göndərmir. Köhnə client göndərsə belə
  // payloadJson server state-inin üzərinə yazılmır.
  // ==========================================================
  if (type === "save_state") {
    kontekst.send(kontekst.ws, {
      type: "save_ok",
      success: true,
      playerId,
      serverAuthoritative: true,
      clientStateIgnored: true,
      message: "Client state qəbul edilmədi; server state əsas həqiqət mənbəyidir.",
      serverTimeUnixMs: kontekst.nowMs()
    });

    oyunStateGonder(kontekst, playerId, state);
    return true;
  }

  try {
    await daimiMissiyaStateYukle(playerId, state);
    bazaGirisiKecidiniTeminEt(state);
  }
  catch (xeta) {
    console.error("[MISSIYA_DB] Daimi state oxuna bilmədi:", {
      playerId,
      message: xeta && xeta.message ? xeta.message : String(xeta)
    });

    ugursuzCavab(
      kontekst,
      neticeTipiniAl(type),
      "Missiya məlumatı hazırda daimi yaddaşdan oxuna bilmir. Bir az sonra yenidən yoxlayın.",
      { playerId }
    );
    return true;
  }

  if (type === "mission_list_request") {
    const missiyalar = butunMissiyalariAl()
      .map(missiya => missiyaGorunusunuHazirla(state, missiya));

    const aktivMissiya = aktivMissiyaniTap(state);

    const payload = {
      missions: missiyalar,
      activeMissionId: aktivMissiya ? aktivMissiya.missionId : ""
    };

    kontekst.send(kontekst.ws, {
      type: "mission_list_result",
      success: true,
      playerId,
      ...payload,
      payloadJson: JSON.stringify(payload),
      serverTimeUnixMs: kontekst.nowMs()
    });

    return true;
  }

  if (type === "mission_info_request") {
    const missionId = metnAl(kontekst.msg && kontekst.msg.missionId, 64);
    const missiya = missiyaniTap(missionId);

    if (!missiya) {
      ugursuzCavab(
        kontekst,
        "mission_info_result",
        "Missiya tapılmadı.",
        { playerId, missionId }
      );
      return true;
    }

    const gorunus = missiyaGorunusunuHazirla(state, missiya);

    kontekst.send(kontekst.ws, {
      type: "mission_info_result",
      success: true,
      playerId,
      missionId: missiya.missionId,
      mission: gorunus,
      payloadJson: JSON.stringify(gorunus),
      serverTimeUnixMs: kontekst.nowMs()
    });

    return true;
  }

  const missionId = metnAl(kontekst.msg && kontekst.msg.missionId, 64);

  let netice;

  try {
    netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async (kilidliState, { client }) => {
        const mutasiyaNeticesi =
          await missiyaMukafatMutasiyasiniTetbiqEt(
            kilidliState,
            playerId,
            missionId,
            client
          );

        if (
          mutasiyaNeticesi.deyisdi === true &&
          typeof kontekst.updateServerTime === "function"
        ) {
          kontekst.updateServerTime(kilidliState);
        }

        return mutasiyaNeticesi;
      }
    );
  }
  catch (xeta) {
    console.error("[MISSIYA_DB] Reward transaction yazıla bilmədi:", {
      playerId,
      missionId,
      message: xeta && xeta.message ? xeta.message : String(xeta)
    });

    netice = {
      success: false,
      alreadyClaimed: false,
      locked: false,
      missionId,
      message: "Missiya mükafatı daimi yaddaşa atomik yazıla bilmədi. Mükafat verilmədi.",
      rewards: []
    };
  }

  kontekst.send(kontekst.ws, {
    type: "mission_reward_claim_result",
    playerId,
    ...netice,
    serverTimeUnixMs: kontekst.nowMs()
  });

  if (netice.success) {
    oyunStateGonder(kontekst, playerId, state);
  }

  return true;
}

module.exports = {
  gameplaySnapshotiTelebOlunur,
  missiyaMukafatMutasiyasiniTetbiqEt,
  missiyaMesajiniEmalEt
};
