"use strict";

const {
  TUTORIAL_HEDEF_ID
} = require("./kesfiyyat_sistemi");

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function dusmenMovqeyiStateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Düşmən mövqeyi üçün oyunçu state-i yoxdur.");
  }

  if (
    !state.dusmenMovqeleri ||
    typeof state.dusmenMovqeleri !== "object" ||
    Array.isArray(state.dusmenMovqeleri)
  ) {
    state.dusmenMovqeleri = {};
  }

  state.dusmenMovqeleri.version = 1;

  if (
    !state.dusmenMovqeleri.tutorial ||
    typeof state.dusmenMovqeleri.tutorial !== "object" ||
    Array.isArray(state.dusmenMovqeleri.tutorial)
  ) {
    state.dusmenMovqeleri.tutorial = {};
  }

  const tutorial = state.dusmenMovqeleri.tutorial;

  tutorial.targetId =
    typeof tutorial.targetId === "string"
      ? tutorial.targetId.trim()
      : "";

  tutorial.status =
    tutorial.status === "askarlandi"
      ? "askarlandi"
      : "gizli";

  tutorial.discoveredAtMs =
    musbetTamEded(tutorial.discoveredAtMs);

  tutorial.threatLevel =
    tutorial.status === "askarlandi"
      ? Math.max(1, musbetTamEded(tutorial.threatLevel) || 1)
      : 0;

  return state.dusmenMovqeleri;
}

function kesfiyyatHedefiniAl(state) {
  const tutorial =
    state &&
    state.kesfiyyat &&
    state.kesfiyyat.tutorial;

  if (!tutorial || typeof tutorial !== "object") {
    return "";
  }

  if (tutorial.status !== "tamamlandi") {
    return "";
  }

  return typeof tutorial.revealedTargetId === "string"
    ? tutorial.revealedTargetId.trim()
    : "";
}

function dusmenMovqeyiMelumatiniHazirla(state) {
  const dusmenMovqeleri = dusmenMovqeyiStateTeminEt(state);
  const tutorial = dusmenMovqeleri.tutorial;
  const kesfiyyatHedefi = kesfiyyatHedefiniAl(state);

  const kesfiyyatlaAcildi =
    kesfiyyatHedefi === TUTORIAL_HEDEF_ID;

  return {
    targetAvailable: kesfiyyatlaAcildi,
    targetId: kesfiyyatlaAcildi
      ? TUTORIAL_HEDEF_ID
      : "",
    status: tutorial.status,
    discovered: tutorial.status === "askarlandi",
    discoveredAtMs: tutorial.discoveredAtMs,
    threatLevel: tutorial.threatLevel,
    canStartBattle:
      tutorial.status === "askarlandi"
  };
}

function tutorialDusmenMovqeyiniAskarla(
  state,
  nowMs = Date.now()
) {
  const dusmenMovqeleri = dusmenMovqeyiStateTeminEt(state);
  const tutorial = dusmenMovqeleri.tutorial;
  const kesfiyyatHedefi = kesfiyyatHedefiniAl(state);

  if (kesfiyyatHedefi !== TUTORIAL_HEDEF_ID) {
    return {
      success: false,
      message: "Əvvəlcə kəşfiyyat hədəfi açılmalıdır.",
      info: dusmenMovqeyiMelumatiniHazirla(state)
    };
  }

  if (tutorial.status === "askarlandi") {
    return {
      success: true,
      alreadyDiscovered: true,
      message: "Düşmən mövqeyi artıq aşkar edilib.",
      info: dusmenMovqeyiMelumatiniHazirla(state)
    };
  }

  tutorial.targetId = TUTORIAL_HEDEF_ID;
  tutorial.status = "askarlandi";
  tutorial.discoveredAtMs =
    musbetTamEded(nowMs) || Date.now();
  tutorial.threatLevel = 1;

  return {
    success: true,
    alreadyDiscovered: false,
    message: "İlk düşmən mövqeyi aşkar edildi.",
    info: dusmenMovqeyiMelumatiniHazirla(state)
  };
}

module.exports = {
  dusmenMovqeyiStateTeminEt,
  dusmenMovqeyiMelumatiniHazirla,
  tutorialDusmenMovqeyiniAskarla
};
