"use strict";

const TUTORIAL_KESFIYYAT_ID = "tutorial_kesfiyyat_001";
const TUTORIAL_HEDEF_ID = "tutorial_enemy_outpost_001";
const TUTORIAL_MUDDET_MS = 10 * 1000;

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function kesfiyyatStateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Kəşfiyyat üçün oyunçu state-i yoxdur.");
  }

  if (!state.kesfiyyat || typeof state.kesfiyyat !== "object" || Array.isArray(state.kesfiyyat)) {
    state.kesfiyyat = {};
  }

  state.kesfiyyat.version = 1;

  if (!state.kesfiyyat.tutorial || typeof state.kesfiyyat.tutorial !== "object") {
    state.kesfiyyat.tutorial = {};
  }

  const tutorial = state.kesfiyyat.tutorial;
  tutorial.operationId = TUTORIAL_KESFIYYAT_ID;
  tutorial.status = typeof tutorial.status === "string" ? tutorial.status : "hazir";
  tutorial.startedAtMs = musbetTamEded(tutorial.startedAtMs);
  tutorial.completesAtMs = musbetTamEded(tutorial.completesAtMs);
  tutorial.completedAtMs = musbetTamEded(tutorial.completedAtMs);
  tutorial.revealedTargetId = typeof tutorial.revealedTargetId === "string"
    ? tutorial.revealedTargetId.trim()
    : "";

  if (!new Set(["hazir", "davam_edir", "tamamlandi"]).has(tutorial.status)) {
    tutorial.status = tutorial.completedAtMs > 0 ? "tamamlandi" : "hazir";
  }

  return state.kesfiyyat;
}

function kesfiyyatMelumatiniHazirla(state, nowMs = Date.now()) {
  const kesfiyyat = kesfiyyatStateTeminEt(state);
  const tutorial = kesfiyyat.tutorial;
  const indi = musbetTamEded(nowMs) || Date.now();
  const qalanMs = tutorial.status === "davam_edir"
    ? Math.max(0, tutorial.completesAtMs - indi)
    : 0;

  return {
    operationId: tutorial.operationId,
    status: tutorial.status,
    startedAtMs: tutorial.startedAtMs,
    completesAtMs: tutorial.completesAtMs,
    completedAtMs: tutorial.completedAtMs,
    remainingMs: qalanMs,
    readyToComplete: tutorial.status === "davam_edir" && qalanMs <= 0,
    revealedTargetId: tutorial.revealedTargetId,
    durationMs: TUTORIAL_MUDDET_MS
  };
}

function tutorialKesfiyyataBasla(state, nowMs = Date.now()) {
  const kesfiyyat = kesfiyyatStateTeminEt(state);
  const tutorial = kesfiyyat.tutorial;
  const indi = musbetTamEded(nowMs) || Date.now();

  if (tutorial.status === "tamamlandi") {
    return {
      success: true,
      alreadyCompleted: true,
      alreadyStarted: true,
      message: "Tutorial kəşfiyyat artıq tamamlanıb.",
      info: kesfiyyatMelumatiniHazirla(state, indi)
    };
  }

  if (tutorial.status === "davam_edir") {
    return {
      success: true,
      alreadyCompleted: false,
      alreadyStarted: true,
      message: "Tutorial kəşfiyyat artıq davam edir.",
      info: kesfiyyatMelumatiniHazirla(state, indi)
    };
  }

  tutorial.status = "davam_edir";
  tutorial.startedAtMs = indi;
  tutorial.completesAtMs = indi + TUTORIAL_MUDDET_MS;
  tutorial.completedAtMs = 0;
  tutorial.revealedTargetId = "";

  return {
    success: true,
    alreadyCompleted: false,
    alreadyStarted: false,
    message: "Tutorial kəşfiyyat başladı.",
    info: kesfiyyatMelumatiniHazirla(state, indi)
  };
}

function tutorialKesfiyyatiTamamla(state, nowMs = Date.now()) {
  const kesfiyyat = kesfiyyatStateTeminEt(state);
  const tutorial = kesfiyyat.tutorial;
  const indi = musbetTamEded(nowMs) || Date.now();

  if (tutorial.status === "tamamlandi") {
    return {
      success: true,
      alreadyCompleted: true,
      message: "Tutorial kəşfiyyat artıq tamamlanıb.",
      info: kesfiyyatMelumatiniHazirla(state, indi)
    };
  }

  if (tutorial.status !== "davam_edir") {
    return {
      success: false,
      message: "Əvvəlcə tutorial kəşfiyyatı başlatmaq lazımdır.",
      info: kesfiyyatMelumatiniHazirla(state, indi)
    };
  }

  if (indi < tutorial.completesAtMs) {
    return {
      success: false,
      message: "Kəşfiyyat hələ tamamlanmayıb.",
      info: kesfiyyatMelumatiniHazirla(state, indi)
    };
  }

  tutorial.status = "tamamlandi";
  tutorial.completedAtMs = indi;
  tutorial.revealedTargetId = TUTORIAL_HEDEF_ID;

  return {
    success: true,
    alreadyCompleted: false,
    message: "Tutorial kəşfiyyat tamamlandı.",
    info: kesfiyyatMelumatiniHazirla(state, indi)
  };
}

module.exports = {
  TUTORIAL_KESFIYYAT_ID,
  TUTORIAL_HEDEF_ID,
  TUTORIAL_MUDDET_MS,
  kesfiyyatStateTeminEt,
  kesfiyyatMelumatiniHazirla,
  tutorialKesfiyyataBasla,
  tutorialKesfiyyatiTamamla
};
