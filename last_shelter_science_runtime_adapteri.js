"use strict";

const {
  SCIENCE_PROTOCOL,
  scienceMelumatiniAl,
  scienceLevelMelumatiniAl
} = require("./last_shelter_science_kataloqu");
const {
  getLastShelterQueueTypeByCode
} = require("./last_shelter_queue_kataloqu");
const {
  isFreeLastShelterQueue
} = require("./last_shelter_queue_runtime");

const { scienceLevelAl } = require("./last_shelter_science_prerequisite_runtime");

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

  return isFreeLastShelterQueue(
    {
      ...queue,
      typeName:
        SCIENCE_PROTOCOL.queueType
    },
    now
  );
}

function explicitScienceQueueLeaseAktivdir(
  queue,
  nowUnixMs = Date.now()
) {
  if (!queue || typeof queue !== "object") {
    return false;
  }

  // ScienceService.researchOneScience explicit quuid bytecode:
  // currentTimeMillis < queue.endTime must hold. If this fixture does not
  // expose endTime at all, keep compatibility with non-reference test shapes.
  if (
    !Object.prototype.hasOwnProperty.call(
      queue,
      "endTime"
    )
  ) {
    return true;
  }

  const endTime = Number(queue.endTime);
  const now = tamEded(nowUnixMs, Date.now());

  return (
    Number.isFinite(endTime) &&
    now < endTime
  );
}

function secondScienceQueueIcazelidir(
  state,
  queue,
  nowUnixMs,
  secondQueueCheck
) {
  const qid = tamEded(
    queue &&
    (
      queue.qid ||
      queue.queueId
    ),
    0
  );

  if (qid !== 2) {
    return true;
  }

  // Reference checkSecondQueue requires academy stationing and skill 61012.
  // The production science command supplies the authoritative verifier.
  if (typeof secondQueueCheck !== "function") {
    return false;
  }

  return secondQueueCheck(
    state,
    queue,
    nowUnixMs
  ) === true;
}

function scienceAktivArasdirilir(
  state,
  itemId,
  nowUnixMs = Date.now()
) {
  const id = metnAl(itemId, 32);
  if (!id) return false;

  return scienceQueueListesiAl(state).some(queue => {
    if (!scienceQueueTipidir(queue)) {
      return false;
    }

    if (queueBosdur(queue, nowUnixMs)) {
      return false;
    }

    const queueItemId = metnAl(
      queue &&
      (
        queue.itemId ||
        (
          queue.itemObj &&
          queue.itemObj.itemId
        )
      ),
      32
    );

    return queueItemId === id;
  });
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
  nowUnixMs = Date.now(),
  options = {}
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
      ) ||
      !explicitScienceQueueLeaseAktivdir(
        queue,
        nowUnixMs
      ) ||
      !secondScienceQueueIcazelidir(
        state,
        queue,
        nowUnixMs,
        options.secondQueueCheck
      )
    ) {
      return null;
    }

    return queue;
  }

  // QueueManager.getFreeQueue(SCIENCE, 1) uses 1 as a lease margin in ms,
  // not a qid selector: remove expired leases, then sort by qid.
  const freeScience =
    queues.filter(
      queue =>
        scienceQueueTipidir(queue) &&
        queueBosdur(
          queue,
          nowUnixMs
        ) &&
        explicitScienceQueueLeaseAktivdir(queue, nowUnixMs)
    ).sort((a, b) =>
      tamEded(a.qid ?? a.queueId, 0) - tamEded(b.qid ?? b.queueId, 0)
    );

  const preferred = freeScience[0] || null;

  if (
    preferred &&
    !secondScienceQueueIcazelidir(
      state,
      preferred,
      nowUnixMs,
      options.secondQueueCheck
    )
  ) {
    return null;
  }

  return preferred;
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

function verifiedScienceResearchPlanHazirla(
  state,
  request,
  nowUnixMs = Date.now(),
  options = {}
) {
  const itemId = metnAl(request && request.itemId, 32);
  const requestedQueueUuid = metnAl(request && (request.quuid || request.queueUuid), 128);
  const optionalGold = tamEded(request && request.gold, 0);

  if (!itemId) return { ok: false, code: "SCIENCE_ITEM_ID_REQUIRED" };

  const root = scienceMelumatiniAl(itemId);
  if (!root || root.scienceLevel !== 0) return { ok: false, code: "SCIENCE_ITEM_UNVERIFIED" };
  const currentLevel = scienceLevelAl(state, itemId);
  const science = scienceLevelMelumatiniAl(itemId, currentLevel);
  const next = scienceLevelMelumatiniAl(itemId, currentLevel + 1);
  if (!science || !next || science.researchTimeSeconds == null) {
    return { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" };
  }

  const selectedQueue =
    scienceQueueSec(
      state,
      requestedQueueUuid,
      nowUnixMs,
      options
    );
  if (!selectedQueue) return { ok: false, code: SCIENCE_PROTOCOL.queueFullError };

  if (
    SCIENCE_PROTOCOL.duplicateItemRejected &&
    scienceAktivArasdirilir(
      state,
      itemId,
      nowUnixMs
    )
  ) {
    return {
      ok: false,
      code: "SCIENCE_ALREADY_RESEARCHING"
    };
  }

  if (
    science.maxLevel > 0 &&
    scienceArtıqArasdirilib(
      state,
      itemId
    ) &&
    science.maxLevel === 1
  ) {
    return {
      ok: false,
      code: "SCIENCE_ALREADY_RESEARCHED"
    };
  }

  const queueUuid = metnAl(selectedQueue.uuid, 128);
  if (!queueUuid) return { ok: false, code: SCIENCE_PROTOCOL.queueFullError };

  const startUnixMs = tamEded(nowUnixMs, Date.now());
  const finishUnixMs = startUnixMs + science.researchTimeSeconds * 1000;

  return {
    ok: true,
    protocol: SCIENCE_PROTOCOL.researchRequest,
    itemId,
    currentLevel,
    targetLevel: currentLevel + 1,
    xmlId: science.itemId,
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
 * Lifecycle helpers do not debit resources. The science mutation service
 * validates prerequisites, computes costs and debits atomically with this plan.
 */
function verifiedScienceResearchPlaniniStateEt(state, plan) {
  if (!state || typeof state !== "object" || !plan || plan.ok !== true) {
    return { ok: false, code: "SCIENCE_PLAN_INVALID" };
  }
  if (!scienceMelumatiniAl(plan.itemId)) {
    return { ok: false, code: "SCIENCE_ITEM_UNVERIFIED" };
  }
  const currentLevel = scienceLevelAl(state, plan.itemId);
  const targetLevel = plan.targetLevel ?? 1;
  if (currentLevel >= targetLevel) return { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" };
  if (currentLevel !== (plan.currentLevel ?? 0) || targetLevel !== currentLevel + 1 ||
      !scienceLevelMelumatiniAl(plan.itemId, targetLevel)) {
    return { ok: false, code: "SCIENCE_PLAN_STALE" };
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
  queue.scienceStartLevel = currentLevel;
  queue.scienceTargetLevel = targetLevel;
  queue.startUnixMs = startUnixMs;
  queue.finishUnixMs = finishUnixMs;
  queue.source =
    "last_shelter_v1.250.102_verified";
  return { ok: true, queue: { ...queue } };
}

function verifiedScienceResearchDeadlineAtMs(state) {
  const queues =
    scienceQueueListesiAl(state);

  let next =
    Number.POSITIVE_INFINITY;

  for (const queue of queues) {
    if (!queue || !scienceQueueTipidir(queue)) {
      continue;
    }

    if (
      metnAl(
        queue.status,
        32
      ).toLowerCase() !==
      "running"
    ) {
      continue;
    }

    const rawFinish =
      Object.prototype.hasOwnProperty.call(
        queue,
        "finishUnixMs"
      )
        ? queue.finishUnixMs
        : queue.updateTime;

    const finishUnixMs =
      tamEded(
        rawFinish,
        0
      );

    if (finishUnixMs > 0) {
      next =
        Math.min(
          next,
          finishUnixMs
        );
    }
  }

  return Number.isFinite(next)
    ? next
    : null;
}

function verifiedScienceResearchYekunlasdir(state, nowUnixMs = Date.now(), options = {}) {
  if (!state || typeof state !== "object") return [];

  const queues =
    scienceQueueListesiAl(state);

  if (!Array.isArray(queues)) return [];

  const now =
    tamEded(
      nowUnixMs,
      Date.now()
    );
  const completed = [];
  for (const queue of queues) {
    if (!queue || !scienceQueueTipidir(queue)) continue;
    if (options.queueUuid && queue.uuid !== options.queueUuid) continue;
    if (metnAl(queue.status, 32).toLowerCase() !== "running") continue;
    const itemId = metnAl(queue.itemId || queue.itemObj?.itemId, 32);
    const targetLevel = queue.scienceTargetLevel ?? 1;
    if (!scienceLevelMelumatiniAl(itemId, targetLevel)) continue;
    const finish = Number(queue.finishUnixMs ?? queue.updateTime);
    if (!Number.isFinite(finish) || finish < 0 || finish > now + (options.earlyWindowMs || 0)) continue;
    const current = scienceLevelAl(state, itemId);
    // A persisted completion must never downgrade a later imported level.
    if (current < targetLevel && current !== (queue.scienceStartLevel ?? 0)) continue;
    if (!state.science || typeof state.science !== "object") state.science = {};
    if (current < targetLevel) {
      if (Array.isArray(state.science)) {
        const entry = state.science.find(row => String(row?.itemId ?? row?.id) === itemId);
        if (entry) {
          entry.level = targetLevel;
          if (Object.hasOwn(entry, "scienceLevel")) entry.scienceLevel = targetLevel;
        } else state.science.push({ itemId, level: targetLevel });
      } else if (state.science[itemId] && typeof state.science[itemId] === "object") {
        state.science[itemId].level = targetLevel;
        if (Object.hasOwn(state.science[itemId], "scienceLevel")) state.science[itemId].scienceLevel = targetLevel;
      } else state.science[itemId] = targetLevel;
    }
    // Settling a stale queue also changes persisted state. Report that settlement
    // so the deadline scheduler commits it, without lowering an imported level.
    completed.push({ itemId, queueUuid: metnAl(queue.uuid, 128), level: Math.max(current, targetLevel), completedUnixMs: now });
    queue.status = "completed";
    queue.completedUnixMs = now;
    queue.lastScienceCompletion = { itemId, level: targetLevel, completedUnixMs: now };
    // Keep the RDC completion history while releasing the native queue item.
    // Native duplicate detection considers even overdue queues with an itemId.
    if (queue.itemObj) queue.itemObj = {};
  }
  return completed;
}

module.exports = {
  scienceQueueListesiAl,
  scienceQueueTipidir,
  queueBosdur,
  explicitScienceQueueLeaseAktivdir,
  secondScienceQueueIcazelidir,
  scienceAktivArasdirilir,
  scienceQueueMesguldur,
  scienceQueueSec,
  scienceArtıqArasdirilib,
  verifiedScienceResearchPlanHazirla,
  verifiedScienceResearchPlaniniStateEt,
  verifiedScienceResearchDeadlineAtMs,
  verifiedScienceResearchYekunlasdir
};
