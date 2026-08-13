"use strict";

const {
  doyusMelumatiniHazirla,
  tutorialDoyusunaBasla,
  tutorialDoyusunuNeticelendir
} = require("./doyus_sistemi");

const {
  tutorialDoyusMukafatiniAl
} = require("./doyus_mukafat_sistemi");

const { missiyaniTap } = require("./missiya_kataloqu");
const { missiyaStatusunuAl } = require("./missiya_proqres");
const { missiyaServerHadisesiniQeydEt } = require("./missiya_hadise_korpu");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const DOYUS_MESAJLARI = new Set([
  "battle_info_request",
  "battle_start_request",
  "battle_resolve_request",
  "battle_reward_claim_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function kopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

function neticeTipiniAl(type) {
  if (type === "battle_start_request") return "battle_start_result";
  if (type === "battle_resolve_request") return "battle_resolve_result";
  if (type === "battle_reward_claim_request") return "battle_reward_claim_result";
  return "battle_info_result";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function missiyaHadisesiVar(state, hadiseId) {
  const counters = state && state.missions && state.missions.eventCounters;
  const say = counters ? Number(counters[hadiseId]) : 0;
  return Number.isFinite(say) && say > 0;
}

async function doyusMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!DOYUS_MESAJLARI.has(type)) return false;

  const resultType = neticeTipiniAl(type);
  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId, 128);

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Döyüş üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const m017 = missiyaniTap("M017");
    const m018 = missiyaniTap("M018");
    const m019 = missiyaniTap("M019");

    const startMissionStatus = m017 ? missiyaStatusunuAl(state, m017) : "kilidli";
    const resolveMissionStatus = m018 ? missiyaStatusunuAl(state, m018) : "kilidli";
    const rewardMissionStatus = m019 ? missiyaStatusunuAl(state, m019) : "kilidli";

    if (type === "battle_info_request") {
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        startMissionId: "M017",
        startMissionStatus,
        resolveMissionId: "M018",
        resolveMissionStatus,
        rewardMissionId: "M019",
        rewardMissionStatus,
        info: doyusMelumatiniHazirla(state, kontekst.nowMs())
      });
      return true;
    }

    if (type === "battle_start_request" && startMissionStatus === "kilidli") {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M017",
        missionStatus: startMissionStatus,
        message: "İlk döyüş missiyası hələ aktiv deyil."
      });
      return true;
    }

    if (type === "battle_resolve_request" && resolveMissionStatus === "kilidli") {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M018",
        missionStatus: resolveMissionStatus,
        message: "Döyüş nəticəsi missiyası hələ aktiv deyil."
      });
      return true;
    }

    if (type === "battle_reward_claim_request" && rewardMissionStatus === "kilidli") {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId: "M019",
        missionStatus: rewardMissionStatus,
        message: "Döyüş təchizatı missiyası hələ aktiv deyil."
      });
      return true;
    }

    const evvelkiDoyus = kopyala(state.doyus || {});
    const evvelkiResurslar = kopyala(state.resources || {});

    let netice;
    let missionId;
    let missionStatus;

    if (type === "battle_start_request") {
      netice = tutorialDoyusunaBasla(state, kontekst.nowMs());
      missionId = "M017";
      missionStatus = startMissionStatus;
    }
    else if (type === "battle_resolve_request") {
      netice = tutorialDoyusunuNeticelendir(state, kontekst.nowMs());
      missionId = "M018";
      missionStatus = resolveMissionStatus;
    }
    else {
      netice = tutorialDoyusMukafatiniAl(state);
      missionId = "M019";
      missionStatus = rewardMissionStatus;
    }

    if (!netice.success) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        missionId,
        missionStatus,
        ...netice,
        info: doyusMelumatiniHazirla(state, kontekst.nowMs())
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.doyus = evvelkiDoyus;
      state.resources = evvelkiResurslar;
      throw xeta;
    }

    if (type === "battle_start_request" && !missiyaHadisesiVar(state, "doyus_basladildi")) {
      await missiyaServerHadisesiniQeydEt(playerId, state, "doyus_basladildi", 1);
    }

    if (type === "battle_resolve_request" && netice.victory === true && !missiyaHadisesiVar(state, "doyus_qazanildi")) {
      await missiyaServerHadisesiniQeydEt(playerId, state, "doyus_qazanildi", 1);
    }

    if (type === "battle_reward_claim_request" && !missiyaHadisesiVar(state, "doyus_mukafati_verildi")) {
      await missiyaServerHadisesiniQeydEt(playerId, state, "doyus_mukafati_verildi", 1);
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      missionId,
      ...netice,
      info: doyusMelumatiniHazirla(state, kontekst.nowMs())
    });
  }
  catch (xeta) {
    console.error("[DOYUS]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Döyüş əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  DOYUS_MESAJLARI,
  doyusMesajiniEmalEt
};
