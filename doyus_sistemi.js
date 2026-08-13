"use strict";

const {
  TUTORIAL_HEDEF_ID
} = require("./kesfiyyat_sistemi");

const TUTORIAL_DOYUS_ID = "tutorial_doyus_001";
const TUTORIAL_NETICE_GOZLEME_MS = 5 * 1000;
const TUTORIAL_DUSMEN_GUCU = 5;
const TUTORIAL_DOYUS_MUKAFATLARI = [
  { resourceId: "food", amount: 200 },
  { resourceId: "wood", amount: 200 }
];

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

function mukafatSiyahisiniTemizle(siyahi) {
  if (!Array.isArray(siyahi)) return [];

  return siyahi
    .map(mukafat => ({
      resourceId: metnAl(
        mukafat && mukafat.resourceId,
        64
      ).toLowerCase(),
      amount: musbetTamEded(
        mukafat && mukafat.amount
      )
    }))
    .filter(mukafat =>
      mukafat.resourceId &&
      mukafat.amount > 0
    );
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

  tutorial.playerPower =
    musbetTamEded(tutorial.playerPower);

  tutorial.enemyPower =
    musbetTamEded(tutorial.enemyPower);

  tutorial.rewardClaimed =
    tutorial.rewardClaimed === true;

  tutorial.pendingRewards =
    mukafatSiyahisiniTemizle(
      tutorial.pendingRewards
    );

  if (
    !tutorial.troopSnapshot ||
    typeof tutorial.troopSnapshot !== "object" ||
    Array.isArray(tutorial.troopSnapshot)
  ) {
    tutorial.troopSnapshot = {};
  }

  const temizQosunlar = {};

  for (
    const [unitId, rawCount]
    of Object.entries(tutorial.troopSnapshot)
  ) {
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

function birQosununGucunuAl(unitId) {
  const id = metnAl(
    unitId,
    128
  ).toLowerCase();

  const netice = id.match(
    /^(fighter|shooter|vehicle)_lv(\d+)$/
  );

  if (!netice) {
    return 0;
  }

  const qosunNovu = netice[1];
  const level = Math.max(
    1,
    Math.min(
      10,
      musbetTamEded(netice[2]) || 1
    )
  );

  let esasGuc = 0;

  switch (qosunNovu) {
    case "fighter":
      esasGuc = 5;
      break;

    case "shooter":
      esasGuc = 6;
      break;

    case "vehicle":
      esasGuc = 20;
      break;

    default:
      esasGuc = 0;
      break;
  }

  return esasGuc * level;
}

function qosunSnapshotGucunuHesabla(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return 0;
  }

  let umumiGuc = 0;

  for (const [unitId, rawCount] of Object.entries(snapshot)) {
    const say = musbetTamEded(rawCount);
    if (say <= 0) continue;

    umumiGuc +=
      birQosununGucunuAl(unitId) * say;
  }

  return Math.max(0, Math.trunc(umumiGuc));
}

function doyusMelumatiniHazirla(
  state,
  nowMs = Date.now()
) {
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

  const indi =
    musbetTamEded(nowMs) || Date.now();

  const neticeHazirAtMs =
    tutorial.status === "davam_edir"
      ? tutorial.startedAtMs + TUTORIAL_NETICE_GOZLEME_MS
      : 0;

  const qalanNeticeMs =
    tutorial.status === "davam_edir"
      ? Math.max(0, neticeHazirAtMs - indi)
      : 0;

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
    playerPower: tutorial.playerPower,
    enemyPower: tutorial.enemyPower,
    resultReadyAtMs: neticeHazirAtMs,
    remainingResultMs: qalanNeticeMs,
    readyToResolve:
      tutorial.status === "davam_edir" &&
      qalanNeticeMs <= 0,
    pendingRewards:
      tutorial.pendingRewards.map(x => ({ ...x })),
    rewardClaimed: tutorial.rewardClaimed,
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
      info: doyusMelumatiniHazirla(state, nowMs)
    };
  }

  if (tutorial.status !== "hazir") {
    return {
      success: true,
      alreadyStarted: true,
      message: "Tutorial döyüş artıq başladılıb.",
      info: doyusMelumatiniHazirla(state, nowMs)
    };
  }

  const qosun = cariQosunSnapshotiniHazirla(state);

  if (qosun.totalTroops <= 0) {
    return {
      success: false,
      message: "Döyüşə göndərmək üçün hərbi vahid yoxdur.",
      info: doyusMelumatiniHazirla(state, nowMs)
    };
  }

  const heroId = ilkOwnedQehremanIdAl(state);

  if (!heroId) {
    return {
      success: false,
      message: "Döyüş üçün komandir qəhrəman tələb olunur.",
      info: doyusMelumatiniHazirla(state, nowMs)
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
  tutorial.playerPower = 0;
  tutorial.enemyPower = 0;
  tutorial.pendingRewards = [];
  tutorial.rewardClaimed = false;

  return {
    success: true,
    alreadyStarted: false,
    message: "İlk tutorial döyüş əməliyyatı başladı.",
    info: doyusMelumatiniHazirla(state, nowMs)
  };
}

function tutorialDoyusunuNeticelendir(
  state,
  nowMs = Date.now()
) {
  const doyus = doyusStateTeminEt(state);
  const tutorial = doyus.tutorial;
  const indi =
    musbetTamEded(nowMs) || Date.now();

  if (tutorial.status === "qelebe") {
    return {
      success: true,
      alreadyResolved: true,
      victory: true,
      message: "Tutorial döyüş artıq qələbə ilə tamamlanıb.",
      info: doyusMelumatiniHazirla(state, indi)
    };
  }

  if (tutorial.status === "meglub") {
    return {
      success: true,
      alreadyResolved: true,
      victory: false,
      message: "Tutorial döyüş artıq tamamlanıb.",
      info: doyusMelumatiniHazirla(state, indi)
    };
  }

  if (tutorial.status !== "davam_edir") {
    return {
      success: false,
      message: "Əvvəlcə tutorial döyüşü başlatmaq lazımdır.",
      info: doyusMelumatiniHazirla(state, indi)
    };
  }

  const neticeHazirAtMs =
    tutorial.startedAtMs + TUTORIAL_NETICE_GOZLEME_MS;

  if (indi < neticeHazirAtMs) {
    return {
      success: false,
      message: "Döyüş nəticəsi hələ hazır deyil.",
      info: doyusMelumatiniHazirla(state, indi)
    };
  }

  const oyuncuGucu =
    qosunSnapshotGucunuHesabla(
      tutorial.troopSnapshot
    );

  const dusmenGucu =
    TUTORIAL_DUSMEN_GUCU;

  const qelebe =
    oyuncuGucu >= dusmenGucu;

  tutorial.playerPower = oyuncuGucu;
  tutorial.enemyPower = dusmenGucu;
  tutorial.completedAtMs = indi;
  tutorial.status = qelebe
    ? "qelebe"
    : "meglub";

  tutorial.pendingRewards = qelebe
    ? TUTORIAL_DOYUS_MUKAFATLARI.map(x => ({ ...x }))
    : [];

  tutorial.rewardClaimed = false;

  return {
    success: true,
    alreadyResolved: false,
    victory: qelebe,
    message: qelebe
      ? "İlk PvE döyüşü qələbə ilə tamamlandı."
      : "İlk PvE döyüşündə məğlubiyyət qeydə alındı.",
    info: doyusMelumatiniHazirla(state, indi)
  };
}

module.exports = {
  TUTORIAL_DOYUS_ID,
  TUTORIAL_NETICE_GOZLEME_MS,
  TUTORIAL_DUSMEN_GUCU,
  doyusStateTeminEt,
  doyusMelumatiniHazirla,
  tutorialDoyusunaBasla,
  tutorialDoyusunuNeticelendir
};
