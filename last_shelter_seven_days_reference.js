"use strict";

const {
  LAST_SHELTER_TASK_TEMPLATES
} = require("./last_shelter_task_reference");

/*
 * Verified Last Shelter v1.250.102 fresh-account sevenDaysActivity.
 *
 * The captured startTime equals the account regTime and endTime is exactly
 * seven days later. Runtime timestamps are therefore derived from registration
 * time instead of reusing the captured account's absolute epoch values.
 */

const SEVEN_DAYS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_SEVEN_DAYS_REWARD = deepFreeze([
  { type:7, value:{ num:1, id:"200056" } },
  { type:7, value:{ num:1, id:"200060" } },
  { type:7, value:{ num:2, id:"210272" } },
  { type:7, value:{ num:1, id:"210273" } },
  { type:7, value:{ num:10, id:"210164" } },
  { type:7, value:{ num:2, id:"210122" } },
  { type:7, value:{ num:1, id:"210124" } },
  { type:7, value:{ num:1, id:"200392" } },
  { type:7, value:{ num:2, id:"200391" } }
]);

const LAST_SHELTER_SEVEN_DAYS_TASK_INFO = deepFreeze([
  {
    theme:[
      { pageId:"800052", pageTask:"401001;401002;401003;401004;401005;401006;401007" },
      { pageId:"800048", pageTask:"203001;203002;203003;203004;203005;203006" },
      { pageId:"800054", pageTask:"403001;403002;403003;403004;403005" }
    ]
  },
  {
    theme:[
      { pageId:"800046", pageTask:"201001;201002;201003;201004;201005;201006;201007;201008;201009" },
      { pageId:"800047", pageTask:"202001;202002;202003;202004;202005;202006" },
      { pageId:"800051", pageTask:"303001;303002;303003;303004;303005;303006;303007" }
    ]
  },
  {
    theme:[
      { pageId:"800049", pageTask:"301001;301002;301003;301004;301005;301006" },
      { pageId:"800050", pageTask:"302001;302002;302003;302004;302005;302006;302007" },
      { pageId:"800053", pageTask:"402001;402002;402003;402004;402005;402006;402007" }
    ]
  },
  {
    theme:[
      { pageId:"800043", pageTask:"101001;101002;101003;101004;101005" },
      { pageId:"800044", pageTask:"102001;102002;102003;102004;102005;102006;102007" },
      { pageId:"800045", pageTask:"103006;103001;103002;103003;103004;103005;103007;103008;103009" }
    ]
  },
  {
    theme:[
      { pageId:"800055", pageTask:"501001;501002;501003;501004;501005;501006" },
      { pageId:"800056", pageTask:"502001;502002;502003;502004;502005;502006" },
      { pageId:"800057", pageTask:"503001;503002;503003;503004;503005;503006;503007" }
    ]
  }
]);

const LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT = deepFreeze({
  finishFlg:0,
  taskCount:100,
  count:0,
  unlockFlg:1,
  type:49
});

function pageTaskIdsAl(page) {
  if (!page || typeof page.pageTask !== "string") return [];
  return page.pageTask
    .split(";")
    .map(x => x.trim())
    .filter(Boolean);
}

function sevenDaysPageMapHazirla() {
  const result = [];

  LAST_SHELTER_SEVEN_DAYS_TASK_INFO.forEach((day,index) => {
    for (const page of day.theme) {
      result.push({
        dayIndex:index + 1,
        pageId:page.pageId,
        taskIds:pageTaskIdsAl(page)
      });
    }
  });

  return result;
}

function sevenDaysTaskIdsAl() {
  const ids = [];
  for (const page of sevenDaysPageMapHazirla()) {
    for (const id of page.taskIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function sevenDaysTopologyYoxla() {
  const byId = new Map(
    LAST_SHELTER_TASK_TEMPLATES.map(x => [x.id,x])
  );
  const missing = [];
  const wrongType = [];

  for (const id of sevenDaysTaskIdsAl()) {
    const task = byId.get(id);
    if (!task) {
      missing.push(id);
      continue;
    }
    if (task.type1 !== 49) wrongType.push(id);
  }

  return {
    valid:missing.length === 0 && wrongType.length === 0,
    missing,
    wrongType,
    taskCount:sevenDaysTaskIdsAl().length
  };
}

function sevenDaysRuntimeDefaultHazirla(regTimeMs = Date.now()) {
  const startTime = Math.max(0,Math.trunc(Number(regTimeMs) || Date.now()));

  return {
    finishFlg:LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT.finishFlg,
    taskCount:LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT.taskCount,
    count:LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT.count,
    unlockFlg:LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT.unlockFlg,
    type:LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT.type,
    startTime,
    endTime:startTime + SEVEN_DAYS_DURATION_MS,
    rewardClaimed:false
  };
}

function lastShelterSevenDaysRuntimeTeminEt(state, fallbackNowMs = Date.now()) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterSevenDaysRuntime ||
    typeof state.lastShelterSevenDaysRuntime !== "object" ||
    Array.isArray(state.lastShelterSevenDaysRuntime)
  ) {
    const regTime =
      state.lastShelterResourceRuntime &&
      Number(state.lastShelterResourceRuntime.regTime);

    state.lastShelterSevenDaysRuntime =
      sevenDaysRuntimeDefaultHazirla(
        Number.isFinite(regTime) && regTime > 0
          ? regTime
          : fallbackNowMs
      );
  }

  const runtime = state.lastShelterSevenDaysRuntime;
  runtime.count = Math.max(0,Math.trunc(Number(runtime.count) || 0));
  runtime.finishFlg = Math.max(0,Math.trunc(Number(runtime.finishFlg) || 0));
  runtime.unlockFlg = Math.max(0,Math.trunc(Number(runtime.unlockFlg) || 0));
  runtime.rewardClaimed = runtime.rewardClaimed === true;

  return runtime;
}

module.exports = {
  SEVEN_DAYS_DURATION_MS,
  LAST_SHELTER_SEVEN_DAYS_REWARD,
  LAST_SHELTER_SEVEN_DAYS_TASK_INFO,
  LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT,
  pageTaskIdsAl,
  sevenDaysPageMapHazirla,
  sevenDaysTaskIdsAl,
  sevenDaysTopologyYoxla,
  sevenDaysRuntimeDefaultHazirla,
  lastShelterSevenDaysRuntimeTeminEt
};
