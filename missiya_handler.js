"use strict";

const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MISSIYA_MESAJLARI = new Set([
  // Köhnə client compatibility mesajı.
  // Client state-i server state-inin üzərinə yaza bilməz.
  "save_state"
]);

const LEGACY_MISSIYA_MESAJLARI = new Set([
  "mission_list_request",
  "mission_info_request",
  "mission_reward_claim_request"
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
  /*
   * Bu gameplay mutation-larının hamısı artıq PostgreSQL-authoritative
   * transaction və advisory lock altında işləyir. Legacy setImmediate
   * snapshot writer-i həmin COMMIT-dən sonra köhnə RAM state-i yenidən
   * audit snapshot-a yaza bilərdi. Ona görə bu mesajlar üçün ikinci
   * snapshot writer tam söndürülür.
   */
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

  if (LEGACY_MISSIYA_MESAJLARI.has(type)) {
    const playerId = autentifikasiyaOlunmusPlayerIdAl(
      kontekst && kontekst.ws
    );

    ugursuzCavab(
      kontekst,
      neticeTipiniAl(type),
      "Legacy RDC missiya axını söndürülüb; Last Shelter mission runtime istifadə olunmalıdır.",
      {
        playerId,
        code: "LAST_SHELTER_MISSION_ROUTE_REQUIRED"
      }
    );
    return true;
  }

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

  return false;
}

module.exports = {
  gameplaySnapshotiTelebOlunur,
  missiyaMesajiniEmalEt
};
