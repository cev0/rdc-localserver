"use strict";

const { resursLevelMelumatiniAl } = require("./xerite_resurs_qaydalari");
const { runtimeOxu, runtimeEmeliyyati } = require("./xerite_resurs_runtime_postgres");
const {
  konvoyQosunStateTeminEt,
  qosunSayiniHesabla
} = require("./konvoy_qosun_sistemi");

const RESURS_SAYI = 18;
const RESURS_NOVLERI = ["food", "water", "wood", "iron", "fuel"];

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}
function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}
function seededRng(seed) {
  let s = (Number(seed) || 1) >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function levelSec(rng, min, max) {
  return min + Math.floor(rng() * ((max - min) + 1));
}
function resursLeveliniHesabla(stateId, hedefIndex) {
  const rng = seededRng((Number(stateId) || 1) * 7919);
  let level = 3;
  for (let i = 1; i <= hedefIndex; i++) {
    rng();
    rng();
    if (i === 18) level = 10;
    else if (i <= 10) level = levelSec(rng, 3, 6);
    else if (i <= 15) level = levelSec(rng, 5, 8);
    else level = levelSec(rng, 8, 9);
  }
  return level;
}

function nodeMelumatiniAl(stateId, nodeId) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const id = metnAl(nodeId, 128);
  const match = id.match(/^state_(\d+)_resource_(\d+)$/);
  if (!match || Number(match[1]) !== sid) return null;

  const index = Number(match[2]);
  if (!Number.isInteger(index) || index < 1 || index > RESURS_SAYI) return null;

  const zoneId = index <= 10
    ? "outer"
    : index <= 15
      ? "middle"
      : index < 18
        ? "inner_green"
        : "president_center";
  const level = resursLeveliniHesabla(sid, index);
  const balans = resursLevelMelumatiniAl(level);

  return {
    nodeId: id,
    stateId: sid,
    index,
    zoneId,
    resourceId: RESURS_NOVLERI[(index - 1) % RESURS_NOVLERI.length],
    level,
    amount: balans.amount,
    gatherSeconds: balans.gatherSeconds,
    respawnSeconds: balans.respawnSeconds
  };
}

function toplamaStateTeminEt(state) {
  if (!state.xeriteToplama || typeof state.xeriteToplama !== "object" || Array.isArray(state.xeriteToplama)) {
    state.xeriteToplama = { version: 1, activeByConvoy: {}, pendingRewards: [] };
  }
  if (!state.xeriteToplama.activeByConvoy || typeof state.xeriteToplama.activeByConvoy !== "object") {
    state.xeriteToplama.activeByConvoy = {};
  }
  if (!Array.isArray(state.xeriteToplama.pendingRewards)) state.xeriteToplama.pendingRewards = [];
  return state.xeriteToplama;
}

function dovletIdAl(state) {
  return Math.max(1, tamEded(state && state.worldPlacement && state.worldPlacement.stateId) || 1);
}

function konvoyuAl(state, konvoyId) {
  const id = metnAl(konvoyId, 64);
  const konvoylar = konvoyQosunStateTeminEt(state);
  return konvoylar.items.find(x => x && x.konvoyId === id && x.aciqdir === true) || null;
}

function nodeRuntimeYenile(node, descriptor, nowMs) {
  if (!node || typeof node !== "object") node = {};
  if (!Number.isFinite(Number(node.remainingAmount))) node.remainingAmount = descriptor.amount;

  const occupiedUntilMs = tamEded(node.occupiedUntilMs);
  if (node.occupiedByPlayerId && occupiedUntilMs > 0 && nowMs >= occupiedUntilMs) {
    node.remainingAmount = 0;
    node.respawnAtMs = occupiedUntilMs + descriptor.respawnSeconds * 1000;
    node.occupiedByPlayerId = "";
    node.occupiedByConvoyId = "";
    node.occupiedUntilMs = 0;
  }

  const respawnAtMs = tamEded(node.respawnAtMs);
  if (node.remainingAmount <= 0 && respawnAtMs > 0 && nowMs >= respawnAtMs) {
    node.remainingAmount = descriptor.amount;
    node.respawnAtMs = 0;
  }

  return node;
}

async function resursNodeSiyahisiniAl(stateId, nowMs = Date.now()) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const runtime = await runtimeOxu(sid);
  const items = [];

  for (let i = 1; i <= RESURS_SAYI; i++) {
    const d = nodeMelumatiniAl(sid, `state_${sid}_resource_${i}`);
    const raw = runtime.nodes && runtime.nodes[d.nodeId];
    const node = nodeRuntimeYenile(raw ? { ...raw } : {}, d, nowMs);
    const remainingAmount = Number.isFinite(Number(node.remainingAmount)) ? Number(node.remainingAmount) : d.amount;
    items.push({
      ...d,
      remainingAmount,
      occupiedByPlayerId: node.occupiedByPlayerId || "",
      occupiedByConvoyId: node.occupiedByConvoyId || "",
      occupiedUntilMs: tamEded(node.occupiedUntilMs),
      respawnAtMs: tamEded(node.respawnAtMs),
      available: !node.occupiedByPlayerId && remainingAmount > 0 && tamEded(node.respawnAtMs) === 0
    });
  }

  return { stateId: sid, items };
}

async function toplamaniBaslat(state, playerId, konvoyId, nodeId, nowMs = Date.now()) {
  const toplama = toplamaStateTeminEt(state);
  const id = metnAl(konvoyId, 64);
  const konvoy = konvoyuAl(state, id);
  if (!konvoy) return { success: false, message: "Konvoy açıq deyil." };
  if (qosunSayiniHesabla(konvoy.qosunlar) <= 0) {
    return { success: false, message: "Resurs toplamaq üçün konvoyda ən azı bir birlik olmalıdır." };
  }
  if (toplama.activeByConvoy[id]) {
    return { success: false, message: "Bu konvoy artıq xəritə tapşırığındadır." };
  }

  const stateId = dovletIdAl(state);
  const descriptor = nodeMelumatiniAl(stateId, nodeId);
  if (!descriptor) return { success: false, message: "Resurs node-u bu Dövlətə aid deyil." };

  const endsAtMs = nowMs + descriptor.gatherSeconds * 1000;
  const result = await runtimeEmeliyyati(stateId, async runtime => {
    if (!runtime.nodes || typeof runtime.nodes !== "object") runtime.nodes = {};
    const node = nodeRuntimeYenile(runtime.nodes[descriptor.nodeId] || {}, descriptor, nowMs);
    runtime.nodes[descriptor.nodeId] = node;

    if (node.occupiedByPlayerId) return { deyisdi: false, success: false, message: "Resurs node-u başqa konvoy tərəfindən tutulub." };
    if ((Number(node.remainingAmount) || 0) <= 0 || tamEded(node.respawnAtMs) > nowMs) {
      return { deyisdi: false, success: false, message: "Resurs node-u hazırda boşdur və yenilənir." };
    }

    node.occupiedByPlayerId = metnAl(playerId, 128);
    node.occupiedByConvoyId = id;
    node.occupiedUntilMs = endsAtMs;
    return { deyisdi: true, success: true };
  });

  if (!result || !result.success) return result || { success: false, message: "Toplama başlatmaq mümkün olmadı." };

  const mission = {
    convoyId: id,
    nodeId: descriptor.nodeId,
    stateId,
    resourceId: descriptor.resourceId,
    amount: descriptor.amount,
    level: descriptor.level,
    startedAtMs: nowMs,
    endsAtMs,
    status: "gathering"
  };
  toplama.activeByConvoy[id] = mission;
  return { success: true, mission: { ...mission } };
}

async function toplamaniLegvEt(state, playerId, konvoyId, nowMs = Date.now()) {
  const toplama = toplamaStateTeminEt(state);
  const id = metnAl(konvoyId, 64);
  const mission = toplama.activeByConvoy[id];

  if (!mission) {
    return {
      success: true,
      alreadyInactive: true,
      convoyId: id,
      rewardCreated: false
    };
  }

  const sid = Math.max(1, tamEded(mission.stateId) || dovletIdAl(state));
  const descriptor = nodeMelumatiniAl(sid, mission.nodeId);
  let nodeReleased = false;

  if (descriptor) {
    const release = await runtimeEmeliyyati(sid, async runtime => {
      if (!runtime.nodes || typeof runtime.nodes !== "object") runtime.nodes = {};
      const raw = runtime.nodes[descriptor.nodeId];
      if (!raw || typeof raw !== "object") {
        return { deyisdi: false, success: true, released: false };
      }

      const ownerMatches =
        metnAl(raw.occupiedByPlayerId, 128) === metnAl(playerId, 128) &&
        metnAl(raw.occupiedByConvoyId, 64) === id;

      if (!ownerMatches) {
        return { deyisdi: false, success: true, released: false };
      }

      raw.occupiedByPlayerId = "";
      raw.occupiedByConvoyId = "";
      raw.occupiedUntilMs = 0;
      return { deyisdi: true, success: true, released: true };
    });

    nodeReleased = !!(release && release.released === true);
  }

  delete toplama.activeByConvoy[id];

  return {
    success: true,
    alreadyInactive: false,
    convoyId: id,
    nodeId: metnAl(mission.nodeId, 128),
    nodeReleased,
    rewardCreated: false,
    cancelledAtMs: tamEded(nowMs) || Date.now()
  };
}

function bitmisToplamalariPendingEt(state, nowMs = Date.now()) {
  const toplama = toplamaStateTeminEt(state);
  const completed = [];
  for (const [convoyId, mission] of Object.entries(toplama.activeByConvoy)) {
    if (!mission || tamEded(mission.endsAtMs) > nowMs) continue;
    const reward = {
      rewardId: `${mission.nodeId}:${mission.startedAtMs}`,
      convoyId,
      nodeId: mission.nodeId,
      resourceId: mission.resourceId,
      amount: tamEded(mission.amount),
      completedAtMs: tamEded(mission.endsAtMs)
    };
    if (!toplama.pendingRewards.some(x => x && x.rewardId === reward.rewardId)) toplama.pendingRewards.push(reward);
    delete toplama.activeByConvoy[convoyId];
    completed.push(reward);
  }
  return completed;
}

function pendingMukafatiAl(state, rewardId) {
  const toplama = toplamaStateTeminEt(state);
  const id = metnAl(rewardId, 200);
  const index = toplama.pendingRewards.findIndex(x => x && metnAl(x.rewardId, 200) === id);
  if (index < 0) return { success: false, message: "Toplama mükafatı tapılmadı." };

  const reward = toplama.pendingRewards[index];
  if (!state.resources || typeof state.resources !== "object") state.resources = {};
  const resourceId = metnAl(reward.resourceId, 64);
  const current = Math.max(0, Number(state.resources[resourceId]) || 0);
  const capRaw = state.resourceCaps && Number(state.resourceCaps[resourceId]);
  const cap = Number.isFinite(capRaw) ? Math.max(0, capRaw) : Number.POSITIVE_INFINITY;
  const amount = tamEded(reward.amount);

  if (current + amount > cap) {
    return { success: false, message: "Anbarda toplama mükafatı üçün kifayət qədər yer yoxdur.", reward: { ...reward } };
  }

  state.resources[resourceId] = current + amount;
  toplama.pendingRewards.splice(index, 1);
  return { success: true, reward: { ...reward }, newAmount: state.resources[resourceId] };
}

function toplamaMelumatiniHazirla(state, nowMs = Date.now()) {
  bitmisToplamalariPendingEt(state, nowMs);
  const toplama = toplamaStateTeminEt(state);
  return {
    active: Object.values(toplama.activeByConvoy).map(x => ({ ...x })),
    pendingRewards: toplama.pendingRewards.map(x => ({ ...x }))
  };
}

module.exports = {
  nodeMelumatiniAl,
  resursNodeSiyahisiniAl,
  toplamaniBaslat,
  toplamaniLegvEt,
  bitmisToplamalariPendingEt,
  pendingMukafatiAl,
  toplamaMelumatiniHazirla
};
