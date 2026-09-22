"use strict";

/*
 * Verified Last Shelter v1.250.102 engagement/reward reference recovered from
 * a fresh-account init payload.
 *
 * Numeric reward type ids remain raw. Helicopter start times are account/time
 * state and are deliberately NOT frozen as configuration.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_FIRST_PAY_REWARD = deepFreeze([
  { type:7, value:{ num:4, id:"200301" } },
  { type:7, value:{ num:4, id:"200331" } },
  { type:7, value:{ num:6, id:"200200" } },
  { type:7, value:{ num:5, id:"200364" } }
]);

const LAST_SHELTER_ONLINE_DURATION = deepFreeze({
  onlineDurationRecruitHero: "240041",
  rewards: [
    {
      entryId:"1", duration:0, durationMax:5, rewardState:1,
      rewardArray:[
        { type:5, value:30 },
        { type:7, value:{ num:50, id:"206011" } },
        { type:7, value:{ num:2, id:"200201" } }
      ]
    },
    {
      entryId:"2", duration:0, durationMax:3, rewardState:2,
      rewardArray:[
        { type:5, value:40 },
        { type:7, value:{ num:50, id:"206011" } },
        { type:7, value:{ num:5, id:"200201" } }
      ]
    },
    {
      entryId:"3", duration:0, durationMax:3, rewardState:2,
      rewardArray:[
        { type:5, value:50 },
        { type:7, value:{ num:50, id:"206011" } },
        { type:7, value:{ num:2, id:"200226" } }
      ]
    },
    {
      entryId:"4", duration:0, durationMax:3, rewardState:2,
      rewardArray:[
        { type:5, value:60 },
        { type:7, value:{ num:50, id:"206011" } },
        { type:7, value:{ num:5, id:"200226" } }
      ]
    },
    {
      entryId:"5", duration:0, durationMax:3, rewardState:2,
      rewardArray:[
        { type:5, value:80 },
        { type:7, value:{ num:50, id:"206011" } },
        { type:7, value:{ num:2, id:"200200" } }
      ]
    },
    {
      entryId:"6", duration:0, durationMax:3, rewardState:2,
      rewardArray:[
        { type:5, value:100 },
        { type:7, value:{ num:50, id:"206011" } },
        { type:7, value:{ num:5, id:"200200" } }
      ]
    }
  ]
});

const LAST_SHELTER_HELICOPTER = deepFreeze({
  recordDefaults: {
    freeRefreshCount:0,
    todayTaskCount:0,
    todayTaskCountLimit:10
  },
  cdgoldk:1,
  refugeeLimit:4,
  taskTemplates:[
    {
      id:330017,
      observedInitialState:1,
      rewardInfo:[
        { type:0, value:931 },
        { type:3, value:399 }
      ],
      rewardInfo2:[
        { type:7, value:{ num:1, id:"200042" } }
      ]
    },
    {
      id:330018,
      observedInitialState:1,
      rewardInfo:[
        { type:0, value:665 },
        { type:3, value:665 }
      ],
      rewardInfo2:[
        { type:7, value:{ num:1, id:"200042" } }
      ]
    },
    {
      id:330019,
      observedInitialState:1,
      rewardInfo:[
        { type:0, value:399 },
        { type:3, value:931 }
      ],
      rewardInfo2:[
        { type:7, value:{ num:1, id:"200042" } }
      ]
    },
    {
      id:330076,
      observedInitialState:1,
      rewardInfo:[
        { type:0, value:8014 },
        { type:3, value:8014 }
      ],
      rewardInfo2:[]
    },
    {
      id:330110,
      observedInitialState:1,
      rewardInfo:[
        { type:0, value:24045 },
        { type:3, value:16030 }
      ],
      rewardInfo2:[]
    }
  ]
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function onlineDurationRewardAl(entryId) {
  const id = String(entryId == null ? "" : entryId).trim();
  const row = LAST_SHELTER_ONLINE_DURATION.rewards.find(x => x.entryId === id);
  return row ? clone(row) : null;
}

function onlineDurationRewardsSnapshotHazirla(state) {
  const runtime = lastShelterEngagementRuntimeTeminEt(state);
  if (!runtime) return [];
  const byId = new Map(
    runtime.onlineDuration.rewards
      .filter(Boolean)
      .map(row => [String(row.entryId), row])
  );
  return LAST_SHELTER_ONLINE_DURATION.rewards.map(template => {
    const row = byId.get(template.entryId) || {};
    return {
      ...clone(template),
      duration: Number.isFinite(Number(row.duration))
        ? Math.max(0, Math.trunc(Number(row.duration)))
        : template.duration,
      rewardState: Number.isFinite(Number(row.rewardState))
        ? Math.max(0, Math.trunc(Number(row.rewardState)))
        : template.rewardState
    };
  });
}

function helicopterTaskTemplateAl(id) {
  const n = Number(id);
  const row = LAST_SHELTER_HELICOPTER.taskTemplates.find(x => x.id === n);
  return row ? clone(row) : null;
}

function lastShelterEngagementRuntimeDefaultHazirla() {
  return {
    firstPayRewardClaimed: false,
    onlineDuration: {
      rewards: LAST_SHELTER_ONLINE_DURATION.rewards.map(row => ({
        entryId:row.entryId,
        duration:row.duration,
        rewardState:row.rewardState
      }))
    },
    helicopter: {
      record:{ ...LAST_SHELTER_HELICOPTER.recordDefaults },
      refugees:[],
      taskState: LAST_SHELTER_HELICOPTER.taskTemplates.map(row => ({
        id:row.id,
        state:row.observedInitialState,
        finishTime:0
      }))
    }
  };
}

function normalizeNonNegativeInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

function lastShelterEngagementRuntimeTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterEngagementRuntime ||
    typeof state.lastShelterEngagementRuntime !== "object" ||
    Array.isArray(state.lastShelterEngagementRuntime)
  ) {
    state.lastShelterEngagementRuntime =
      lastShelterEngagementRuntimeDefaultHazirla();
  }

  const runtime = state.lastShelterEngagementRuntime;
  runtime.firstPayRewardClaimed = runtime.firstPayRewardClaimed === true;

  if (!runtime.onlineDuration || typeof runtime.onlineDuration !== "object") {
    runtime.onlineDuration = { rewards:[] };
  }
  if (!Array.isArray(runtime.onlineDuration.rewards)) {
    runtime.onlineDuration.rewards = [];
  }
  const rewardById = new Map(runtime.onlineDuration.rewards.filter(Boolean).map(row => [String(row.entryId), row]));
  runtime.onlineDuration.rewards = LAST_SHELTER_ONLINE_DURATION.rewards.map(template => {
    const row = rewardById.get(template.entryId) || {};
    return {
      entryId: template.entryId,
      duration: normalizeNonNegativeInt(row.duration, template.duration),
      rewardState: normalizeNonNegativeInt(row.rewardState, template.rewardState)
    };
  });

  if (!runtime.helicopter || typeof runtime.helicopter !== "object") {
    runtime.helicopter = {};
  }
  if (!runtime.helicopter.record || typeof runtime.helicopter.record !== "object") {
    runtime.helicopter.record = { ...LAST_SHELTER_HELICOPTER.recordDefaults };
  }
  for (const [key, fallback] of Object.entries(LAST_SHELTER_HELICOPTER.recordDefaults)) {
    runtime.helicopter.record[key] = normalizeNonNegativeInt(runtime.helicopter.record[key], fallback);
  }
  runtime.helicopter.record.todayTaskCount = Math.min(runtime.helicopter.record.todayTaskCount, runtime.helicopter.record.todayTaskCountLimit);
  if (!Array.isArray(runtime.helicopter.refugees)) runtime.helicopter.refugees = [];
  if (runtime.helicopter.refugees.length > LAST_SHELTER_HELICOPTER.refugeeLimit) runtime.helicopter.refugees = runtime.helicopter.refugees.slice(0, LAST_SHELTER_HELICOPTER.refugeeLimit);
  if (!Array.isArray(runtime.helicopter.taskState)) runtime.helicopter.taskState = [];
  const taskById = new Map(runtime.helicopter.taskState.filter(Boolean).map(row => [Number(row.id), row]));
  runtime.helicopter.taskState = LAST_SHELTER_HELICOPTER.taskTemplates.map(template => {
    const row = taskById.get(template.id) || {};
    return { id: template.id, state: normalizeNonNegativeInt(row.state, template.observedInitialState), finishTime: normalizeNonNegativeInt(row.finishTime, 0) };
  });

  return runtime;
}

module.exports = {
  LAST_SHELTER_FIRST_PAY_REWARD,
  LAST_SHELTER_ONLINE_DURATION,
  LAST_SHELTER_HELICOPTER,
  onlineDurationRewardAl,
  onlineDurationRewardsSnapshotHazirla,
  helicopterTaskTemplateAl,
  lastShelterEngagementRuntimeDefaultHazirla,
  lastShelterEngagementRuntimeTeminEt
};
