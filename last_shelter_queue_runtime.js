"use strict";

const {
  getLastShelterQueueTypeByName
} = require("./last_shelter_queue_kataloqu");

// Queue.getState() decompile-dan birbasa cixarilan contract.
// Reference server cari vaxta 5000 ms grace elave edir.
const LAST_SHELTER_QUEUE_GRACE_MS = 5000;
const LAST_SHELTER_QUEUE_NEVER_UPDATE = Number.MAX_SAFE_INTEGER;
const LAST_SHELTER_QUEUE_STATES = Object.freeze({
  ING: "ING",
  OUT_SYN: "OUT_SYN",
  FREE: "FREE"
});

function normalizeUpdateTime(updateTime) {
  if (updateTime === "9223372036854775807" || updateTime === 9223372036854775807n) {
    return null;
  }
  const value = Number(updateTime);
  if (!Number.isFinite(value)) return null;
  return value;
}

function getLastShelterQueueState(updateTime, nowMs = Date.now()) {
  const now = Number(nowMs);
  if (!Number.isFinite(now)) {
    throw new TypeError("nowMs finite number olmalidir");
  }

  const normalized = normalizeUpdateTime(updateTime);
  // Java Long.MAX_VALUE reference serverde qesden FREE sentinel-dir.
  if (normalized === null || normalized >= LAST_SHELTER_QUEUE_NEVER_UPDATE) {
    return LAST_SHELTER_QUEUE_STATES.FREE;
  }

  const effectiveNow = now + LAST_SHELTER_QUEUE_GRACE_MS;
  return effectiveNow < normalized
    ? LAST_SHELTER_QUEUE_STATES.ING
    : LAST_SHELTER_QUEUE_STATES.OUT_SYN;
}

function shouldAutoReleaseLastShelterQueue(queue, nowMs = Date.now()) {
  if (!queue || typeof queue !== "object") return false;
  const type = getLastShelterQueueTypeByName(queue.typeName);
  if (!type) return false;

  return (
    getLastShelterQueueState(queue.updateTime, nowMs) === LAST_SHELTER_QUEUE_STATES.OUT_SYN &&
    type.name !== "NEW_EQUIP_MATERIAL"
  );
}

function isFreeLastShelterQueue(queue, nowMs = Date.now()) {
  if (!queue || typeof queue !== "object") return false;
  const state = getLastShelterQueueState(queue.updateTime, nowMs);
  return state === LAST_SHELTER_QUEUE_STATES.FREE || shouldAutoReleaseLastShelterQueue(queue, nowMs);
}

module.exports = {
  LAST_SHELTER_QUEUE_GRACE_MS,
  LAST_SHELTER_QUEUE_NEVER_UPDATE,
  LAST_SHELTER_QUEUE_STATES,
  getLastShelterQueueState,
  shouldAutoReleaseLastShelterQueue,
  isFreeLastShelterQueue
};
