"use strict";

const crypto = require("crypto");
const {
  getLastShelterQueueTypeByCode
} = require("./last_shelter_queue_kataloqu");

/*
 * Verified Last Shelter v1.250.102 starter inventory + queue layout.
 *
 * UUIDs are per-account runtime values and are regenerated. The three captured
 * nonzero queue endTime values were registration-time synchronization stamps,
 * so they are retained only as observations and not replayed as live epochs.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_STARTER_ITEM_TEMPLATES = deepFreeze([
  {
    itemId:"200200",
    use:"0",
    count:1,
    para1:"1",
    para2:"1",
    para3:"3600"
  },
  {
    itemId:"200201",
    use:"0",
    count:3,
    para1:"1",
    para2:"1",
    para3:"300"
  }
]);

const LAST_SHELTER_STARTER_QUEUE_LAYOUT = deepFreeze([
  { typeCode:3, qid:1, observedEndTime:0 },
  { typeCode:26, qid:1, observedEndTime:0 },
  { typeCode:0, qid:3, observedEndTime:1789659008308 },
  { typeCode:11, qid:1, observedEndTime:0 },
  { typeCode:6, qid:2, observedEndTime:1789659008308 },
  { typeCode:36, qid:1, observedEndTime:0 },
  { typeCode:0, qid:2, observedEndTime:1789659008308 },
  { typeCode:0, qid:1, observedEndTime:0 },
  { typeCode:28, qid:1, observedEndTime:0 },
  { typeCode:13, qid:1, observedEndTime:0 },
  { typeCode:1, qid:1, observedEndTime:0 },
  { typeCode:29, qid:1, observedEndTime:0 }
]);

function uuid32Hazirla(uuidFactory) {
  if (typeof uuidFactory === "function") {
    const value = String(uuidFactory()).trim();
    if (value) return value;
  }
  return crypto.randomBytes(16).toString("hex");
}

function starterItemsHazirla(uuidFactory) {
  return LAST_SHELTER_STARTER_ITEM_TEMPLATES.map(row => ({
    ...row,
    uuid:uuid32Hazirla(uuidFactory)
  }));
}

function starterQueueRuntimeHazirla(uuidFactory) {
  return LAST_SHELTER_STARTER_QUEUE_LAYOUT.map(row => {
    const type = getLastShelterQueueTypeByCode(row.typeCode);
    return {
      itemObj:{},
      startTime:0,
      updateTime:0,
      endTime:0,
      typeCode:row.typeCode,
      typeName:type ? type.name : "",
      uuid:uuid32Hazirla(uuidFactory),
      qid:row.qid,
      isHelped:0
    };
  });
}

function starterQueueInitProjectionHazirla(runtimeQueues) {
  return (Array.isArray(runtimeQueues) ? runtimeQueues : []).map(row => ({
    itemObj:
      row && row.itemObj && typeof row.itemObj === "object"
        ? JSON.parse(JSON.stringify(row.itemObj))
        : {},
    startTime:Number(row && row.startTime) || 0,
    updateTime:Number(row && row.updateTime) || 0,
    endTime:Number(row && row.endTime) || 0,
    type:Number(row && row.typeCode) || 0,
    uuid:String(row && row.uuid || ""),
    qid:Number(row && row.qid) || 0,
    isHelped:Number(row && row.isHelped) || 0
  }));
}

function lastShelterStarterAccountRuntimeDefaultHazirla(uuidFactory) {
  return {
    items:starterItemsHazirla(uuidFactory),
    queues:starterQueueRuntimeHazirla(uuidFactory),
    finishedQueue:[]
  };
}

function lastShelterStarterAccountRuntimeTeminEt(state, uuidFactory) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterStarterAccountRuntime ||
    typeof state.lastShelterStarterAccountRuntime !== "object" ||
    Array.isArray(state.lastShelterStarterAccountRuntime)
  ) {
    state.lastShelterStarterAccountRuntime =
      lastShelterStarterAccountRuntimeDefaultHazirla(uuidFactory);
  }

  const runtime = state.lastShelterStarterAccountRuntime;

  if (!Array.isArray(runtime.items)) {
    runtime.items = starterItemsHazirla(uuidFactory);
  }
  if (!Array.isArray(runtime.queues)) {
    runtime.queues = starterQueueRuntimeHazirla(uuidFactory);
  }
  if (!Array.isArray(runtime.finishedQueue)) {
    runtime.finishedQueue = [];
  }

  return runtime;
}

module.exports = {
  LAST_SHELTER_STARTER_ITEM_TEMPLATES,
  LAST_SHELTER_STARTER_QUEUE_LAYOUT,
  starterItemsHazirla,
  starterQueueRuntimeHazirla,
  starterQueueInitProjectionHazirla,
  lastShelterStarterAccountRuntimeDefaultHazirla,
  lastShelterStarterAccountRuntimeTeminEt
};
