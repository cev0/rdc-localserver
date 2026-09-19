"use strict";

const {
  SCIENCE_PROTOCOL,
  scienceMelumatiniAl
} = require("./last_shelter_science_kataloqu");

function metnAl(value, max = 128) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function tamEded(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

function scienceQueueMesguldur(state) {
  const queues = Array.isArray(state && state.queues) ? state.queues : [];
  return queues.some(queue => {
    if (!queue || typeof queue !== "object") return false;
    const type = metnAl(queue.type || queue.queueType, 32).toUpperCase();
    const status = metnAl(queue.status, 32).toLowerCase();
    return type === SCIENCE_PROTOCOL.queueType && status !== "completed" && status !== "done" && status !== "cancelled";
  });
}

function scienceArtıqArasdirilib(state, itemId) {
  const id = metnAl(itemId, 32);
  if (!id) return false;

  const science = state && state.science;
  if (Array.isArray(science)) {
    return science.some(item => metnAl(item && (item.itemId || item.id), 32) === id && tamEded(item && (item.level || item.scienceLevel), 0) > 0);
  }

  if (science && typeof science === "object") {
    const value = science[id];
    if (typeof value === "number") return tamEded(value, 0) > 0;
    if (value && typeof value === "object") return tamEded(value.level || value.scienceLevel, 0) > 0;
  }

  return false;
}

function verifiedScienceResearchPlanHazirla(state, request, nowUnixMs = Date.now()) {
  const itemId = metnAl(request && request.itemId, 32);
  const queueUuid = metnAl(request && (request.quuid || request.queueUuid), 128);
  const optionalGold = tamEded(request && request.gold, 0);

  if (!itemId) return { ok: false, code: "SCIENCE_ITEM_ID_REQUIRED" };

  const science = scienceMelumatiniAl(itemId);
  if (!science) return { ok: false, code: "SCIENCE_ITEM_UNVERIFIED" };

  if (SCIENCE_PROTOCOL.queueRequired && !queueUuid) {
    return { ok: false, code: "SCIENCE_QUEUE_UUID_REQUIRED" };
  }

  if (SCIENCE_PROTOCOL.queueRequired && scienceQueueMesguldur(state)) {
    return { ok: false, code: SCIENCE_PROTOCOL.queueFullError };
  }

  if (SCIENCE_PROTOCOL.duplicateItemRejected && scienceArtıqArasdirilib(state, itemId)) {
    return { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" };
  }

  const startUnixMs = tamEded(nowUnixMs, Date.now());
  const finishUnixMs = startUnixMs + science.researchTimeSeconds * 1000;

  return {
    ok: true,
    protocol: SCIENCE_PROTOCOL.researchRequest,
    itemId,
    queue: { uuid: queueUuid, type: SCIENCE_PROTOCOL.queueType, startUnixMs, finishUnixMs },
    optionalGold,
    buildingCondition: science.buildingCondition,
    researchNeedRaw: science.researchNeedRaw,
    researchNeed: science.researchNeed.map(item => ({ ...item })),
    researchTimeSeconds: science.researchTimeSeconds,
    effect: { type: science.effectType, para1: science.para1, para2: science.para2 },
    power: science.power,
    source: "last_shelter_v1.250.102_verified"
  };
}

/*
 * These lifecycle helpers deliberately do not debit research resources. The
 * numeric science.xml resource type mapping is not verified yet. Callers must
 * authorize/debit the plan's researchNeed before applying it.
 */
function verifiedScienceResearchPlaniniStateEt(state, plan) {
  if (!state || typeof state !== "object" || !plan || plan.ok !== true) {
    return { ok: false, code: "SCIENCE_PLAN_INVALID" };
  }
  if (!scienceMelumatiniAl(plan.itemId)) {
    return { ok: false, code: "SCIENCE_ITEM_UNVERIFIED" };
  }
  if (scienceQueueMesguldur(state)) {
    return { ok: false, code: SCIENCE_PROTOCOL.queueFullError };
  }
  if (scienceArtıqArasdirilib(state, plan.itemId)) {
    return { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" };
  }

  if (!Array.isArray(state.queues)) state.queues = [];
  const queue = {
    uuid: metnAl(plan.queue && plan.queue.uuid, 128),
    type: SCIENCE_PROTOCOL.queueType,
    status: "running",
    itemId: metnAl(plan.itemId, 32),
    startUnixMs: tamEded(plan.queue && plan.queue.startUnixMs),
    finishUnixMs: tamEded(plan.queue && plan.queue.finishUnixMs),
    source: "last_shelter_v1.250.102_verified"
  };
  if (!queue.uuid || !queue.itemId || queue.finishUnixMs < queue.startUnixMs) {
    return { ok: false, code: "SCIENCE_PLAN_INVALID" };
  }
  state.queues.push(queue);
  return { ok: true, queue: { ...queue } };
}

function verifiedScienceResearchYekunlasdir(state, nowUnixMs = Date.now()) {
  if (!state || typeof state !== "object" || !Array.isArray(state.queues)) return [];
  const now = tamEded(nowUnixMs, Date.now());
  if (!state.science || typeof state.science !== "object" || Array.isArray(state.science)) {
    state.science = {};
  }

  const completed = [];
  for (const queue of state.queues) {
    if (!queue || metnAl(queue.type || queue.queueType, 32).toUpperCase() !== SCIENCE_PROTOCOL.queueType) continue;
    if (metnAl(queue.status, 32).toLowerCase() !== "running") continue;
    const itemId = metnAl(queue.itemId, 32);
    if (!scienceMelumatiniAl(itemId)) continue;
    if (tamEded(queue.finishUnixMs) > now) continue;

    queue.status = "completed";
    queue.completedUnixMs = now;
    state.science[itemId] = 1;
    completed.push({ itemId, queueUuid: metnAl(queue.uuid, 128), level: 1, completedUnixMs: now });
  }
  return completed;
}

module.exports = {
  scienceQueueMesguldur,
  scienceArtıqArasdirilib,
  verifiedScienceResearchPlanHazirla,
  verifiedScienceResearchPlaniniStateEt,
  verifiedScienceResearchYekunlasdir
};
