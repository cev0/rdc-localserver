"use strict";

const {
  xeriteZonaMelumatiniHazirla,
  ilkXeriteZonasiniAc
} = require("./xerite_zona_sistemi");

const { missiyaniTap } = require("./missiya_kataloqu");
const { missiyaStatusunuAl } = require("./missiya_proqres");
const { missiyaServerHadisesiniQeydEt } = require("./missiya_hadise_korpu");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const XERITE_ZONA_MESAJLARI = new Set([
  "world_zone_info_request",
  "world_zone_unlock_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function kopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function zonaHadisesiVar(state) {
  const counters = state && state.missions && state.missions.eventCounters;
  const say = counters ? Number(counters.xerite_zonasi_acildi) : 0;
  return Number.isFinite(say) && say > 0;
}

async function xeriteZonaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!XERITE_ZONA_MESAJLARI.has(type)) return false;

  const resultType = type === "world_zone_unlock_request"
    ? "world_zone_unlock_result"
    : "world_zone_info_result";

  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId, 128);

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Xəritə zonası üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const m020 = missiyaniTap("M020");
    const missionStatus = m020 ? missiyaStatusunuAl(state, m020) : "kilidli";

    if (type === "world_zone_info_request") {
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        missionId: "M020",
        missionStatus,
        info: xeriteZonaMelumatiniHazirla(state)
      });
      return true;
    }

    if (missionStatus === "kilidli") {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M020",
        missionStatus,
        message: "Xəritə zona missiyası hələ aktiv deyil."
      });
      return true;
    }

    const evvelkiProgress = kopyala(state.worldZoneProgress || {});
    const netice = ilkXeriteZonasiniAc(state, kontekst.nowMs());

    if (!netice.success) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M020",
        missionStatus,
        ...netice
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.worldZoneProgress = evvelkiProgress;
      throw xeta;
    }

    if (!zonaHadisesiVar(state)) {
      await missiyaServerHadisesiniQeydEt(
        playerId,
        state,
        "xerite_zonasi_acildi",
        1
      );
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      missionId: "M020",
      ...netice
    });
  }
  catch (xeta) {
    console.error("[XERITE_ZONA]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Xəritə zona əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  XERITE_ZONA_MESAJLARI,
  xeriteZonaMesajiniEmalEt
};
