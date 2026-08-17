"use strict";

const {
  KONVOY_TUTUM_TEXNOLOGIYA_ID,
  tutumLevelMelumatiniAl
} = require("./konvoy_tutum_qaydalari");

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function tamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function stateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Konvoy tutum texnologiyası üçün oyunçu state-i yoxdur.");
  }

  if (!state.resources || typeof state.resources !== "object") state.resources = {};
  if (!state.technology || typeof state.technology !== "object") state.technology = {};
  if (!state.technology.levels || typeof state.technology.levels !== "object") {
    state.technology.levels = {};
  }
  if (!("currentResearch" in state.technology)) state.technology.currentResearch = null;
}

function cariLeveliAl(state) {
  stateTeminEt(state);
  return Math.min(4, tamEded(state.technology.levels[KONVOY_TUTUM_TEXNOLOGIYA_ID]));
}

function melumatiHazirla(state) {
  stateTeminEt(state);

  const currentLevel = cariLeveliAl(state);
  const legacy = tutumLevelMelumatiniAl(currentLevel);
  const currentResearch = state.technology.currentResearch;
  const legacyResearchRunning = !!(
    currentResearch &&
    metnAl(currentResearch.techId, 128) === KONVOY_TUTUM_TEXNOLOGIYA_ID
  );

  return {
    techId: KONVOY_TUTUM_TEXNOLOGIYA_ID,
    displayName: "Konvoy Qoşun Tutumu",
    legacyDisabled: true,
    gameplaySource: "convoy_building_hero_level_skill1_skill6",
    currentLevel,
    maxLevel: 4,
    currentCapacity: legacy.capacity,
    currentCapacityIsLegacyOnly: true,
    nextLevel: null,
    nextCapacity: legacy.capacity,
    completed: false,
    requiredHqLevel: 0,
    currentHqLevel: 0,
    requiredInstituteLevel: 0,
    currentInstituteLevel: 0,
    researchTimeSeconds: 0,
    cost: [],
    resourcesReady: false,
    researchRunning: legacyResearchRunning,
    canResearch: false,
    message:
      "Köhnə Konvoy tutum texnologiyası deaktivdir. Tutum Konvoy binası, Qəhrəman level-i, Skill 1 və Skill 6 ilə serverdə hesablanır."
  };
}

function baslat(state) {
  const info = melumatiHazirla(state);

  return {
    ok: false,
    legacyDisabled: true,
    message: info.message,
    info
  };
}

async function konvoyTutumTexnologiyaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type);
  const techId = metnAl(kontekst && kontekst.msg && kontekst.msg.techId);

  const infoIsteyi = type === "convoy_capacity_technology_info_request";
  const startIsteyi =
    type === "technology_research_start" &&
    techId === KONVOY_TUTUM_TEXNOLOGIYA_ID;

  if (!infoIsteyi && !startIsteyi) return false;

  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId);
  const resultType = infoIsteyi
    ? "convoy_capacity_technology_info_result"
    : "technology_research_result";

  if (!playerId) {
    kontekst.send(kontekst.ws, {
      type: resultType,
      success: false,
      message: "Autentifikasiya tələb olunur.",
      serverTimeUnixMs: kontekst.nowMs()
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const info = melumatiHazirla(state);

    if (infoIsteyi) {
      kontekst.send(kontekst.ws, {
        type: resultType,
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info),
        serverTimeUnixMs: kontekst.nowMs()
      });
      return true;
    }

    const netice = baslat(state);

    kontekst.send(kontekst.ws, {
      type: resultType,
      success: false,
      playerId,
      techId,
      legacyDisabled: true,
      message: netice.message,
      info: netice.info,
      serverTimeUnixMs: kontekst.nowMs()
    });
  }
  catch (xeta) {
    console.error("[KONVOY_CAPACITY_TECH]", xeta);
    kontekst.send(kontekst.ws, {
      type: resultType,
      success: false,
      playerId,
      message: "Konvoy tutum texnologiyası əməliyyatı tamamlanmadı.",
      serverTimeUnixMs: kontekst.nowMs()
    });
  }

  return true;
}

module.exports = {
  cariLeveliAl,
  melumatiHazirla,
  baslat,
  konvoyTutumTexnologiyaMesajiniEmalEt
};
