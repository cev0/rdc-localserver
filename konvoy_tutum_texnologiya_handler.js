"use strict";

const {
  KONVOY_TUTUM_TEXNOLOGIYA_ID,
  KONVOY_TUTUM_BALANSI,
  tutumLevelMelumatiniAl
} = require("./konvoy_tutum_qaydalari");

const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
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

function binaLeveliniAl(state, buildingId, yolTelebi = false) {
  let maksimum = 0;

  for (const bina of Array.isArray(state && state.buildings) ? state.buildings : []) {
    if (!bina || bina.isCompleted !== true) continue;
    if (metnAl(bina.buildingId) !== buildingId) continue;
    if (yolTelebi && bina.hasRoadAccess === false) continue;

    maksimum = Math.max(maksimum, Math.max(1, tamEded(bina.level) || 1));
  }

  return maksimum;
}

function stateTeminEt(state) {
  if (!state.resources || typeof state.resources !== "object") state.resources = {};
  for (const id of ["wood", "iron", "fuel", "money"]) {
    if (!Number.isFinite(Number(state.resources[id]))) state.resources[id] = 0;
  }

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
  const current = tutumLevelMelumatiniAl(currentLevel);
  const nextLevel = currentLevel < 4 ? currentLevel + 1 : null;
  const next = nextLevel === null ? null : tutumLevelMelumatiniAl(nextLevel);
  const hqLevel = binaLeveliniAl(state, "hq");
  const instituteLevel = binaLeveliniAl(state, "institute", true);

  let resourcesReady = true;
  if (next) {
    for (const item of next.cost || []) {
      if ((Number(state.resources[item.type]) || 0) < item.amount) {
        resourcesReady = false;
        break;
      }
    }
  }

  return {
    techId: KONVOY_TUTUM_TEXNOLOGIYA_ID,
    displayName: "Konvoy Qoşun Tutumu",
    currentLevel,
    maxLevel: 4,
    currentCapacity: current.capacity,
    nextLevel,
    nextCapacity: next ? next.capacity : current.capacity,
    completed: currentLevel >= 4,
    requiredHqLevel: next ? next.requiredHqLevel : 0,
    currentHqLevel: hqLevel,
    requiredInstituteLevel: next ? next.requiredInstituteLevel : 0,
    currentInstituteLevel: instituteLevel,
    researchTimeSeconds: next ? next.researchTimeSeconds : 0,
    cost: next ? next.cost.map(x => ({ ...x })) : [],
    resourcesReady,
    researchRunning: !!state.technology.currentResearch,
    canResearch:
      !!next &&
      !state.technology.currentResearch &&
      hqLevel >= next.requiredHqLevel &&
      instituteLevel >= next.requiredInstituteLevel &&
      resourcesReady
  };
}

function baslat(state, nowMs) {
  const info = melumatiHazirla(state);

  if (info.completed) {
    return { ok: false, message: "Konvoy qoşun tutumu maksimum səviyyədədir.", info };
  }
  if (state.technology.currentResearch) {
    return { ok: false, message: "Başqa araşdırma artıq davam edir.", info };
  }
  if (info.currentHqLevel < info.requiredHqLevel) {
    return { ok: false, message: `HQ Level ${info.requiredHqLevel} tələb olunur.`, info };
  }
  if (info.currentInstituteLevel < info.requiredInstituteLevel) {
    return { ok: false, message: `Institute Level ${info.requiredInstituteLevel} tələb olunur.`, info };
  }
  if (!info.resourcesReady) {
    return { ok: false, message: "Araşdırma üçün resurslar kifayət etmir.", info };
  }

  const next = KONVOY_TUTUM_BALANSI[info.nextLevel];
  for (const item of next.cost || []) {
    state.resources[item.type] = Math.max(
      0,
      (Number(state.resources[item.type]) || 0) - item.amount
    );
  }

  const startedAtMs = Number(nowMs) || Date.now();
  const durationMs = Math.max(0, tamEded(next.researchTimeSeconds) * 1000);

  state.technology.currentResearch = {
    techId: KONVOY_TUTUM_TEXNOLOGIYA_ID,
    targetLevel: info.nextLevel,
    startedAtMs,
    durationMs,
    endsAtMs: startedAtMs + durationMs,
    instituteInstanceId: null
  };

  return {
    ok: true,
    research: { ...state.technology.currentResearch },
    info: melumatiHazirla(state)
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

    if (infoIsteyi) {
      const info = melumatiHazirla(state);
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

    const evvelkiResources = JSON.parse(JSON.stringify(state.resources || {}));
    const evvelkiTechnology = JSON.parse(JSON.stringify(state.technology || {}));
    const netice = baslat(state, kontekst.nowMs());

    if (!netice.ok) {
      kontekst.send(kontekst.ws, {
        type: resultType,
        success: false,
        playerId,
        techId,
        message: netice.message,
        info: netice.info,
        serverTimeUnixMs: kontekst.nowMs()
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.resources = evvelkiResources;
      state.technology = evvelkiTechnology;
      throw xeta;
    }

    kontekst.send(kontekst.ws, {
      type: "technology_research_started",
      success: true,
      playerId,
      techId,
      research: netice.research,
      payloadJson: JSON.stringify(netice.research),
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
  konvoyTutumTexnologiyaMesajiniEmalEt
};
