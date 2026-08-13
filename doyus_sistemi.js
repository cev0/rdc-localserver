"use strict";

const {
  TUTORIAL_HEDEF_ID
} = require("./kesfiyyat_sistemi");

const TUTORIAL_DOYUS_ID = "tutorial_doyus_001";

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function doyusStateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Döyüş üçün oyunçu state-i yoxdur.");
  }

  if (
    !state.doyus ||
    typeof state.doyus !== "object" ||
    Array.isArray(state.doyus)
  ) {
    state.doyus = {};
  }

  state.doyus.version = 1;

  if (
    !state.doyus.tutorial ||
    typeof state.doyus.tutorial !== "object" ||
    Array.isArray(state.doyus.tutorial)
  ) {
    state.doyus.tutorial = {};
  }

  const tutorial = state.doyus.tutorial;

  tutorial.battleId = metnAl(
    tutorial.battleId,
    128
  );

  tutorial.targetId = metnAl(
    tutorial.targetId,
    128
  );

  tutorial.status = [
    "hazir",
    "davam_edir",
    "qelebe",
    "meglub"
  ].includes(tutorial.status)
    ? tutorial.status
    : "hazir";

  tutorial.startedAtMs =
    musbetTamEded(tutorial.startedAtMs);

  tutorial.completedAtMs =
    musbetTamEded(tutorial.completedAtMs);

  tutorial.heroId = metnAl(
    tutorial.heroId,
    128
  ).toLowerCase();

  if (
    !tutorial.troopSnapshot ||
    typeof tutorial.troopSnapshot !== "object" ||
    Array.isArray(tutorial.troopSnapshot)
  ) {
    tutorial.troopSnapshot = {};
  }

  const temizQosunlar = {};

  for (const [unitId, rawCount] of Object.entries(tutorial.troopSnapshot)) {
    const id = metnAl(unitId, 128).toLowerCase();
    const say = musbetTamEded(rawCount);

    if (id && say > 0) {
      temizQosunlar[id] = say;
    }
  }

  tutorial.troopSnapshot = temizQosunlar;

  return state.doyus;
}

function cariQosunSnapshotiniHazirla(state) {
  const troops =
    state &&
    state.army &&
    state.army.troops &&
    typeof state.army.troops === "object"
      ? state.army.troops
      : {};

  const snapshot = {};
  let umumiSay = 0;

  for (const [unitId, rawCount] of Object.entries(troops)) {
    const id = metnAl(unitId, 128).toLowerCase();
    const say = musbetTamEded(rawCount);

    if (!id || say <= 0) {
      continue;
    }

    snapshot[id] = say;
    umumiSay += say;
  }

  return {
    troops: snapshot,
    totalTroops: umumiSay
  };
}

function ilkOwnedQehremanIdAl(state) {
  if (!state || !Array.isArray(state.heroes)) {
    return "";
  }

  for (const qehreman of state.heroes) {
    if (!qehreman || typeof qehreman !== "object") {
      continue;
    }

    const heroId = metnAl(
      qehreman.heroId,
      128
    ).toLowerCase();

    if (heroId) {
      return heroId;
    }
  }

  return "";
}

function tutorialHedefiAskarlandi(state) {
  const tutorial =
    state &&
    state.dusmenMovqeleri &&
    state.dusmenMovqeleri.tutorial;

  if (!tutorial || typeof tutorial !== "object") {
    return false;
  }

  return (
    tutorial.status === "askarlandi" &&
    metnAl(tutorial.targetId, 128) === TUTORIAL_HEDEF_ID
  );
}

function doyusMelumatiniHazirla(state) {
  const doyus = doyusStateTeminEt(state);
  const tutorial = doyus.tutorial;

  const cariQosun =
    cariQosunSnapshotiniHazirla(state);

  const snapshotSay = Object.values(
    tutorial.troopSnapshot
  ).reduce(
    (cem, deyer) => cem + musbetTamEded(deyer),
    0
  );

  return {
    battleId: tutorial.battleId,
    targetId: tutorial.targetId,
    status: tutorial.status,
    startedAtMs: tutorial.startedAtMs,
    completedAtMs: tutorial.completedAtMs,
    heroId: tutorial.heroId,
    troopSnapshot: {
      ...tutorial.troopSnapshot
    },
    usedTroopCount: snapshotSay,
    availableTroopCount: cariQosun.totalTroops,
    targetDiscovered: tutorialHedefiAskarlandi(state),
    canStart:
      tutorial.status === "hazir" &&
      tutorialHedefiAskarlandi(state) &&
      cariQosun.totalTroops > 0 &&
      !!ilkOwnedQehremanIdAl(state)
  };
}

function tutorialDoyusunaBasla(
  state,
  nowMs = Date.now()
) {
  const doyus = doyusStateTeminEt(state);
  const tutorial = doyus.tutorial;

  if (!tutorialHedefiAskarlandi(state)) {
    return {
      success: false,
      message: "Döyüş üçün düşmən mövqeyi əvvəlcə aşkar edilməlidir.",
      info: doyusMelumatiniHazirla(state)
    };
  }

  if (tutorial.status !== "hazir") {
    return {
      success: true,
      alreadyStarted: true,
      message: "Tutorial döyüş artıq başladılıb.",
      info: doyusMelumatiniHazirla(state)
    };
  }

  const qosun = cariQosunSnapshotiniHazirla(state);

  if (qosun.totalTroops <= 0) {
    return {
      success: false,
      message: "Döyüşə göndərmək üçün hərbi vahid yoxdur.",
      info: doyusMelumatiniHazirla(state)
    };
  }

  const heroId = ilkOwnedQehremanIdAl(state);

  if (!heroId) {
    return {
      success: false,
      message: "Döyüş üçün komandir qəhrəman tələb olunur.",
      info: doyusMelumatiniHazirla(state)
    };
  }

  tutorial.battleId = TUTORIAL_DOYUS_ID;
  tutorial.targetId = TUTORIAL_HEDEF_ID;
  tutorial.status = "davam_edir";
  tutorial.startedAtMs =
    musbetTamEded(nowMs) || Date.now();
  tutorial.completedAtMs = 0;
  tutorial.heroId = heroId;
  tutorial.troopSnapshot = {
    ...qosun.troops
  };

  return {
    success: true,
    alreadyStarted: false,
    message: "İlk tutorial döyüş əməliyyatı başladı.",
    info: doyusMelumatiniHazirla(state)
  };
}

module.exports = {
  TUTORIAL_DOYUS_ID,
  doyusStateTeminEt,
  doyusMelumatiniHazirla,
  tutorialDoyusunaBasla
};
