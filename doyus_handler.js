"use strict";

const {
  doyusMelumatiniHazirla,
  tutorialDoyusunaBasla
} = require("./doyus_sistemi");

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

const DOYUS_MESAJLARI = new Set([
  "battle_info_request",
  "battle_start_request"
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
  return type === "battle_start_request"
    ? "battle_start_result"
    : "battle_info_result";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function doyusBaslamaHadisesiVar(state) {
  const say =
    state &&
    state.missions &&
    state.missions.eventCounters
      ? Number(
          state.missions.eventCounters
            .doyus_basladildi
        )
      : 0;

  return Number.isFinite(say) && say > 0;
}

async function doyusMesajiniEmalEt(kontekst) {
  const type = metnAl(
    kontekst && kontekst.type,
    128
  );

  if (!DOYUS_MESAJLARI.has(type)) {
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
      message: "Döyüş üçün autentifikasiya tələb olunur."
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

    const m017 = missiyaniTap("M017");
    const missionStatus = m017
      ? missiyaStatusunuAl(state, m017)
      : "kilidli";

    if (type === "battle_info_request") {
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        missionId: "M017",
        missionStatus,
        info: doyusMelumatiniHazirla(state)
      });
      return true;
    }

    if (missionStatus === "kilidli") {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M017",
        missionStatus,
        message: "İlk döyüş missiyası hələ aktiv deyil."
      });
      return true;
    }

    const evvelkiDoyus =
      kopyala(state.doyus || {});

    const netice =
      tutorialDoyusunaBasla(
        state,
        kontekst.nowMs()
      );

    if (!netice.success) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M017",
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
      state.doyus = evvelkiDoyus;
      throw xeta;
    }

    if (!doyusBaslamaHadisesiVar(state)) {
      await missiyaServerHadisesiniQeydEt(
        playerId,
        state,
        "doyus_basladildi",
        1
      );
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      missionId: "M017",
      ...netice
    });
  }
  catch (xeta) {
    console.error("[DOYUS]", xeta);

    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Döyüş başlatma əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  DOYUS_MESAJLARI,
  doyusMesajiniEmalEt
};
