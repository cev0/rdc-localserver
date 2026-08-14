"use strict";

const { dusmenDescriptor, dusmeniMeglubEtServer } = require("./xerite_dusmen_sistemi");
const {
  konvoyQosunStateTeminEt,
  qosunSayiniHesabla
} = require("./konvoy_qosun_sistemi");
const { formasiyaStateTeminEt } = require("./konvoy_formasiya_sistemi");

const DOYUS_NETICE_GOZLEME_MS = 5 * 1000;

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function dovletIdAl(state) {
  return Math.max(
    1,
    tamEded(state && state.worldPlacement && state.worldPlacement.stateId) || 1
  );
}

function birQosununGucunuAl(unitId) {
  const id = metnAl(unitId, 128);
  const match = id.match(/^(fighter|shooter|vehicle)_lv(\d+)$/);
  if (!match) return 0;

  const level = Math.max(1, Math.min(10, tamEded(match[2]) || 1));
  const esasGuc = match[1] === "fighter"
    ? 5
    : match[1] === "shooter"
      ? 6
      : 20;

  return esasGuc * level;
}

function qosunGucunuHesabla(snapshot) {
  let guc = 0;
  for (const [unitId, rawSay] of Object.entries(snapshot || {})) {
    const say = tamEded(rawSay);
    if (say <= 0) continue;
    guc += birQosununGucunuAl(unitId) * say;
  }
  return Math.max(0, Math.trunc(guc));
}

function formasiyaSnapshotiniAl(konvoy) {
  if (!konvoy || typeof konvoy !== "object") return [];
  const formasiya = formasiyaStateTeminEt(konvoy);
  return Array.isArray(formasiya && formasiya.siralar)
    ? formasiya.siralar.map(x => ({
        siraId: metnAl(x && x.siraId, 32),
        unitId: metnAl(x && x.unitId, 128),
        count: tamEded(x && x.count)
      }))
    : [];
}

function stateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Düşmən döyüşü üçün oyunçu state-i yoxdur.");
  }

  if (
    !state.worldEnemyBattle ||
    typeof state.worldEnemyBattle !== "object" ||
    Array.isArray(state.worldEnemyBattle)
  ) {
    state.worldEnemyBattle = {
      version: 2,
      activeByConvoy: {},
      lastResults: []
    };
  }

  state.worldEnemyBattle.version = 2;

  if (
    !state.worldEnemyBattle.activeByConvoy ||
    typeof state.worldEnemyBattle.activeByConvoy !== "object" ||
    Array.isArray(state.worldEnemyBattle.activeByConvoy)
  ) {
    state.worldEnemyBattle.activeByConvoy = {};
  }

  if (!Array.isArray(state.worldEnemyBattle.lastResults)) {
    state.worldEnemyBattle.lastResults = [];
  }

  return state.worldEnemyBattle;
}

function konvoyuTap(state, convoyId) {
  const id = metnAl(convoyId, 64);
  const konvoylar = konvoyQosunStateTeminEt(state);
  return konvoylar.items.find(x => x && x.konvoyId === id && x.aciqdir === true) || null;
}

function heroIdleriAl(konvoy) {
  return Array.isArray(konvoy && konvoy.qehremanIdleri)
    ? konvoy.qehremanIdleri.map(x => metnAl(x, 128)).filter(Boolean)
    : [];
}

function aktivDoyusTap(state, convoyId) {
  const battle = stateTeminEt(state);
  return battle.activeByConvoy[metnAl(convoyId, 64)] || null;
}

function doyusuLegvEt(state, convoyId, nowMs = Date.now()) {
  const battle = stateTeminEt(state);
  const id = metnAl(convoyId, 64);
  const mission = battle.activeByConvoy[id];

  if (!mission) {
    return {
      success: true,
      alreadyInactive: true,
      convoyId: id,
      rewardCreated: false,
      casualtyApplied: false
    };
  }

  delete battle.activeByConvoy[id];

  return {
    success: true,
    alreadyInactive: false,
    convoyId: id,
    battleId: metnAl(mission.battleId, 220),
    enemyId: metnAl(mission.enemyId, 128),
    cancelledAtMs: tamEded(nowMs) || Date.now(),
    rewardCreated: false,
    casualtyApplied: false,
    enemyDefeated: false,
    mission: JSON.parse(JSON.stringify(mission))
  };
}

function doyusMelumatiniHazirla(state, nowMs = Date.now()) {
  const battle = stateTeminEt(state);
  const now = tamEded(nowMs) || Date.now();

  return {
    active: Object.values(battle.activeByConvoy).map(x => ({
      ...x,
      readyToResolve: now >= tamEded(x.resolveAtMs),
      remainingMs: Math.max(0, tamEded(x.resolveAtMs) - now)
    })),
    lastResults: battle.lastResults.slice(-10).map(x => ({ ...x }))
  };
}

function doyusaBasla(state, playerId, convoyId, enemyId, nowMs = Date.now()) {
  const battle = stateTeminEt(state);
  const id = metnAl(convoyId, 64);
  const konvoy = konvoyuTap(state, id);

  if (!konvoy) {
    return { success: false, message: "Konvoy açıq deyil." };
  }

  if (battle.activeByConvoy[id]) {
    return { success: false, message: "Bu konvoy artıq düşmən döyüşündədir." };
  }

  const toplama = state && state.xeriteToplama && state.xeriteToplama.activeByConvoy;
  if (toplama && toplama[id]) {
    return { success: false, message: "Konvoy resurs toplama tapşırığındadır." };
  }

  const troopSnapshot = { ...(konvoy.qosunlar || {}) };
  if (qosunSayiniHesabla(troopSnapshot) <= 0) {
    return { success: false, message: "Döyüş üçün konvoyda qoşun olmalıdır." };
  }

  const heroIds = heroIdleriAl(konvoy);
  if (heroIds.length <= 0) {
    return { success: false, message: "Döyüş üçün konvoyda Döyüş qəhrəmanı olmalıdır." };
  }

  const stateId = dovletIdAl(state);
  const eid = metnAl(enemyId, 128);
  const match = eid.match(/^state_(\d+)_enemy_(\d+)$/);
  if (!match || Number(match[1]) !== stateId) {
    return { success: false, message: "Düşmən bu Dövlətə aid deyil." };
  }

  const descriptor = dusmenDescriptor(stateId, Number(match[2]));
  if (!descriptor) {
    return { success: false, message: "Düşmən tapılmadı." };
  }

  const startedAtMs = tamEded(nowMs) || Date.now();
  const formationSnapshot = formasiyaSnapshotiniAl(konvoy);
  const mission = {
    battleId: `${eid}:${startedAtMs}:${metnAl(playerId, 128)}`,
    convoyId: id,
    enemyId: eid,
    stateId,
    enemyType: descriptor.enemyType,
    enemyLevel: descriptor.level,
    enemyPower: descriptor.power,
    troopSnapshot,
    formationSnapshot,
    heroIds,
    playerPower: qosunGucunuHesabla(troopSnapshot),
    startedAtMs,
    resolveAtMs: startedAtMs + DOYUS_NETICE_GOZLEME_MS,
    status: "active"
  };

  battle.activeByConvoy[id] = mission;
  return { success: true, mission: { ...mission } };
}

async function doyusuNeticelendir(state, playerId, convoyId, nowMs = Date.now()) {
  const battle = stateTeminEt(state);
  const id = metnAl(convoyId, 64);
  const mission = battle.activeByConvoy[id];

  if (!mission) {
    return { success: false, message: "Aktiv düşmən döyüşü tapılmadı." };
  }

  const now = tamEded(nowMs) || Date.now();
  if (now < tamEded(mission.resolveAtMs)) {
    return {
      success: false,
      message: "Döyüş nəticəsi hələ hazır deyil.",
      remainingMs: Math.max(0, tamEded(mission.resolveAtMs) - now)
    };
  }

  const victory = tamEded(mission.playerPower) >= tamEded(mission.enemyPower);
  let sharedResult = null;
  let reward = { money: 0, heroExp: 0, deliveryPending: false };

  if (victory) {
    sharedResult = await dusmeniMeglubEtServer(
      mission.stateId,
      mission.enemyId,
      playerId,
      now
    );

    if (!sharedResult || sharedResult.success !== true) {
      delete battle.activeByConvoy[id];
      const result = {
        battleId: mission.battleId,
        convoyId: id,
        enemyId: mission.enemyId,
        formationSnapshot: Array.isArray(mission.formationSnapshot) ? mission.formationSnapshot.map(x => ({ ...x })) : [],
        victory: false,
        invalidated: true,
        message: sharedResult && sharedResult.message
          ? sharedResult.message
          : "Düşmən artıq başqa əməliyyatda məğlub edilib.",
        completedAtMs: now
      };
      battle.lastResults.push(result);
      battle.lastResults = battle.lastResults.slice(-20);
      return { success: true, ...result };
    }

    const money = tamEded(sharedResult.reward && sharedResult.reward.money);
    const heroExp = tamEded(sharedResult.reward && sharedResult.reward.heroExp);
    reward = {
      money,
      heroExp,
      deliveryPending: money > 0,
      heroExpDistributionPending: heroExp > 0
    };
  }

  delete battle.activeByConvoy[id];

  const result = {
    battleId: mission.battleId,
    convoyId: id,
    enemyId: mission.enemyId,
    enemyType: mission.enemyType,
    enemyLevel: mission.enemyLevel,
    playerPower: mission.playerPower,
    enemyPower: mission.enemyPower,
    formationSnapshot: Array.isArray(mission.formationSnapshot) ? mission.formationSnapshot.map(x => ({ ...x })) : [],
    victory,
    invalidated: false,
    reward,
    completedAtMs: now,
    respawnAtMs: sharedResult ? tamEded(sharedResult.respawnAtMs) : 0
  };

  battle.lastResults.push(result);
  battle.lastResults = battle.lastResults.slice(-20);

  return { success: true, ...result };
}

module.exports = {
  DOYUS_NETICE_GOZLEME_MS,
  birQosununGucunuAl,
  qosunGucunuHesabla,
  formasiyaSnapshotiniAl,
  stateTeminEt,
  aktivDoyusTap,
  doyusuLegvEt,
  doyusMelumatiniHazirla,
  doyusaBasla,
  doyusuNeticelendir
};
