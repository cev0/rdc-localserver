"use strict";

const {
  dusmenMovqeyiMelumatiniHazirla,
  tutorialDusmenMovqeyiniAskarla
} = require("./dusmen_movqeyi_sistemi");

const {
  missiyaniTap
} = require("./missiya_kataloqu");

const {
  missiyaStatusunuAl
} = require("./missiya_proqres");

const {
  missiyaServerHadisesiniQeydEt
} = require("./missiya_hadise_korpu");

const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const DUSMEN_MOVQEYI_MESAJLARI = new Set([
  "enemy_position_info_request",
  "enemy_position_inspect_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function kopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

function neticeTipiniAl(type) {
  return type === "enemy_position_inspect_request"
    ? "enemy_position_inspect_result"
    : "enemy_position_info_result";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function dusmenMovqeyiHadisesiVar(state) {
  const say =
    state &&
    state.missions &&
    state.missions.eventCounters
      ? Number(
          state.missions.eventCounters
            .dusmen_movqeyi_askarlandi
        )
      : 0;

  return Number.isFinite(say) && say > 0;
}

async function dusmenMovqeyiMesajiniEmalEt(kontekst) {
  const type = metnAl(
    kontekst && kontekst.type,
    128
  );

  if (!DUSMEN_MOVQEYI_MESAJLARI.has(type)) {
    return false;
  }

  const resultType = neticeTipiniAl(type);
  const playerId = metnAl(
    kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Düşmən mövqeyi üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(
        kontekst,
        playerId
      );
    }

    const state =
      kontekst.getOrCreatePlayerState(playerId);

    const m016 = missiyaniTap("M016");
    const missionStatus = m016
      ? missiyaStatusunuAl(state, m016)
      : "kilidli";

    if (type === "enemy_position_info_request") {
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        missionId: "M016",
        missionStatus,
        info: dusmenMovqeyiMelumatiniHazirla(state)
      });
      return true;
    }

    if (missionStatus === "kilidli") {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M016",
        missionStatus,
        message: "Düşmən mövqeyi missiyası hələ aktiv deyil."
      });
      return true;
    }

    const evvelkiDusmenMovqeleri =
      kopyala(state.dusmenMovqeleri || {});

    const netice =
      tutorialDusmenMovqeyiniAskarla(
        state,
        kontekst.nowMs()
      );

    if (!netice.success) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M016",
        missionStatus,
        ...netice
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(
        playerId,
        state
      );
    }
    catch (xeta) {
      state.dusmenMovqeleri =
        evvelkiDusmenMovqeleri;
      throw xeta;
    }

    if (!dusmenMovqeyiHadisesiVar(state)) {
      await missiyaServerHadisesiniQeydEt(
        playerId,
        state,
        "dusmen_movqeyi_askarlandi",
        1
      );
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      missionId: "M016",
      ...netice
    });
  }
  catch (xeta) {
    console.error("[DUSMEN_MOVQEYI]", xeta);

    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Düşmən mövqeyi əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  DUSMEN_MOVQEYI_MESAJLARI,
  dusmenMovqeyiMesajiniEmalEt
};
