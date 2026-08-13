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
  missiyaMukafatiniAuditdeYaddaSaxla,
  daimiVeziyyetiStateIleBirlesdir
} = require("./missiya_postgres");

const MISSIYA_MESAJLARI = new Set([
  "mission_list_request",
  "mission_info_request",
  "mission_reward_claim_request",

  // Köhnə client compatibility mesajı.
  // Client state-i server state-inin üzərinə yaza bilməz.
  "save_state"
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

function oyunStateGonder(kontekst, playerId, state) {
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
}

async function daimiMissiyaStateYukle(playerId, state) {
  const daimiVeziyyet = await missiyaDaimiVeziyyetiniAl(playerId);
  daimiVeziyyetiStateIleBirlesdir(state, daimiVeziyyet);
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

async function missiyaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);

  // Gameplay sorğularının nəticəsini yalnız server state-i dəyişəndən
  // sonra yoxlayan observer. Client missiya progressini birbaşa yaza bilmir.
  gameplayNeticesiniIzlemeyeHazirla(kontekst);

  if (!MISSIYA_MESAJLARI.has(type)) {
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

  const evvelkiResurslar = derinKopyala(state.resources || {});
  const evvelkiMissiyalar = derinKopyala(state.missions || {});

  let netice = missiyaMukafatiniAl(state, missionId);

  if (netice.success) {
    try {
      const auditNeticesi = await missiyaMukafatiniAuditdeYaddaSaxla(
        playerId,
        netice.missionId
      );

      if (auditNeticesi.artiqMovcuddur) {
        state.resources = evvelkiResurslar;
        state.missions = evvelkiMissiyalar;

        await daimiMissiyaStateYukle(playerId, state);
        bazaGirisiKecidiniTeminEt(state);

        netice = {
          success: false,
          alreadyClaimed: true,
          locked: false,
          missionId: netice.missionId,
          message: "Missiya mükafatı artıq alınıb.",
          rewards: []
        };
      }
    }
    catch (xeta) {
      state.resources = evvelkiResurslar;
      state.missions = evvelkiMissiyalar;

      console.error("[MISSIYA_DB] Reward audit yazıla bilmədi:", {
        playerId,
        missionId,
        message: xeta && xeta.message ? xeta.message : String(xeta)
      });

      netice = {
        success: false,
        alreadyClaimed: false,
        locked: false,
        missionId,
        message: "Missiya mükafatı daimi yaddaşa yazıla bilmədi. Mükafat verilmədi.",
        rewards: []
      };
    }
  }

  if (netice.success) {
    bazaGirisiKecidiniTeminEt(state);

    if (typeof kontekst.updateServerTime === "function") {
      kontekst.updateServerTime(state);
    }
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
  missiyaMesajiniEmalEt
};
