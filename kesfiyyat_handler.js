"use strict";

const {
  kesfiyyatMelumatiniHazirla,
  tutorialKesfiyyataBasla,
  tutorialKesfiyyatiTamamla
} = require("./kesfiyyat_sistemi");
const { missiyaniTap } = require("./missiya_kataloqu");
const { missiyaStatusunuAl } = require("./missiya_proqres");
const { missiyaServerHadisesiniQeydEt } = require("./missiya_hadise_korpu");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const KESFIYYAT_MESAJLARI = new Set([
  "scout_info_request",
  "scout_start_request",
  "scout_complete_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function kopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

function resultTipiniAl(type) {
  if (type === "scout_start_request") return "scout_start_result";
  if (type === "scout_complete_request") return "scout_complete_result";
  return "scout_info_result";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function kesfiyyatMissiyaHadisesiVar(state) {
  const say = state && state.missions && state.missions.eventCounters
    ? Number(state.missions.eventCounters.kesfiyyat_tamamlandi)
    : 0;
  return Number.isFinite(say) && say > 0;
}

async function kesfiyyatMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!KESFIYYAT_MESAJLARI.has(type)) return false;

  const resultType = resultTipiniAl(type);
  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId, 128);

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Kəşfiyyat üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const m015 = missiyaniTap("M015");
    const missionStatus = m015 ? missiyaStatusunuAl(state, m015) : "kilidli";

    if (type === "scout_info_request") {
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        missionId: "M015",
        missionStatus,
        info: kesfiyyatMelumatiniHazirla(state, kontekst.nowMs())
      });
      return true;
    }

    if (type === "scout_start_request" && missionStatus === "kilidli") {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M015",
        missionStatus,
        message: "Kəşfiyyat missiyası hələ aktiv deyil."
      });
      return true;
    }

    const evvelkiKesfiyyat = kopyala(state.kesfiyyat || {});
    const netice = type === "scout_start_request"
      ? tutorialKesfiyyataBasla(state, kontekst.nowMs())
      : tutorialKesfiyyatiTamamla(state, kontekst.nowMs());

    if (!netice.success) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M015",
        missionStatus,
        ...netice
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.kesfiyyat = evvelkiKesfiyyat;
      throw xeta;
    }

    if (type === "scout_complete_request" && !kesfiyyatMissiyaHadisesiVar(state)) {
      await missiyaServerHadisesiniQeydEt(
        playerId,
        state,
        "kesfiyyat_tamamlandi",
        1
      );
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      missionId: "M015",
      ...netice
    });
  }
  catch (xeta) {
    console.error("[KESFIYYAT]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Kəşfiyyat əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  KESFIYYAT_MESAJLARI,
  kesfiyyatMesajiniEmalEt
};
