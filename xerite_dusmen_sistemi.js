"use strict";

const { levelMelumatiniAl, zoneLevelAraligi } = require("./xerite_dusmen_qaydalari");
const { runtimeOxu, runtimeEmeliyyati } = require("./xerite_dusmen_runtime_postgres");

const DUSMEN_SAYI = 17;

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function seededRng(seed) {
  let s = (Number(seed) || 1) >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function dusmenDescriptor(stateId, index) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  if (!Number.isInteger(index) || index < 1 || index > DUSMEN_SAYI) return null;

  const zoneId = index <= 10
    ? "outer"
    : index <= 15
      ? "middle"
      : "inner_green";

  const araliq = zoneLevelAraligi(zoneId);
  const rng = seededRng(sid * 104729 + index * 8191);
  const level = araliq.min + Math.floor(rng() * ((araliq.max - araliq.min) + 1));
  const enemyType = index % 3 === 0 ? "small_enemy" : "enemy_scout";
  const balans = levelMelumatiniAl(level, enemyType);

  return {
    enemyId: `state_${sid}_enemy_${index}`,
    stateId: sid,
    index,
    zoneId,
    level,
    enemyType,
    power: balans.power,
    reward: { ...balans.reward },
    respawnSeconds: balans.respawnSeconds
  };
}

function runtimeYenile(raw, descriptor, nowMs) {
  const item = raw && typeof raw === "object" ? { ...raw } : {};
  const respawnAtMs = tamEded(item.respawnAtMs);
  if (respawnAtMs > 0 && nowMs >= respawnAtMs) {
    item.status = "available";
    item.respawnAtMs = 0;
    item.lastDefeatedByPlayerId = "";
  }
  if (item.status !== "defeated") item.status = "available";
  return item;
}

async function dusmenSiyahisiniAl(stateId, nowMs = Date.now()) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const runtime = await runtimeOxu(sid);
  const items = [];

  for (let i = 1; i <= DUSMEN_SAYI; i++) {
    const d = dusmenDescriptor(sid, i);
    const r = runtimeYenile(runtime.enemies && runtime.enemies[d.enemyId], d, nowMs);
    items.push({
      ...d,
      status: r.status,
      available: r.status === "available",
      respawnAtMs: tamEded(r.respawnAtMs)
    });
  }

  return { stateId: sid, items };
}

async function dusmenMelumatiniAl(stateId, enemyId, nowMs = Date.now()) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const id = metnAl(enemyId, 128);
  const match = id.match(/^state_(\d+)_enemy_(\d+)$/);
  if (!match || Number(match[1]) !== sid) return null;

  const descriptor = dusmenDescriptor(sid, Number(match[2]));
  if (!descriptor) return null;

  const runtime = await runtimeOxu(sid);
  const r = runtimeYenile(
    runtime.enemies && runtime.enemies[descriptor.enemyId],
    descriptor,
    nowMs
  );

  return {
    ...descriptor,
    status: r.status,
    available: r.status === "available",
    respawnAtMs: tamEded(r.respawnAtMs),
    defeatedAtMs: tamEded(r.defeatedAtMs)
  };
}

async function dusmeniMeglubEtServer(stateId, enemyId, playerId, nowMs = Date.now()) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const id = metnAl(enemyId, 128);
  const match = id.match(/^state_(\d+)_enemy_(\d+)$/);
  if (!match || Number(match[1]) !== sid) {
    return { success: false, message: "Düşmən bu Dövlətə aid deyil." };
  }

  const descriptor = dusmenDescriptor(sid, Number(match[2]));
  if (!descriptor) return { success: false, message: "Düşmən tapılmadı." };

  return await runtimeEmeliyyati(sid, async runtime => {
    if (!runtime.enemies || typeof runtime.enemies !== "object") runtime.enemies = {};
    const current = runtimeYenile(runtime.enemies[id], descriptor, nowMs);
    if (current.status === "defeated" && tamEded(current.respawnAtMs) > nowMs) {
      return { deyisdi: false, success: false, message: "Düşmən yenidən yaranma mərhələsindədir." };
    }

    current.status = "defeated";
    current.defeatedAtMs = nowMs;
    current.respawnAtMs = nowMs + descriptor.respawnSeconds * 1000;
    current.lastDefeatedByPlayerId = metnAl(playerId, 128);
    runtime.enemies[id] = current;

    return {
      deyisdi: true,
      success: true,
      enemyId: id,
      reward: { ...descriptor.reward },
      respawnAtMs: current.respawnAtMs
    };
  });
}

module.exports = {
  dusmenDescriptor,
  dusmenSiyahisiniAl,
  dusmenMelumatiniAl,
  dusmeniMeglubEtServer
};
