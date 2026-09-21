"use strict";

const {
  SCIENCE_PROTOCOL,
  scienceMelumatiniAl
} = require("./last_shelter_science_kataloqu");
const {
  getLastShelterQueueTypeByCode
} = require("./last_shelter_queue_kataloqu");
const {
  isFreeLastShelterQueue
} = require("./last_shelter_queue_runtime");

function metnAl(value, max = 128) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function tamEded(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

function scienceQueueListesiAl(state) {
  if (Array.isArray(state && state.queues)) {
    return state.queues;
  }

  const starterRuntime =
    state &&
    state.lastShelterStarterAccountRuntime;

  if (
    starterRuntime &&
    Array.isArray(starterRuntime.queues)
  ) {
    return starterRuntime.queues;
  }

  return [];
}

function queueTypeCodeAl(queue) {
  if (!queue || typeof queue !== "object") {
    return null;
  }

  for (const value of [
    queue.typeCode,
    queue.type,
    queue.queueType
  ]) {
    const numeric = Number(value);
    if (Number.isInteger(numeric)) {
      return numeric;
    }
  }

  return null;
}

function scienceQueueTipidir(queue) {
  const typeName = metnAl(
    queue &&
    (
      queue.typeName ||
      queue.queueTypeName ||
      queue.type ||
      queue.queueType
    ),
    32
  ).toUpperCase();

  if (typeName === SCIENCE_PROTOCOL.queueType) {
    return true;
  }

  const type =
    getLastShelterQueueTypeByCode(
      queueTypeCodeAl(queue)
    );

  return !!(
    type &&
    type.name === SCIENCE_PROTOCOL.queueType
  );
}

function exactLastShelterQueueSeklidir(queue) {
  if (!queue || typeof queue !== "object") {
    return false;
  }

  return (
    queueTypeCodeAl(queue) !== null ||
    Object.prototype.hasOwnProperty.call(
      queue,
      "updateTime"
    ) ||
    Object.prototype.hasOwnProperty.call(
      queue,
      "endTime"
    )
  );
}

function queueBosdur(
  queue,
  nowUnixMs = Date.now()
) {
  const status = metnAl(
    queue && queue.status,
    32
  ).toLowerCase();

  if (status) {
    return (
      status === "free" ||
      status === "completed" ||
      status === "done" ||
      status === "cancelled"
    );
  }

  if (!exactLastShelterQueueSeklidir(queue)) {
    return true;
  }

  const now =
    tamEded(
      nowUnixMs,
      Date.now()
    );

  // Captured starter qid=2 queues carry a future endTime lease even while
  // updateTime is zero. ScienceService also checks now >= queue.endTime when
  // an explicit quuid is supplied, so such a queue is not reusable early.
  const endTime =
    Number(queue && queue.endTime);

  const itemId =
    metnAl(
      queue &&
      (
        queue.itemId ||
        (
          queue.itemObj &&
          queue.itemObj.itemId
        )
      ),
      64
    );

  if (
    !itemId &&
    Number.isFinite(endTime) &&
    endTime > now
  ) {
    return false;
  }

  return isFreeLastShelterQueue(
    {
      ...queue,
      typeName:
        SCIENCE_PROTOCOL.queueType
    },
    now
  );
}

function scienceQueueMesguldur(
  state,
  nowUnixMs = Date.now()
) {
  const queues =
    scienceQueueListesiAl(state);

  return queues.some(
    queue =>
      scienceQueueTipidir(queue) &&
      !queueBosdur(
        queue,
        nowUnixMs
      )
  );
}

function scienceQueueSec(
  state,
  queueUuid,
  nowUnixMs = Date.now()
) {
  const queues =
    scienceQueueListesiAl(state);

  const uuid =
    metnAl(queueUuid, 128);

  if (uuid) {
    const queue =
      queues.find(
        item =>
          metnAl(
            item && item.uuid,
            128
          ) === uuid
      );

    if (
      !queue ||
      !scienceQueueTipidir(queue) ||
      !queueBosdur(
        queue,
        nowUnixMs
      )
    ) {
      return null;
    }

    return queue;
  }

  // ScienceService.researchOneScience blank quuid -> getFreeQueue(... SCIENCE, 1).
  // Prefer the verified primary queue (qid=1); if qid is absent, preserve list order.
  const freeScience =
    queues.filter(
      queue =>
        scienceQueueTipidir(queue) &&
        queueBosdur(
          queue,
          nowUnixMs
        )
    );

  return (
    freeScience.find(
      queue =>
        tamEded(
          queue &&
          (
            queue.qid ||
            queue.queueId
          ),
          0
        ) === 1
    ) ||
    freeScience.find(
      queue =>
        tamEded(
          queue &&
          (
            queue.qid ||
            queue.queueId
          ),
          0
        ) === 0
    ) ||
    null
  );
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
  const requestedQueueUuid = metnAl(request && (request.quuid || request.queueUuid), 128);
  const optionalGold = tamEded(request && request.gold, 0);

  if (!itemId) return { ok: false, code: "SCIENCE_ITEM_ID_REQUIRED" };

  const science = scienceMelumatiniAl(itemId);
  if (!science) return { ok: false, code: "SCIENCE_ITEM_UNVERIFIED" };

  const selectedQueue =
    scienceQueueSec(
      state,
      requestedQueueUuid,
      nowUnixMs
    );
  if (!selectedQueue) return { ok: false, code: SCIENCE_PROTOCOL.queueFullError };

  if (SCIENCE_PROTOCOL.duplicateItemRejected && scienceArtıqArasdirilib(state, itemId)) {
    return { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" };
  }

  const queueUuid = metnAl(selectedQueue.uuid, 128);
  if (!queueUuid) return { ok: false, code: SCIENCE_PROTOCOL.queueFullError };

  const startUnixMs = tamEded(nowUnixMs, Date.now());
  const finishUnixMs = startUnixMs + science.researchTimeSeconds * 1000;

  return {
    ok: true,
    protocol: SCIENCE_PROTOCOL.researchRequest,
    itemId,
    queue: {
      uuid: queueUuid,
      qid: tamEded(selectedQueue.qid || selectedQueue.queueId, 0),
      type: SCIENCE_PROTOCOL.queueType,
      startUnixMs,
      finishUnixMs
    },
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
  if (scienceArtıqArasdirilib(state, plan.itemId)) {
    return { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" };
  }

  const queues =
    scienceQueueListesiAl(state);

  const queueUuid =
    metnAl(
      plan.queue &&
      plan.queue.uuid,
      128
    );

  const queue =
    queues.find(
      item =>
        metnAl(
          item && item.uuid,
          128
        ) === queueUuid
    );

  if (
    !queue ||
    !scienceQueueTipidir(queue) ||
    !queueBosdur(
      queue,
      plan.queue &&
      plan.queue.startUnixMs
    )
  ) {
    return {
      ok: false,
      code:
        SCIENCE_PROTOCOL.queueFullError
    };
  }

  const itemId = metnAl(plan.itemId, 32);
  const startUnixMs = tamEded(plan.queue && plan.queue.startUnixMs);
  const finishUnixMs = tamEded(plan.queue && plan.queue.finishUnixMs);
  if (!queueUuid || !itemId || finishUnixMs < startUnixMs) {
    return { ok: false, code: "SCIENCE_PLAN_INVALID" };
  }

  const numericQueueShape =
    exactLastShelterQueueSeklidir(
      queue
    );

  if (numericQueueShape) {
    // Queue.occupy(itemId, finishTime) reference projection:
    // startTime=current time, updateTime=finish, totalTime=duration.
    queue.type = 6;
    queue.typeCode = 6;
    queue.typeName =
      SCIENCE_PROTOCOL.queueType;
    queue.itemObj = {
      ...(
        queue.itemObj &&
        typeof queue.itemObj === "object"
          ? queue.itemObj
          : {}
      ),
      itemId
    };
    queue.startTime = startUnixMs;
    queue.updateTime = finishUnixMs;
    queue.totalTime =
      Math.max(
        0,
        finishUnixMs - startUnixMs
      );
  }
  else {
    queue.type =
      SCIENCE_PROTOCOL.queueType;
  }

  queue.status = "running";
  queue.itemId = itemId;
  queue.startUnixMs = startUnixMs;
  queue.finishUnixMs = finishUnixMs;
  queue.source =
    "last_shelter_v1.250.102_verified";
  return { ok: true, queue: { ...queue } };
}

function verifiedScienceResearchYekunlasdir(state, nowUnixMs = Date.now()) {
  if (!state || typeof state !== "object") return [];

  const queues =
    scienceQueueListesiAl(state);

  if (!Array.isArray(queues)) return [];

  const now =
    tamEded(
      nowUnixMs,
      Date.now()
    );
  if (!state.science || typeof state.science !== "object" || Array.isArray(state.science)) {
    state.science = {};
  }

  const completed = [];
  for (const queue of queues) {
    if (!queue || !scienceQueueTipidir(queue)) continue;
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
  scienceQueueListesiAl,
  scienceQueueTipidir,
  queueBosdur,
  scienceQueueMesguldur,
  scienceQueueSec,
  scienceArtıqArasdirilib,
  verifiedScienceResearchPlanHazirla,
  verifiedScienceResearchPlaniniStateEt,
  verifiedScienceResearchYekunlasdir
};
