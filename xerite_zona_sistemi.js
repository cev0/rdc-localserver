"use strict";

const ZONA_XARICI = "outer";
const ZONA_ORTA = "middle";
const ZONA_DAXILI = "inner_green";

function tamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function cariStateIdAl(state) {
  const say = Number(state && state.worldPlacement && state.worldPlacement.stateId);
  return Number.isInteger(say) && say > 0 ? say : 0;
}

function xeriteZonaStateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Xəritə zona state-i yoxdur.");
  }

  const stateId = cariStateIdAl(state);

  if (!state.worldZoneProgress || typeof state.worldZoneProgress !== "object" || Array.isArray(state.worldZoneProgress)) {
    state.worldZoneProgress = {};
  }

  if (tamEded(state.worldZoneProgress.stateId) > 0 && stateId > 0 && tamEded(state.worldZoneProgress.stateId) !== stateId) {
    state.worldZoneProgress = {};
  }

  const progress = state.worldZoneProgress;
  progress.version = 1;
  progress.stateId = stateId;

  if (!Array.isArray(progress.unlockedZones)) progress.unlockedZones = [];

  const icazeli = new Set([ZONA_XARICI, ZONA_ORTA, ZONA_DAXILI]);
  progress.unlockedZones = Array.from(new Set(
    progress.unlockedZones
      .map(x => String(x || "").trim().toLowerCase())
      .filter(x => icazeli.has(x))
  ));

  if (!progress.unlockedZones.includes(ZONA_XARICI)) {
    progress.unlockedZones.unshift(ZONA_XARICI);
  }

  progress.middleUnlockedAtMs = tamEded(progress.middleUnlockedAtMs);
  progress.innerUnlockedAtMs = tamEded(progress.innerUnlockedAtMs);
  return progress;
}

function xeriteZonaMelumatiniHazirla(state) {
  const progress = xeriteZonaStateTeminEt(state);
  const ortaAcigdir = progress.unlockedZones.includes(ZONA_ORTA);
  const daxiliAcigdir = progress.unlockedZones.includes(ZONA_DAXILI);

  return {
    stateId: progress.stateId,
    unlockedZones: [...progress.unlockedZones],
    middleUnlockedAtMs: progress.middleUnlockedAtMs,
    innerUnlockedAtMs: progress.innerUnlockedAtMs,
    middleUnlocked: ortaAcigdir,
    innerUnlocked: daxiliAcigdir,
    nextUnlockZoneId: ortaAcigdir ? (daxiliAcigdir ? "" : ZONA_DAXILI) : ZONA_ORTA
  };
}

function ilkXeriteZonasiniAc(state, nowMs = Date.now()) {
  const progress = xeriteZonaStateTeminEt(state);

  if (progress.stateId <= 0) {
    return { success: false, message: "State xəritə yerləşimi hazır deyil.", info: xeriteZonaMelumatiniHazirla(state) };
  }

  if (progress.unlockedZones.includes(ZONA_ORTA)) {
    return { success: true, alreadyUnlocked: true, unlockedZoneId: ZONA_ORTA, info: xeriteZonaMelumatiniHazirla(state) };
  }

  progress.unlockedZones.push(ZONA_ORTA);
  progress.middleUnlockedAtMs = tamEded(nowMs) || Date.now();

  return {
    success: true,
    alreadyUnlocked: false,
    unlockedZoneId: ZONA_ORTA,
    message: "Orta xəritə zonası açıldı.",
    info: xeriteZonaMelumatiniHazirla(state)
  };
}

module.exports = {
  xeriteZonaStateTeminEt,
  xeriteZonaMelumatiniHazirla,
  ilkXeriteZonasiniAc
};
