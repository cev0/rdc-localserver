"use strict";

// ============================================================
// RDC LOCAL WS SERVER
// ------------------------------------------------------------
// Bu server Unity layihəsi üçün lokal WebSocket backend-dir.
//
// Hazır sistemlər:
// 1) Player state yaratmaq
// 2) HQ + starter road layout
// 3) Build request
// 4) Upgrade request
// 5) Move request
// 6) Builder / construction timer
// 7) Resource production
// 8) State update push
// ============================================================

const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ============================================================
// TEMP BUILDING LEVEL DATA
// ------------------------------------------------------------
// Bu rəqəmlər hələlik müvəqqətidir.
// Məqsəd:
// - level-based server arxitekturasını oturtmaq
// - sonradan balansı rahat dəyişmək
// ============================================================

const BUILDING_LEVEL_CONFIG = {
  road: {
    levels: [
      {
        buildTimeSeconds: 0,
        cost: [
          { type: "wood", amount: 5 }
        ]
      }
    ]
  },

hq: {
  levels: [
    { buildTimeSeconds: 0, cost: [] }, // starter HQ level 1
    {
      buildTimeSeconds: 30,
      cost: [
        { type: "wood", amount: 200 },
        { type: "water", amount: 50 },
        { type: "money", amount: 150 }
      ]
    },
    {
      buildTimeSeconds: 60,
      cost: [
        { type: "wood", amount: 400 },
        { type: "iron", amount: 150 },
        { type: "money", amount: 300 }
      ]
    },
    {
      buildTimeSeconds: 120,
      cost: [
        { type: "wood", amount: 700 },
        { type: "iron", amount: 350 },
        { type: "fuel", amount: 100 },
        { type: "money", amount: 600 }
      ]
    },
    {
      buildTimeSeconds: 240,
      cost: [
        { type: "wood", amount: 1100 },
        { type: "iron", amount: 600 },
        { type: "fuel", amount: 250 },
        { type: "money", amount: 1000 }
      ]
    },
    {
      buildTimeSeconds: 420,
      cost: [
        { type: "wood", amount: 1600 },
        { type: "iron", amount: 1000 },
        { type: "fuel", amount: 500 },
        { type: "money", amount: 1600 }
      ]
    }
  ]
},

  fighter_camp: {
    levels: [
      {
        buildTimeSeconds: 20,
        cost: [
          { type: "wood", amount: 120 },
          { type: "money", amount: 80 }
        ]
      },
      {
        buildTimeSeconds: 45,
        cost: [
          { type: "wood", amount: 220 },
          { type: "iron", amount: 100 },
          { type: "money", amount: 140 }
        ]
      },
      {
        buildTimeSeconds: 75,
        cost: [
          { type: "wood", amount: 350 },
          { type: "iron", amount: 180 },
          { type: "money", amount: 220 }
        ]
      }
    ]
  },

  shooter_camp: {
    levels: [
      {
        buildTimeSeconds: 20,
        cost: [
          { type: "wood", amount: 120 },
          { type: "money", amount: 80 }
        ]
      },
      {
        buildTimeSeconds: 45,
        cost: [
          { type: "wood", amount: 220 },
          { type: "iron", amount: 100 },
          { type: "money", amount: 140 }
        ]
      },
      {
        buildTimeSeconds: 75,
        cost: [
          { type: "wood", amount: 350 },
          { type: "iron", amount: 180 },
          { type: "money", amount: 220 }
        ]
      }
    ]
  },

  vehicle_factory: {
    levels: [
      {
        buildTimeSeconds: 30,
        cost: [
          { type: "wood", amount: 150 },
          { type: "iron", amount: 120 },
          { type: "money", amount: 120 }
        ]
      },
      {
        buildTimeSeconds: 60,
        cost: [
          { type: "wood", amount: 280 },
          { type: "iron", amount: 220 },
          { type: "money", amount: 220 }
        ]
      },
      {
        buildTimeSeconds: 100,
        cost: [
          { type: "wood", amount: 420 },
          { type: "iron", amount: 340 },
          { type: "money", amount: 340 }
        ]
      }
    ]
  },

  command_center: {
    levels: [
      {
        buildTimeSeconds: 25,
        cost: [
          { type: "wood", amount: 150 },
          { type: "money", amount: 100 }
        ]
      },
      {
        buildTimeSeconds: 55,
        cost: [
          { type: "wood", amount: 260 },
          { type: "iron", amount: 120 },
          { type: "money", amount: 180 }
        ]
      },
      {
        buildTimeSeconds: 90,
        cost: [
          { type: "wood", amount: 400 },
          { type: "iron", amount: 220 },
          { type: "money", amount: 300 }
        ]
      }
    ]
  },

  depot: {
    levels: [
      {
        buildTimeSeconds: 20,
        cost: [
          { type: "wood", amount: 100 },
          { type: "money", amount: 70 }
        ]
      },
      {
        buildTimeSeconds: 40,
        cost: [
          { type: "wood", amount: 180 },
          { type: "iron", amount: 80 },
          { type: "money", amount: 120 }
        ]
      },
      {
        buildTimeSeconds: 70,
        cost: [
          { type: "wood", amount: 300 },
          { type: "iron", amount: 160 },
          { type: "money", amount: 200 }
        ]
      }
    ]
  },

  testbuilding: {
    levels: [
      {
        buildTimeSeconds: 15,
        cost: [
          { type: "wood", amount: 100 },
          { type: "money", amount: 60 }
        ]
      },
      {
        buildTimeSeconds: 30,
        cost: [
          { type: "wood", amount: 180 },
          { type: "iron", amount: 70 },
          { type: "money", amount: 120 }
        ]
      },
      {
        buildTimeSeconds: 50,
        cost: [
          { type: "wood", amount: 260 },
          { type: "iron", amount: 140 },
          { type: "money", amount: 200 }
        ]
      }
    ]
  }
};



// ============================================================
// TECHNOLOGY / INSTITUTE RESEARCH
// ------------------------------------------------------------
// Bu hissə Institute binası üçün server-side research state saxlayır.
// Hazır mərhələdə 3 əsas tech var:
// - rapid_growth      => production bonus
// - build_speed_1     => construction / upgrade speed bonus
// - basic_training    => training speed bonus
// ============================================================

const TECHNOLOGY_DEFINITIONS = {
  rapid_growth: {
    displayName: "Rapid Growth",
    categoryId: "rapid_production",
    maxLevel: 10,
    effectType: "production_pct",
    requiredInstituteLevels: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    researchTimeSeconds:  [60, 90, 120, 180, 240, 300, 420, 540, 660, 780],
    effectValues:         [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    costs: [
      [{ type: "wood", amount: 80 },  { type: "money", amount: 60 }],
      [{ type: "wood", amount: 120 }, { type: "money", amount: 90 }],
      [{ type: "wood", amount: 180 }, { type: "money", amount: 140 }, { type: "iron", amount: 40 }],
      [{ type: "wood", amount: 260 }, { type: "money", amount: 200 }, { type: "iron", amount: 80 }],
      [{ type: "wood", amount: 360 }, { type: "money", amount: 280 }, { type: "iron", amount: 140 }],
      [{ type: "wood", amount: 500 }, { type: "money", amount: 380 }, { type: "iron", amount: 220 }],
      [{ type: "wood", amount: 680 }, { type: "money", amount: 520 }, { type: "iron", amount: 320 }],
      [{ type: "wood", amount: 900 }, { type: "money", amount: 700 }, { type: "iron", amount: 450 }, { type: "fuel", amount: 100 }],
      [{ type: "wood", amount: 1180 }, { type: "money", amount: 920 }, { type: "iron", amount: 620 }, { type: "fuel", amount: 180 }],
      [{ type: "wood", amount: 1500 }, { type: "money", amount: 1200 }, { type: "iron", amount: 820 }, { type: "fuel", amount: 280 }]
    ]
  },
  build_speed_1: {
    displayName: "Build Speed",
    categoryId: "base_development",
    maxLevel: 10,
    effectType: "build_speed_pct",
    requiredInstituteLevels: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    researchTimeSeconds:  [75, 110, 150, 210, 270, 360, 480, 600, 720, 840],
    effectValues:         [3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
    costs: [
      [{ type: "wood", amount: 100 }, { type: "money", amount: 80 }],
      [{ type: "wood", amount: 150 }, { type: "money", amount: 120 }],
      [{ type: "wood", amount: 220 }, { type: "money", amount: 170 }, { type: "iron", amount: 50 }],
      [{ type: "wood", amount: 320 }, { type: "money", amount: 250 }, { type: "iron", amount: 90 }],
      [{ type: "wood", amount: 440 }, { type: "money", amount: 340 }, { type: "iron", amount: 150 }],
      [{ type: "wood", amount: 600 }, { type: "money", amount: 460 }, { type: "iron", amount: 230 }],
      [{ type: "wood", amount: 800 }, { type: "money", amount: 620 }, { type: "iron", amount: 340 }],
      [{ type: "wood", amount: 1040 }, { type: "money", amount: 820 }, { type: "iron", amount: 480 }, { type: "fuel", amount: 120 }],
      [{ type: "wood", amount: 1320 }, { type: "money", amount: 1060 }, { type: "iron", amount: 650 }, { type: "fuel", amount: 220 }],
      [{ type: "wood", amount: 1680 }, { type: "money", amount: 1360 }, { type: "iron", amount: 860 }, { type: "fuel", amount: 340 }]
    ]
  },
  basic_training: {
    displayName: "Basic Training",
    categoryId: "basic_combat",
    maxLevel: 10,
    effectType: "training_speed_pct",
    requiredInstituteLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    researchTimeSeconds:  [90, 130, 180, 240, 320, 420, 540, 660, 780, 900],
    effectValues:         [4, 8, 12, 16, 20, 24, 28, 32, 36, 40],
    costs: [
      [{ type: "wood", amount: 120 }, { type: "money", amount: 100 }],
      [{ type: "wood", amount: 180 }, { type: "money", amount: 150 }, { type: "iron", amount: 40 }],
      [{ type: "wood", amount: 260 }, { type: "money", amount: 220 }, { type: "iron", amount: 80 }],
      [{ type: "wood", amount: 360 }, { type: "money", amount: 300 }, { type: "iron", amount: 130 }],
      [{ type: "wood", amount: 500 }, { type: "money", amount: 420 }, { type: "iron", amount: 200 }],
      [{ type: "wood", amount: 680 }, { type: "money", amount: 560 }, { type: "iron", amount: 290 }],
      [{ type: "wood", amount: 900 }, { type: "money", amount: 740 }, { type: "iron", amount: 400 }],
      [{ type: "wood", amount: 1160 }, { type: "money", amount: 960 }, { type: "iron", amount: 540 }, { type: "fuel", amount: 120 }],
      [{ type: "wood", amount: 1460 }, { type: "money", amount: 1220 }, { type: "iron", amount: 700 }, { type: "fuel", amount: 220 }],
      [{ type: "wood", amount: 1820 }, { type: "money", amount: 1540 }, { type: "iron", amount: 900 }, { type: "fuel", amount: 340 }]
    ]
  }
};

function normalizeBuildingId(id) {
  return String(id || "").trim().toLowerCase();
}

function normalizeResourceKey(type) {
  return String(type || "").trim().toLowerCase();
}

function getBaseTechnologyStats() {
  return {
    productionPct: 0,
    buildSpeedPct: 0,
    trainingSpeedPct: 0
  };
}

function ensureTechnologyObject(state) {
  if (!state || typeof state !== "object") return;

  if (!state.technology || typeof state.technology !== "object") {
    state.technology = {
      levels: {},
      currentResearch: null,
      stats: getBaseTechnologyStats()
    };
  }

  if (!state.technology.levels || typeof state.technology.levels !== "object") {
    state.technology.levels = {};
  }

  if (typeof state.technology.currentResearch !== "object" && state.technology.currentResearch !== null) {
    state.technology.currentResearch = null;
  }

  if (!state.technology.stats || typeof state.technology.stats !== "object") {
    state.technology.stats = getBaseTechnologyStats();
  }

  const baseStats = getBaseTechnologyStats();
  for (const key of Object.keys(baseStats)) {
    if (typeof state.technology.stats[key] !== "number") {
      state.technology.stats[key] = baseStats[key];
    }
  }
}

function getTechnologyDefinition(techId) {
  const id = normalizeBuildingId(techId);
  return TECHNOLOGY_DEFINITIONS[id] || null;
}

function getTechnologyCurrentLevel(state, techId) {
  ensureTechnologyObject(state);
  const id = normalizeBuildingId(techId);
  return Math.max(0, Number(state.technology.levels[id]) || 0);
}

function getTechnologyTargetLevel(state, techId) {
  return getTechnologyCurrentLevel(state, techId) + 1;
}

function getTechnologyLevelData(state, techId) {
  const def = getTechnologyDefinition(techId);
  if (!def) return null;

  const targetLevel = getTechnologyTargetLevel(state, techId);
  if (targetLevel < 1 || targetLevel > Math.max(1, Number(def.maxLevel) || 1)) {
    return null;
  }

  const index = targetLevel - 1;

  return {
    techId: normalizeBuildingId(techId),
    targetLevel,
    displayName: def.displayName || techId,
    categoryId: def.categoryId || "",
    effectType: def.effectType || "",
    effectValue: Math.max(0, Number(def.effectValues?.[index]) || 0),
    requiredInstituteLevel: Math.max(1, Number(def.requiredInstituteLevels?.[index]) || 1),
    researchTimeSeconds: Math.max(0, Number(def.researchTimeSeconds?.[index]) || 0),
    cost: cloneCostArray(def.costs?.[index] || [])
  };
}

function refreshTechnologyStats(state) {
  ensureTechnologyObject(state);

  const stats = getBaseTechnologyStats();

  for (const [rawTechId, rawLevel] of Object.entries(state.technology.levels)) {
    const techId = normalizeBuildingId(rawTechId);
    const currentLevel = Math.max(0, Number(rawLevel) || 0);
    const def = getTechnologyDefinition(techId);
    if (!def || currentLevel <= 0) continue;

    const appliedIndex = Math.min(currentLevel, def.effectValues.length) - 1;
    if (appliedIndex < 0) continue;

    const value = Math.max(0, Number(def.effectValues[appliedIndex]) || 0);

    switch (def.effectType) {
      case "production_pct":
        stats.productionPct += value;
        break;
      case "build_speed_pct":
        stats.buildSpeedPct += value;
        break;
      case "training_speed_pct":
        stats.trainingSpeedPct += value;
        break;
      default:
        break;
    }
  }

  state.technology.stats = stats;
}

function getCompletedInstitute(state) {
  if (!state || !Array.isArray(state.buildings)) return null;

  let best = null;
  for (const building of state.buildings) {
    if (!building) continue;
    if (normalizeBuildingId(building.buildingId) !== "institute") continue;
    if (!building.isCompleted) continue;
    if (building.hasRoadAccess === false) continue;

    if (!best || (Number(building.level) || 1) > (Number(best.level) || 1)) {
      best = building;
    }
  }

  return best;
}

function getAdjustedBuildDurationMs(state, baseBuildTimeSeconds) {
  ensureTechnologyObject(state);
  refreshTechnologyStats(state);

  const rawMs = Math.max(0, Math.round((Number(baseBuildTimeSeconds) || 0) * 1000));
  const speedPct = Math.max(0, Number(state.technology?.stats?.buildSpeedPct) || 0);

  if (rawMs <= 0 || speedPct <= 0) return rawMs;

  return Math.max(1000, Math.round(rawMs * (100 / (100 + speedPct))));
}

function getAdjustedTrainingDurationMs(state, rawDurationMs) {
  ensureTechnologyObject(state);
  refreshTechnologyStats(state);

  const durationMs = Math.max(0, Math.round(Number(rawDurationMs) || 0));
  const speedPct = Math.max(0, Number(state.technology?.stats?.trainingSpeedPct) || 0);

  if (durationMs <= 0 || speedPct <= 0) return durationMs;

  return Math.max(1000, Math.round(durationMs * (100 / (100 + speedPct))));
}

function canStartTechnologyResearch(state, techId) {
  ensureTechnologyObject(state);

  const institute = getCompletedInstitute(state);
  if (!institute) {
    return { ok: false, message: "Completed Institute required" };
  }

  const levelData = getTechnologyLevelData(state, techId);
  if (!levelData) {
    return { ok: false, message: "Technology already at max level or not found" };
  }

  if (state.technology.currentResearch) {
    return { ok: false, message: "Another research is already running" };
  }

  const instituteLevel = Math.max(1, Number(institute.level) || 1);
  if (instituteLevel < levelData.requiredInstituteLevel) {
    return {
      ok: false,
      message: `Institute level ${levelData.requiredInstituteLevel} required`
    };
  }

  const def = getTechnologyDefinition(techId);
  const dependencyList = Array.isArray(def?.requiredTechIds) ? def.requiredTechIds : [];

  for (const depId of dependencyList) {
    const depLevel = getTechnologyCurrentLevel(state, depId);
    if (depLevel <= 0) {
      return {
        ok: false,
        message: `${normalizeBuildingId(depId)} research required`
      };
    }
  }

  const check = hasEnoughResources(state, levelData.cost);
  if (!check.ok) {
    return {
      ok: false,
      message: `Not enough ${check.resource}. Need ${check.need}, have ${check.have}`
    };
  }

  return {
    ok: true,
    institute,
    levelData
  };
}

function startTechnologyResearch(state, techId) {
  const check = canStartTechnologyResearch(state, techId);
  if (!check.ok) return check;

  const now = nowMs();
  const levelData = check.levelData;

  spendResources(state, levelData.cost);

  state.technology.currentResearch = {
    techId: levelData.techId,
    targetLevel: levelData.targetLevel,
    startedAtMs: now,
    durationMs: Math.max(0, Math.round(levelData.researchTimeSeconds * 1000)),
    endsAtMs: now + Math.max(0, Math.round(levelData.researchTimeSeconds * 1000)),
    instituteInstanceId: check.institute.instanceId
  };

  updateServerTime(state);

  return {
    ok: true,
    research: state.technology.currentResearch
  };
}

function completeTechnologyResearchForState(state) {
  ensureTechnologyObject(state);

  const research = state.technology.currentResearch;
  if (!research) return null;

  const now = nowMs();
  if (now < research.endsAtMs) return null;

  const techId = normalizeBuildingId(research.techId);
  state.technology.levels[techId] = Math.max(
    Number(state.technology.levels[techId]) || 0,
    Number(research.targetLevel) || 1
  );

  state.technology.currentResearch = null;
  refreshTechnologyStats(state);
  updateServerTime(state);

  return {
    techId,
    targetLevel: Math.max(1, Number(research.targetLevel) || 1)
  };
}


function ensureResourcesObject(state) {
  if (!state.resources) {
    state.resources = {
      food: 0,
      water: 0,
      wood: 0,
      iron: 0,
      fuel: 0,
      electricity: 0,
      money: 0,
      chips: 0
    };
  }

  const keys = [
    "food",
    "water",
    "wood",
    "iron",
    "fuel",
    "electricity",
    "money",
    "chips"
  ];

  for (const key of keys) {
    if (typeof state.resources[key] !== "number") {
      state.resources[key] = 0;
    }
  }
}

function getBaseResourceCaps() {
  return {
    food: 5000,
    water: 5000,
    wood: 5000,
    iron: 5000,
    fuel: 5000,
    electricity: 5000,
    money: 5000,
    chips: 5000
  };
}

function ensureResourceCapsObject(state) {
  if (!state.resourceCaps || typeof state.resourceCaps !== "object") {
    state.resourceCaps = getBaseResourceCaps();
  }

  const baseCaps = getBaseResourceCaps();
  for (const key of Object.keys(baseCaps)) {
    if (typeof state.resourceCaps[key] !== "number") {
      state.resourceCaps[key] = baseCaps[key];
    }
  }
}

function getStorageRule(buildingId, buildingLevel) {
  const id = normalizeBuildingId(buildingId);
  const level = Math.max(1, Number(buildingLevel) || 1);
  const meta = getDefinitionMeta(id);
  const levelData = getLevelData(id, level);

  if (meta && meta.providesStorage && meta.storageResource) {
    const capacityBonus = Math.max(0, Number(levelData.storageCapacityBonus) || 0);
    if (capacityBonus > 0) {
      return {
        resourceType: meta.storageResource,
        capacityBonus
      };
    }
  }

  function bonusByLevel(level1, level2, level3, level4) {
    if (level <= 1) return level1;
    if (level === 2) return level2;
    if (level === 3) return level3;
    return level4;
  }

  switch (id) {
    case "granary_1":
      return { resourceType: "food", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "granary_2":
      return { resourceType: "food", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "granary_3":
      return { resourceType: "food", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "water_tank_1":
      return { resourceType: "water", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "water_tank_2":
      return { resourceType: "water", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "water_tank_3":
      return { resourceType: "water", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "lumber_warehouse_1":
      return { resourceType: "wood", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "lumber_warehouse_2":
      return { resourceType: "wood", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "lumber_warehouse_3":
      return { resourceType: "wood", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "iron_warehouse_1":
      return { resourceType: "iron", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "iron_warehouse_2":
      return { resourceType: "iron", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "iron_warehouse_3":
      return { resourceType: "iron", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "oil_storage_tank_1":
      return { resourceType: "fuel", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "oil_storage_tank_2":
      return { resourceType: "fuel", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "oil_storage_tank_3":
      return { resourceType: "fuel", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "power_storage_facility_1":
      return { resourceType: "electricity", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "power_storage_facility_2":
      return { resourceType: "electricity", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "power_storage_facility_3":
      return { resourceType: "electricity", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    default:
      return null;
  }
}

function calculateResourceCaps(state) {
  const caps = getBaseResourceCaps();

  if (!state || !Array.isArray(state.buildings)) {
    return caps;
  }

  for (const building of state.buildings) {
    if (!building || !building.isCompleted) continue;

    const rule = getStorageRule(building.buildingId, building.level);
    if (!rule) continue;

    const key = normalizeResourceKey(rule.resourceType);
    const bonus = Math.max(0, Number(rule.capacityBonus) || 0);
    if (!bonus) continue;

    if (typeof caps[key] !== "number") {
      caps[key] = 0;
    }

    caps[key] += bonus;
  }

  return caps;
}

function clampResourcesToCaps(state) {
  if (!state) return;

  ensureResourcesObject(state);
  ensureResourceCapsObject(state);

  for (const [key, cap] of Object.entries(state.resourceCaps)) {
    if (typeof state.resources[key] !== "number") continue;
    if (typeof cap !== "number") continue;
    if (state.resources[key] > cap) {
      state.resources[key] = cap;
    }
  }
}

function refreshResourceCaps(state) {
  if (!state) return;

  ensureResourcesObject(state);
  state.resourceCaps = calculateResourceCaps(state);
  ensureResourceCapsObject(state);
  clampResourcesToCaps(state);
}


function getBaseSpecialStats() {
  return {
    populationCap: 0,
    moneyPerTickBonus: 0,
    chipsPerTickBonus: 0,
    electricityPerTickBonus: 0
  };
}

function ensureSpecialStatsObject(state) {
  if (!state || typeof state !== "object") return;

  if (!state.specialStats || typeof state.specialStats !== "object") {
    state.specialStats = getBaseSpecialStats();
  }

  const base = getBaseSpecialStats();
  for (const key of Object.keys(base)) {
    if (typeof state.specialStats[key] !== "number") {
      state.specialStats[key] = base[key];
    }
  }
}

function getSpecialEffectRule(buildingId, buildingLevel) {
  const id = normalizeBuildingId(buildingId);
  const level = Math.max(1, Number(buildingLevel) || 1);
  const meta = getDefinitionMeta(id);
  const levelData = getLevelData(id, level);

  if (meta && meta.specialEffectType) {
    const specialEffectValue = Math.max(0, Number(levelData.specialEffectValue) || 0);
    if (specialEffectValue > 0) {
      return {
        effectType: meta.specialEffectType,
        value: specialEffectValue
      };
    }
  }

  function amountByLevel(level1, level2, level3, level4) {
    if (level <= 1) return level1;
    if (level === 2) return level2;
    if (level === 3) return level3;
    return level4;
  }

  switch (id) {
    case "house":
      return { effectType: "population_cap", value: amountByLevel(5, 10, 15, 20) };

    case "bank":
      return { effectType: "money_per_tick", value: amountByLevel(5, 8, 12, 16) };

    case "commercial_hub":
      return { effectType: "money_per_tick", value: amountByLevel(8, 12, 18, 26) };

    case "chip_plant":
      return { effectType: "chips_per_tick", value: amountByLevel(1, 2, 3, 5) };

    case "power_plant":
      return { effectType: "electricity_per_tick", value: amountByLevel(8, 14, 22, 32) };

    default:
      return null;
  }
}

function calculateSpecialStats(state) {
  const stats = getBaseSpecialStats();

  if (!state || !Array.isArray(state.buildings)) {
    return stats;
  }

  for (const building of state.buildings) {
    if (!building || !building.isCompleted) continue;
    if (building.hasRoadAccess === false) continue;

    const rule = getSpecialEffectRule(building.buildingId, building.level);
    if (!rule) continue;

    const amount = Math.max(0, Number(rule.value) || 0);
    if (amount <= 0) continue;

    switch (rule.effectType) {
      case "population_cap":
        stats.populationCap += amount;
        break;

      case "money_per_tick":
        stats.moneyPerTickBonus += amount;
        break;

      case "chips_per_tick":
        stats.chipsPerTickBonus += amount;
        break;

      case "electricity_per_tick":
        stats.electricityPerTickBonus += amount;
        break;

      default:
        break;
    }
  }

  return stats;
}

function refreshSpecialStats(state) {
  if (!state || typeof state !== "object") return;

  ensureSpecialStatsObject(state);
  state.specialStats = calculateSpecialStats(state);
  ensureSpecialStatsObject(state);

  if (!state.population || typeof state.population !== "object") {
    state.population = {
      current: 0,
      cap: state.specialStats.populationCap
    };
  } else {
    if (typeof state.population.current !== "number") {
      state.population.current = 0;
    }
    state.population.cap = Math.max(0, Number(state.specialStats.populationCap) || 0);
    if (state.population.current > state.population.cap) {
      state.population.current = state.population.cap;
    }
  }
}

function cloneCostArray(cost) {
  if (!Array.isArray(cost)) return [];
  return cost.map(item => ({
    type: normalizeResourceKey(item.type),
    amount: Math.max(0, Number(item.amount) || 0)
  }));
}

function makeFallbackLevelData(buildingId, targetLevel) {
  const id = normalizeBuildingId(buildingId);
  const lvl = Math.max(1, Number(targetLevel) || 1);

  const baseWood = 100 * lvl;
  const baseMoney = 80 * lvl;
  const baseIron = lvl >= 2 ? 60 * lvl : 0;

  let buildTimeSeconds = 15 + (lvl * 15);

  if (id === "vehicle_factory") buildTimeSeconds += 15;
  if (id === "hq") buildTimeSeconds += 20;
  if (id === "road") buildTimeSeconds = 0;

  const cost = [
    { type: "wood", amount: baseWood },
    { type: "money", amount: baseMoney }
  ];

  if (baseIron > 0) {
    cost.push({ type: "iron", amount: baseIron });
  }

  return {
    buildTimeSeconds,
    productionPerTick: 0,
    storageCapacityBonus: 0,
    cost
  };
}

const HARD_CODED_BUILDING_DEFINITION_META = {
  "alliance_headquarters": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "bank": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "barrack_1": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "barrack_2": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "barrack_3": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "bunker": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "chip_plant": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "clone_center": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "command_center": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "commercial_hub": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "depot": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "embassy": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "farm": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "resource_slot", requiredSlotType: "food", multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "fighter_camp": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "garage_1": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: false, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 1 },
  "garage_2": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: false, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 1 },
  "garage_3": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: false, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 1 },
  "garage_4": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: false, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 1 },
  "garrison": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "granary_1": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "granary_2": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "granary_3": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "heroes_hall": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "hospital": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "house": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "hq": { sizeX: 3, sizeZ: 3, isRoad: false, requiresRoad: false, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 6 },
  "iron_warehouse_1": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "iron_warehouse_2": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "iron_warehouse_3": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "lumber_mill": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "resource_slot", requiredSlotType: "wood", multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "lumber_warehouse_1": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "lumber_warehouse_2": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "lumber_warehouse_3": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "management_station": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "military": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "military_academy": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "oil_storage_tank_1": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "oil_storage_tank_2": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "oil_storage_tank_3": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "oil_well": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "resource_slot", requiredSlotType: "fuel", multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "power_plant": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "power_storage_facility_1": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "power_storage_facility_2": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "power_storage_facility_3": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "radar": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "ration_truck": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "refinery": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "resource_slot", requiredSlotType: "iron", multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 },
  "road": { sizeX: 1, sizeZ: 1, isRoad: true, requiresRoad: false, placementMode: "normal", requiredSlotType: null, multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 1 },
  "shooter_camp": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "testbuilding": { sizeX: 3, sizeZ: 3, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 1 },
  "tower": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "vehicle_factory": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "water_tank_1": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "water_tank_2": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "water_tank_3": { sizeX: 2, sizeZ: 2, isRoad: false, requiresRoad: true, placementMode: "normal", requiredSlotType: null, multiBuild: false, maxPlacedCount: 1, builderSlotsRequired: 1, maxLevel: 4 },
  "water_treatment_plant": { sizeX: 1, sizeZ: 1, isRoad: false, requiresRoad: true, placementMode: "resource_slot", requiredSlotType: "water", multiBuild: true, maxPlacedCount: 0, builderSlotsRequired: 1, maxLevel: 4 }
};


HARD_CODED_BUILDING_DEFINITION_META["institute"] = {
  sizeX: 2,
  sizeZ: 2,
  isRoad: false,
  requiresRoad: true,
  placementMode: "normal",
  requiredSlotType: null,
  multiBuild: false,
  maxPlacedCount: 1,
  builderSlotsRequired: 1,
  maxLevel: 25
};

let EXTERNAL_BUILDING_DEFINITION_META = {};
let EXTERNAL_BUILDING_LEVEL_CONFIG = {};
let EXTERNAL_BUILDING_DEFINITION_SOURCE = null;

function normalizePlacementModeValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "resourceslot" || raw === "resource_slot") {
    return "resource_slot";
  }

  return "normal";
}

function normalizeRequiredSlotTypeValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw || raw === "none") return null;
  if (raw === "wood") return "wood";
  if (raw === "iron") return "iron";
  if (raw === "fuel") return "fuel";
  if (raw === "water") return "water";
  if (raw === "food") return "food";

  return null;
}

function normalizeProducedResourceValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw || raw === "none") return null;
  if (raw === "food") return "food";
  if (raw === "water") return "water";
  if (raw === "wood") return "wood";
  if (raw === "iron") return "iron";
  if (raw === "fuel") return "fuel";
  if (raw === "electricity") return "electricity";
  if (raw === "money") return "money";
  if (raw === "chips" || raw === "chip") return "chips";

  return null;
}


function normalizeSpecialEffectTypeValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw || raw === "none") return null;
  if (raw === "populationcap" || raw === "population_cap" || raw === "population") return "population_cap";
  if (raw === "moneypertick" || raw === "money_per_tick" || raw === "money") return "money_per_tick";
  if (raw === "chipspertick" || raw === "chips_per_tick" || raw === "chips") return "chips_per_tick";
  if (raw === "electricitypertick" || raw === "electricity_per_tick" || raw === "electricity") return "electricity_per_tick";

  return null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
  }
  return fallback;
}

function normalizeUnlockCountStepList(rawSteps) {
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps
    .map(step => ({
      requiredMainBuildingLevel: Math.max(1, Number(step?.requiredMainBuildingLevel) || 1),
      allowedPlacedCount: Math.max(0, Number(step?.allowedPlacedCount) || 0)
    }))
    .filter(step => step.allowedPlacedCount > 0)
    .sort((a, b) => {
      if (a.requiredMainBuildingLevel !== b.requiredMainBuildingLevel) {
        return a.requiredMainBuildingLevel - b.requiredMainBuildingLevel;
      }
      return a.allowedPlacedCount - b.allowedPlacedCount;
    });
}

function coerceDefinitionList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.definitions)) return payload.definitions;
  if (payload && Array.isArray(payload.buildings)) return payload.buildings;
  return null;
}

function createMetaFromDefinition(definition) {
  const id = normalizeBuildingId(definition.id);
  if (!id) return null;

  const explicitMaxLevel = Number(definition.maxLevel);
  const levelsLength = Array.isArray(definition.levels) ? definition.levels.length : 0;

  return {
    sizeX: Math.max(1, Number(definition.sizeX) || 1),
    sizeZ: Math.max(1, Number(definition.sizeZ) || 1),
    isRoad: normalizeBoolean(definition.isRoad, false),
    requiresRoad: normalizeBoolean(definition.requiresRoad, true),
    placementMode: normalizePlacementModeValue(definition.placementMode),
    requiredSlotType: normalizeRequiredSlotTypeValue(definition.requiredResourceSlot),
    multiBuild: normalizeBoolean(definition.multiBuild, false),
    maxPlacedCount: Math.max(0, Number(definition.maxPlacedCount) || 0),
    builderSlotsRequired: Math.max(1, Number(definition.builderSlotsRequired) || 1),
    maxLevel: Math.max(1, explicitMaxLevel || levelsLength || 1),
    requiredMainBuildingLevel: Math.max(0, Number(definition.requiredMainBuildingLevel) || 0),
    requiredDepotLevel: Math.max(0, Number(definition.requiredDepotLevel) || 0),
    requiredBuildingId: normalizeBuildingId(definition.requiredBuildingId || ""),
    requiredBuildingLevel: Math.max(0, Number(definition.requiredBuildingLevel) || 0),
    producesResource: normalizeBoolean(definition.producesResource, false),
    producedResource: normalizeProducedResourceValue(definition.producedResource),
    providesStorage: normalizeBoolean(definition.providesStorage, false),
    storageResource: normalizeProducedResourceValue(definition.storageResource),
    specialEffectType: normalizeSpecialEffectTypeValue(definition.specialEffectType),
    unlockCountByMainBuildingLevel: normalizeUnlockCountStepList(definition.unlockCountByMainBuildingLevel)
  };
}

function createLevelConfigFromDefinition(definition) {
  const id = normalizeBuildingId(definition.id);
  if (!id) return null;
  if (!Array.isArray(definition.levels) || definition.levels.length === 0) return null;

  const sortedLevels = [...definition.levels]
    .map((level, index) => ({
      level: Math.max(1, Number(level.level) || (index + 1)),
      buildTimeSeconds: Math.max(0, Number(level.buildTimeSeconds) || 0),
      productionPerTick: Math.max(0, Number(level.productionPerTick) || 0),
      storageCapacityBonus: Math.max(0, Number(level.storageCapacityBonus) || 0),
      specialEffectValue: Math.max(0, Number(level.specialEffectValue) || 0),
      cost: cloneCostArray(level.cost)
    }))
    .sort((a, b) => a.level - b.level);

  return {
    levels: sortedLevels.map(level => ({
      buildTimeSeconds: level.buildTimeSeconds,
      productionPerTick: level.productionPerTick,
      storageCapacityBonus: level.storageCapacityBonus,
      specialEffectValue: level.specialEffectValue,
      cost: level.cost
    }))
  };
}

function getDefinitionFileCandidates() {
  const cwd = process.cwd();
  const dir = __dirname;

  return Array.from(new Set([
    path.join(cwd, "building_definitions.json"),
    path.join(cwd, "building_definitions_export.json"),
    path.join(cwd, "BuildingDefinitions.json"),
    path.join(dir, "building_definitions.json"),
    path.join(dir, "building_definitions_export.json"),
    path.join(dir, "BuildingDefinitions.json")
  ]));
}

function loadExternalBuildingDefinitions() {
  const candidates = getDefinitionFileCandidates();

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      const definitions = coerceDefinitionList(parsed);

      if (!definitions || definitions.length === 0) {
        console.log("[BUILDING_DEFINITIONS] File found but no definitions array:", filePath);
        continue;
      }

      const nextMeta = {};
      const nextLevelConfig = {};

      for (const definition of definitions) {
        const meta = createMetaFromDefinition(definition);
        if (!meta) continue;

        const id = normalizeBuildingId(definition.id);
        nextMeta[id] = meta;

        const levelConfig = createLevelConfigFromDefinition(definition);
        if (levelConfig) {
          nextLevelConfig[id] = levelConfig;
        }
      }

      EXTERNAL_BUILDING_DEFINITION_META = nextMeta;
      EXTERNAL_BUILDING_LEVEL_CONFIG = nextLevelConfig;
      EXTERNAL_BUILDING_DEFINITION_SOURCE = filePath;

      console.log("[BUILDING_DEFINITIONS] Loaded:", {
        filePath,
        definitionCount: Object.keys(nextMeta).length,
        levelConfigCount: Object.keys(nextLevelConfig).length
      });
      return;
    } catch (error) {
      console.error("[BUILDING_DEFINITIONS] Failed to load file:", filePath, error);
    }
  }

  EXTERNAL_BUILDING_DEFINITION_META = {};
  EXTERNAL_BUILDING_LEVEL_CONFIG = {};
  EXTERNAL_BUILDING_DEFINITION_SOURCE = null;
  console.log("[BUILDING_DEFINITIONS] External file not found. Using hardcoded fallbacks.");
}

function getDefinitionMeta(buildingId) {
  const id = normalizeBuildingId(buildingId);

  const hardcoded = HARD_CODED_BUILDING_DEFINITION_META[id] || null;
  const external = EXTERNAL_BUILDING_DEFINITION_META[id] || null;

  if (hardcoded && external) {
    return { ...hardcoded, ...external };
  }

  return external || hardcoded || null;
}

function getPreviousTierBuildingId(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const match = id.match(/^(.*)_(\d+)$/);

  if (!match) return "";
  const prefix = match[1];
  const tier = Number(match[2]) || 0;

  if (tier <= 1) return "";

  return normalizeBuildingId(`${prefix}_${tier - 1}`);
}

function resolveUnlockRequiredBuildingId(buildingId, meta) {
  const selfId = normalizeBuildingId(buildingId);
  const rawRequired = normalizeBuildingId(meta?.requiredBuildingId || "");

  if (rawRequired && rawRequired !== selfId) {
    return rawRequired;
  }

  const previousTierId = getPreviousTierBuildingId(selfId);
  if (previousTierId) {
    return previousTierId;
  }

  return "";
}

function getUnlockRuleForBuilding(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id) || {};

  const rule = {
    requiredMainBuildingLevel: Math.max(0, Number(meta.requiredMainBuildingLevel) || 0),
    requiredDepotLevel: 0,
    requiredBuildingId: resolveUnlockRequiredBuildingId(id, meta),
    requiredBuildingLevel: Math.max(0, Number(meta.requiredBuildingLevel) || 0)
  };

  if (id === "road") {
    rule.requiredMainBuildingLevel = 0;
    rule.requiredDepotLevel = 0;
    rule.requiredBuildingId = "";
    rule.requiredBuildingLevel = 0;
  }

  return rule;
}

function getHighestCompletedBuildingLevel(state, buildingId) {
  const id = normalizeBuildingId(buildingId);

  if (!state || !Array.isArray(state.buildings)) return 0;

  let highestLevel = 0;

  for (const building of state.buildings) {
    if (!building) continue;
    if (normalizeBuildingId(building.buildingId) !== id) continue;
    if (!building.isCompleted) continue;

    highestLevel = Math.max(highestLevel, Math.max(1, Number(building.level) || 1));
  }

  return highestLevel;
}

function getHighestExistingBuildingLevel(state, buildingId) {
  const id = normalizeBuildingId(buildingId);

  if (!state || !Array.isArray(state.buildings)) return 0;

  let highestLevel = 0;

  for (const building of state.buildings) {
    if (!building) continue;
    if (normalizeBuildingId(building.buildingId) !== id) continue;

    highestLevel = Math.max(highestLevel, Math.max(1, Number(building.level) || 1));
  }

  return highestLevel;
}

function checkUnlockRequirements(state, buildingId) {
  const id = normalizeBuildingId(buildingId);
  const rule = getUnlockRuleForBuilding(id);

  if (!rule) {
    return { ok: true };
  }

  if (rule.requiredMainBuildingLevel > 0) {
    const hqLevel = getHighestExistingBuildingLevel(state, "hq");
    if (hqLevel < rule.requiredMainBuildingLevel) {
      return {
        ok: false,
        message: `HQ level ${rule.requiredMainBuildingLevel} required`
      };
    }
  }

  if (rule.requiredBuildingId) {
    const requiredLevel = Math.max(1, Number(rule.requiredBuildingLevel) || 1);
    const requiredId = normalizeBuildingId(rule.requiredBuildingId);
    const currentLevel =
      requiredId === "hq"
        ? getHighestExistingBuildingLevel(state, "hq")
        : getHighestCompletedBuildingLevel(state, requiredId);

    if (currentLevel < requiredLevel) {
      return {
        ok: false,
        message: `${requiredId} level ${requiredLevel} required`
      };
    }
  }

  return { ok: true };
}

loadExternalBuildingDefinitions();

function getMaxPlacedCountForBuilding(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id);

  if (meta) {
    if (meta.multiBuild) {
      const raw = Number(meta.maxPlacedCount) || 0;
      return raw <= 0 ? Number.POSITIVE_INFINITY : raw;
    }

    const raw = Number(meta.maxPlacedCount) || 1;
    return Math.max(1, raw);
  }

  return 1;
}

function getAllowedPlacedCountForBuilding(state, buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id) || {};
  const absoluteMax = getMaxPlacedCountForBuilding(id);

  if (!Number.isFinite(absoluteMax)) {
    return absoluteMax;
  }

  const steps = Array.isArray(meta.unlockCountByMainBuildingLevel)
    ? meta.unlockCountByMainBuildingLevel
    : [];

  if (steps.length === 0) {
    return absoluteMax;
  }

  const hqLevel = getHighestExistingBuildingLevel(state, "hq");
  let allowed = 0;

  for (const step of steps) {
    const reqLevel = Math.max(1, Number(step.requiredMainBuildingLevel) || 1);
    const stepAllowed = Math.max(0, Number(step.allowedPlacedCount) || 0);

    if (hqLevel >= reqLevel) {
      allowed = Math.max(allowed, stepAllowed);
    }
  }

  return Math.min(absoluteMax, allowed);
}

function getBuilderSlotsRequiredForBuilding(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id);

  if (meta && Number.isFinite(Number(meta.builderSlotsRequired))) {
    return Math.max(1, Number(meta.builderSlotsRequired) || 1);
  }

  return 1;
}

function countPlacedBuildingsOfType(state, buildingId) {
  const id = normalizeBuildingId(buildingId);
  if (!state || !Array.isArray(state.buildings)) return 0;

  return state.buildings.filter(
    (b) => b && normalizeBuildingId(b.buildingId) === id
  ).length;
}

function getNextUnlockCountRequirement(state, buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id) || {};
  const steps = Array.isArray(meta.unlockCountByMainBuildingLevel)
    ? meta.unlockCountByMainBuildingLevel
    : [];

  if (steps.length === 0) return null;

  const hqLevel = getHighestExistingBuildingLevel(state, "hq");
  for (const step of steps) {
    const reqLevel = Math.max(1, Number(step.requiredMainBuildingLevel) || 1);
    if (hqLevel < reqLevel) {
      return {
        requiredMainBuildingLevel: reqLevel,
        allowedPlacedCount: Math.max(0, Number(step.allowedPlacedCount) || 0)
      };
    }
  }

  return null;
}

function getLevelData(buildingId, targetLevel) {
  const id = normalizeBuildingId(buildingId);
  const level = Math.max(1, Number(targetLevel) || 1);

  const cfg = EXTERNAL_BUILDING_LEVEL_CONFIG[id] || BUILDING_LEVEL_CONFIG[id];
  if (cfg && Array.isArray(cfg.levels) && cfg.levels.length > 0) {
    const index = level - 1;

    if (index >= 0 && index < cfg.levels.length) {
      return {
        buildTimeSeconds: Math.max(0, Number(cfg.levels[index].buildTimeSeconds) || 0),
        productionPerTick: Math.max(0, Number(cfg.levels[index].productionPerTick) || 0),
        storageCapacityBonus: Math.max(0, Number(cfg.levels[index].storageCapacityBonus) || 0),
        cost: cloneCostArray(cfg.levels[index].cost)
      };
    }

    const last = cfg.levels[cfg.levels.length - 1];
    return {
      buildTimeSeconds: Math.max(0, Number(last.buildTimeSeconds) || 0),
      productionPerTick: Math.max(0, Number(last.productionPerTick) || 0),
      storageCapacityBonus: Math.max(0, Number(last.storageCapacityBonus) || 0),
      cost: cloneCostArray(last.cost)
    };
  }

  return makeFallbackLevelData(id, level);
}

function getMaxLevelForBuilding(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id);

  if (meta && Number.isFinite(meta.maxLevel)) {
    return Math.max(1, Number(meta.maxLevel) || 1);
  }

  const cfg = EXTERNAL_BUILDING_LEVEL_CONFIG[id] || BUILDING_LEVEL_CONFIG[id];
  if (cfg && Array.isArray(cfg.levels) && cfg.levels.length > 0) {
    return cfg.levels.length;
  }

  return 10;
}

function hasEnoughResources(state, costArray) {
  ensureResourcesObject(state);

  for (const item of costArray || []) {
    const key = normalizeResourceKey(item.type);
    const need = Math.max(0, Number(item.amount) || 0);
    const have = Number(state.resources[key]) || 0;

    if (have < need) {
      return {
        ok: false,
        resource: key,
        need,
        have
      };
    }
  }

  return { ok: true };
}

function spendResources(state, costArray) {
  ensureResourcesObject(state);

  for (const item of costArray || []) {
    const key = normalizeResourceKey(item.type);
    const amount = Math.max(0, Number(item.amount) || 0);
    state.resources[key] = Math.max(0, (Number(state.resources[key]) || 0) - amount);
  }
}

function isGarageBuildingId(buildingId) {
  const id = normalizeBuildingId(buildingId);
  return id === "garage" || id.startsWith("garage_");
}

function isUpgradeDisabledBuildingId(buildingId) {
  const id = normalizeBuildingId(buildingId);

  if (id === "command_center") {
    return true;
  }

  return getMaxLevelForBuilding(id) <= 1;
}

function getCompletedGarageCount(state) {
  if (!state || !Array.isArray(state.buildings)) return 0;

  let count = 0;
  for (const building of state.buildings) {
    if (!building) continue;
    if (!isGarageBuildingId(building.buildingId)) continue;
    if (!building.isCompleted) continue;
    count++;
  }

  return count;
}

function refreshBuilderCapacity(state) {
  if (!state) return;

  if (!state.builders || typeof state.builders !== "object") {
    state.builders = {};
  }

  if (!Array.isArray(state.builders.jobs)) {
    state.builders.jobs = [];
  }

  const baseBuilders = 1;
  const completedGarageCount = getCompletedGarageCount(state);
  const maxBuilders = baseBuilders + completedGarageCount;

  let busyBuilders = 0;
  for (const job of state.builders.jobs) {
    if (!job || job.isCompleted) continue;

    const slots = Math.max(
      1,
      Number(job.builderSlotsRequired) || getBuilderSlotsRequiredForBuilding(job.buildingId)
    );

    busyBuilders += slots;
  }

  const freeBuilders = Math.max(0, maxBuilders - busyBuilders);

  state.builders.baseBuilders = baseBuilders;
  state.builders.completedGarageCount = completedGarageCount;
  state.builders.maxBuilders = maxBuilders;
  state.builders.busyBuilders = busyBuilders;
  state.builders.freeBuilders = freeBuilders;
}

function hasUnfinishedBuildingOfSameType(state, buildingId) {
  if (!state || !Array.isArray(state.buildings)) return false;

  const normalizedId = normalizeBuildingId(buildingId);

  for (const building of state.buildings) {
    if (!building) continue;
    if (normalizeBuildingId(building.buildingId) !== normalizedId) continue;
    if (building.isCompleted) continue;
    return true;
  }

  return false;
}

const PORT = process.env.PORT || 3001;
const players = new Map();
const connections = new Map();

// ============================================================
// BASIC HELPERS
// ============================================================

function nowMs() {
  return Date.now();
}

function safeJsonParse(text) {
  try {
    return [JSON.parse(text), null];
  } catch (e) {
    return [null, e];
  }
}

function send(ws, obj) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(obj));
}

function updateServerTime(state) {
  state.serverTimeUnixMs = nowMs();
}

function makeClientState(state) {
  const clientState = JSON.parse(JSON.stringify(state));

  if (
    clientState.army &&
    clientState.army.trainingQueues &&
    !Array.isArray(clientState.army.trainingQueues)
  ) {
    clientState.army.trainingQueues = Object.values(clientState.army.trainingQueues);
  }

  return clientState;
}

function pushStateToPlayerConnections(playerId, state) {
  refreshResourceCaps(state);
  refreshSpecialStats(state);
  ensureTechnologyObject(state);
  refreshTechnologyStats(state);
  const clientState = makeClientState(state);

  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (client._authedPlayerId !== playerId) return;

    send(client, {
      type: "state",
      playerId: playerId,
      serverTimeUnixMs: nowMs(),
      payloadJson: JSON.stringify(clientState)
    });
  });
}



//////////////////////////////////////////////////////////////////////
// ============================================================
// DEFAULT PLAYER STATE
// ------------------------------------------------------------
// Layout:
// R R R R R
// R H H H R
// R H H H R
// R H H H R
// R R R R R
//
// H = HQ (3x3)
// R = Road (1x1, fixed)
// ============================================================

function createStarterRoadRing(playerId, hqX, hqZ, hqSizeX, hqSizeZ) {
  const roads = [];

  const minRoadX = hqX - 1;
  const maxRoadX = hqX + hqSizeX;
  const minRoadZ = hqZ - 1;
  const maxRoadZ = hqZ + hqSizeZ;

  roads.push({ instanceId: "road_tl_" + playerId, buildingId: "road", x: minRoadX,     z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_t1_" + playerId, buildingId: "road", x: minRoadX + 1, z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_t2_" + playerId, buildingId: "road", x: minRoadX + 2, z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_t3_" + playerId, buildingId: "road", x: minRoadX + 3, z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_tr_" + playerId, buildingId: "road", x: maxRoadX,     z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });

  roads.push({ instanceId: "road_bl_" + playerId, buildingId: "road", x: minRoadX,     z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_b1_" + playerId, buildingId: "road", x: minRoadX + 1, z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_b2_" + playerId, buildingId: "road", x: minRoadX + 2, z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_b3_" + playerId, buildingId: "road", x: minRoadX + 3, z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_br_" + playerId, buildingId: "road", x: maxRoadX,     z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });

  roads.push({ instanceId: "road_l1_" + playerId, buildingId: "road", x: minRoadX, z: hqZ,     level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_l2_" + playerId, buildingId: "road", x: minRoadX, z: hqZ + 1, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_l3_" + playerId, buildingId: "road", x: minRoadX, z: hqZ + 2, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });

  roads.push({ instanceId: "road_r1_" + playerId, buildingId: "road", x: maxRoadX, z: hqZ,     level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_r2_" + playerId, buildingId: "road", x: maxRoadX, z: hqZ + 1, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_r3_" + playerId, buildingId: "road", x: maxRoadX, z: hqZ + 2, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });

  return roads;
}

function createStarterLayout(playerId) {
  // Start block artıq 8x8-dir: 0..7
  const baseWidth = 8;
  const baseHeight = 8;

  // HQ 3x3 qalır
  const hqSizeX = 3;
  const hqSizeZ = 3;

  // 3x3 HQ + ətraf 1-cell road ring = 5x5 yer tutur
  // 8x8 block içinə rahat sığması üçün HQ-nu (2,2)-dən başlayırıq.
  // Bu halda road ring 1..5 aralığında qalır.
  const hqX = 3;
  const hqZ = 2;

  const hq = {
    instanceId: "hq_" + playerId,
    buildingId: "hq",
    x: hqX,
    z: hqZ,
    level: 1,
    isCompleted: true,
    buildFinishTimeMs: 0,
    isFixed: true,
    hasRoadAccess: true
  };

  console.log("[SERVER_STARTER_HQ]", {
    playerId,
    x: hq.x,
    z: hq.z,
    hqSizeX,
    hqSizeZ,
    baseWidth,
    baseHeight
  });

  const roads = createStarterRoadRing(playerId, hqX, hqZ, hqSizeX, hqSizeZ);

  return {
    hq,
    roads
  };
}

function makeDefaultState(playerId) {
  const starterLayout = createStarterLayout(playerId);

  return {
    playerId: playerId,
    serverTimeUnixMs: nowMs(),

    resources: {
      food: 500,
      water: 500,
      wood: 500,
      iron: 500,
      fuel: 500,
      electricity: 500,
      money: 500,
      chips: 500
    },

    resourceCaps: getBaseResourceCaps(),
    specialStats: getBaseSpecialStats(),
    population: {
      current: 0,
      cap: getBaseSpecialStats().populationCap
    },

    technology: {
      levels: {},
      currentResearch: null,
      stats: getBaseTechnologyStats()
    },

    map: {
      // Hələlik ümumi map ölçüsünü saxlayırıq ki digər sistemlər qırılmasın
      fullWidth: 40,
      fullHeight: 40,

      // Start block artıq 8x8-dir
      unlockedMinX: 0,
      unlockedMaxX: 7,
      unlockedMinZ: 0,
      unlockedMaxZ: 7,

      // Başlanğıcda yalnız bir block açıqdır
      unlockedBlocks: ["0,0"]
    },

    buildings: [
      starterLayout.hq,
      ...starterLayout.roads
    ],

    inventory: [],

    builders: {
      baseBuilders: 1,
      completedGarageCount: 0,
      maxBuilders: 1,
      busyBuilders: 0,
      freeBuilders: 1,
      jobs: []
    }
  };
}

function getOrCreatePlayerState(playerId) {
  if (!players.has(playerId)) {
    const newState = makeDefaultState(playerId);

    ensureMapState(newState);
    refreshRoadAccessForBuildings(newState);
    refreshBuilderCapacity(newState);
    refreshResourceCaps(newState);
    refreshSpecialStats(newState);
    ensureTechnologyObject(newState);
    refreshTechnologyStats(newState);

    players.set(playerId, newState);
  }

  const state = players.get(playerId);

  ensureMapState(state);
  refreshRoadAccessForBuildings(state);
  refreshBuilderCapacity(state);
  refreshResourceCaps(state);
  refreshSpecialStats(state);
  ensureTechnologyObject(state);
  refreshTechnologyStats(state);

  return state;
}

// ============================================================
// BUILD / UPGRADE / PRODUCTION RULES
// ============================================================

function hasFreeBuilder(state, buildingId) {
  refreshBuilderCapacity(state);

  if (!state || !state.builders) return false;
  if (!Array.isArray(state.builders.jobs)) return false;

  const requiredSlots = Math.max(
    1,
    Number(getBuilderSlotsRequiredForBuilding(buildingId)) || 1
  );

  return (Number(state.builders.freeBuilders) || 0) >= requiredSlots;
}

function makeRoadKey(x, z) {
  return `${x},${z}`;
}

function getOrthogonalNeighbors(x, z) {
  return [
    { x: x,     z: z + 1 },
    { x: x + 1, z: z     },
    { x: x,     z: z - 1 },
    { x: x - 1, z: z     }
  ];
}

function rebuildBlockedCellCache(state) {
  const blocked = new Set();

  if (!state) {
    return blocked;
  }

  // --------------------------------------------------------
  // BİNALAR
  // Road path üçün road-un özü blok sayılmır,
  // amma digər binalar blok sayılır.
  // --------------------------------------------------------
  if (Array.isArray(state.buildings)) {
    for (const b of state.buildings) {
      if (!b) continue;

      const id = normalizeBuildingId(b.buildingId);
      if (id === "road") continue;

      const rules = getBuildingRules(b.buildingId);
      if (!rules) continue;

      for (let dx = 0; dx < rules.sizeX; dx++) {
        for (let dz = 0; dz < rules.sizeZ; dz++) {
          blocked.add(makeRoadKey(b.x + dx, b.z + dz));
        }
      }
    }
  }

  // --------------------------------------------------------
  // RESOURCE NODE MƏRKƏZLƏRİ
  // Yol node-un özündən keçməsin
  // --------------------------------------------------------
  if (Array.isArray(state.resourceNodes)) {
    for (const node of state.resourceNodes) {
      if (!node) continue;
      blocked.add(makeRoadKey(node.x, node.z));
    }
  }

  // --------------------------------------------------------
  // BÜTÜN RESOURCE SLOTLAR
  // Boş slot olsa belə road onun üstündən keçməsin
  // --------------------------------------------------------
  if (Array.isArray(state.resourceSlots)) {
    for (const slot of state.resourceSlots) {
      if (!slot) continue;
      blocked.add(makeRoadKey(slot.x, slot.z));
    }
  }

  state.cachedBlockedCells = blocked;
  return blocked;
}

function getBlockedCellKeys(state, options = {}) {
  if (!state.cachedBlockedCells) {
    rebuildBlockedCellCache(state);
  }

  const ignoreBuildingInstanceId = options.ignoreBuildingInstanceId || null;

  if (!ignoreBuildingInstanceId) {
    return state.cachedBlockedCells;
  }

  const blocked = new Set(state.cachedBlockedCells);

  for (const b of state.buildings) {
    if (!b) continue;
    if (b.instanceId !== ignoreBuildingInstanceId) continue;

    const rules = getBuildingRules(b.buildingId);
    if (!rules) continue;

    for (let dx = 0; dx < rules.sizeX; dx++) {
      for (let dz = 0; dz < rules.sizeZ; dz++) {
        blocked.delete(makeRoadKey(b.x + dx, b.z + dz));
      }
    }
  }

  return blocked;
}

function getConnectedRoadStartCells(state) {
  const connectedRoadKeys = getConnectedRoadKeys(state);
  const starts = [];

  for (const key of connectedRoadKeys) {
    const parts = key.split(",");
    starts.push({
      x: parseInt(parts[0], 10),
      z: parseInt(parts[1], 10)
    });
  }

  return starts;
}

function isWalkableCell(state, x, z, blockedKeys) {
  if (!isCellInsideUnlockedBlocks(state, x, z))
    return false;

  const key = makeRoadKey(x, z);
  return !blockedKeys.has(key);
}


/////////////////////////////////////////////////////////////////////


function debugConnectRoadPreparation(state, buildingInstanceId) {
  if (!state || !Array.isArray(state.buildings)) {
    return null;
  }

  const building = state.buildings.find(
    (b) => b && b.instanceId === buildingInstanceId
  );

  if (!building) {
    return null;
  }

  const startCells = getConnectedRoadStartCells(state);
const rawTargetCells = getBuildingPerimeterTargetCells(building);

const targetCells = rawTargetCells.filter(c =>
  isCellInsideUnlockedBlocks(state, c.x, c.z) &&
  !isReservedResourceCell(state, c.x, c.z)
);

  const blockedKeys = getBlockedCellKeys(state, {
    ignoreBuildingInstanceId: null
  });

  console.log("[ROAD_DEBUG]", {
    unlockedBlocks: state.map?.unlockedBlocks,
    startCellsCount: startCells.length,
    rawTargetCellsCount: rawTargetCells.length,
    targetCellsCount: targetCells.length
  });

  return {
    startCells,
    targetCells,
    blockedCount: blockedKeys.size
  };
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function findRoadPathAStar(state, buildingInstanceId) {
  const prep = debugConnectRoadPreparation(state, buildingInstanceId);
  if (!prep) return null;

  const { startCells, targetCells } = prep;
  const blockedKeys = getBlockedCellKeys(state);

  if (!Array.isArray(startCells) || startCells.length === 0) return null;
  if (!Array.isArray(targetCells) || targetCells.length === 0) return null;

  const validTargetCells = targetCells.filter(c =>
    isCellInsideUnlockedBlocks(state, c.x, c.z)
  );

  if (validTargetCells.length === 0) return null;

  const targetKeySet = new Set(
    validTargetCells.map((c) => makeRoadKey(c.x, c.z))
  );

  const cameFrom = new Map();
  const gScore = new Map();
  const visited = new Set();
  const openHeap = [];

  function compareNodes(a, b) {
    if (a.f !== b.f) return a.f - b.f;
    return a.h - b.h;
  }

  function heapPush(node) {
    openHeap.push(node);

    let index = openHeap.length - 1;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (compareNodes(openHeap[index], openHeap[parentIndex]) >= 0)
        break;

      const tmp = openHeap[index];
      openHeap[index] = openHeap[parentIndex];
      openHeap[parentIndex] = tmp;

      index = parentIndex;
    }
  }

  function heapPop() {
    if (openHeap.length === 0) return null;

    const best = openHeap[0];
    const last = openHeap.pop();

    if (openHeap.length > 0 && last) {
      openHeap[0] = last;

      let index = 0;

      while (true) {
        const left = index * 2 + 1;
        const right = index * 2 + 2;
        let smallest = index;

        if (
          left < openHeap.length &&
          compareNodes(openHeap[left], openHeap[smallest]) < 0
        ) {
          smallest = left;
        }

        if (
          right < openHeap.length &&
          compareNodes(openHeap[right], openHeap[smallest]) < 0
        ) {
          smallest = right;
        }

        if (smallest === index)
          break;

        const tmp = openHeap[index];
        openHeap[index] = openHeap[smallest];
        openHeap[smallest] = tmp;

        index = smallest;
      }
    }

    return best;
  }

  for (const start of startCells) {
    const startKey = makeRoadKey(start.x, start.z);
    gScore.set(startKey, 0);

    let bestH = Infinity;
    for (const t of validTargetCells) {
      const h = manhattan(start, t);
      if (h < bestH) bestH = h;
    }

    heapPush({
      x: start.x,
      z: start.z,
      g: 0,
      h: bestH,
      f: bestH
    });
  }

  while (openHeap.length > 0) {
    const current = heapPop();
    if (!current) break;

    const currentKey = makeRoadKey(current.x, current.z);

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    if (targetKeySet.has(currentKey)) {
      const path = [];
      let traceKey = currentKey;

      while (traceKey) {
        const parts = traceKey.split(",");
        path.push({
          x: parseInt(parts[0], 10),
          z: parseInt(parts[1], 10)
        });

        traceKey = cameFrom.get(traceKey) || null;
      }

      path.reverse();
      return path;
    }

    const neighbors = getOrthogonalNeighbors(current.x, current.z);

    for (const n of neighbors) {
      const neighborKey = makeRoadKey(n.x, n.z);

      if (visited.has(neighborKey)) continue;

      const isTarget = targetKeySet.has(neighborKey);
      const walkable = isWalkableCell(state, n.x, n.z, blockedKeys);

      if (!walkable && !isTarget) continue;

      const tentativeG = current.g + 1;
      const knownG = gScore.has(neighborKey) ? gScore.get(neighborKey) : Infinity;

      if (tentativeG >= knownG) continue;

      cameFrom.set(neighborKey, currentKey);
      gScore.set(neighborKey, tentativeG);

      let bestH = Infinity;
      for (const t of validTargetCells) {
        const h = manhattan(n, t);
        if (h < bestH) bestH = h;
      }

      heapPush({
        x: n.x,
        z: n.z,
        g: tentativeG,
        h: bestH,
        f: tentativeG + bestH
      });
    }
  }

  return null;
}

function createRoadsAlongPath(state, path) {
  if (!state || !Array.isArray(state.buildings)) return [];
  if (!Array.isArray(path) || path.length === 0) return [];

  const created = [];
  const occupiedRoadKeys = new Set();

  for (const b of state.buildings) {
    if (!b) continue;
    if (normalizeBuildingId(b.buildingId) !== "road") continue;

    occupiedRoadKeys.add(makeRoadKey(b.x, b.z));
  }

  for (const cell of path) {
    const key = makeRoadKey(cell.x, cell.z);

    if (occupiedRoadKeys.has(key)) continue;

    const road = {
      instanceId: crypto.randomBytes(8).toString("hex"),
      buildingId: "road",
      x: cell.x,
      z: cell.z,
      level: 1,
      isCompleted: true,
      buildFinishTimeMs: 0,
      isFixed: false,
      hasRoadAccess: true
    };

    state.buildings.push(road);
    occupiedRoadKeys.add(key);
    created.push(road);
  }

  updateServerTime(state);
  return created;
}

function getProductionRule(buildingId, buildingLevel) {
  const id = normalizeBuildingId(buildingId);
  const level = Math.max(1, Number(buildingLevel) || 1);
  const meta = getDefinitionMeta(id);
  const levelData = getLevelData(id, level);

  if (meta && meta.producesResource && meta.producedResource) {
    const amountPerTick = Math.max(0, Number(levelData.productionPerTick) || 0);
    if (amountPerTick > 0) {
      return {
        resourceType: meta.producedResource,
        amountPerTick
      };
    }
  }

  function amountByLevel(level1, level2, level3) {
    if (level <= 1) return level1;
    if (level === 2) return level2;
    return level3;
  }

  switch (id) {
    case "testbuilding":
      return {
        resourceType: "food",
        amountPerTick: amountByLevel(5, 8, 12)
      };

    case "farm":
    case "food":
      return {
        resourceType: "food",
        amountPerTick: amountByLevel(10, 16, 24)
      };

    case "water_treatment_plant":
    case "water":
      return {
        resourceType: "water",
        amountPerTick: amountByLevel(8, 14, 20)
      };

    case "lumber_mill":
    case "wood":
    case "sawmill":
      return {
        resourceType: "wood",
        amountPerTick: amountByLevel(12, 20, 30)
      };

    case "refinery":
    case "iron":
      return {
        resourceType: "iron",
        amountPerTick: amountByLevel(8, 14, 22)
      };

    case "oil_well":
    case "fuel":
      return {
        resourceType: "fuel",
        amountPerTick: amountByLevel(6, 10, 16)
      };

    case "power_plant":
    case "powerplant":
      return {
        resourceType: "electricity",
        amountPerTick: amountByLevel(5, 9, 14)
      };

    case "bank":
    case "commercial_hub":
    case "money":
      return {
        resourceType: "money",
        amountPerTick: amountByLevel(10, 18, 28)
      };

    case "chip_plant":
    case "chip_factory":
    case "chips":
      return {
        resourceType: "chips",
        amountPerTick: amountByLevel(2, 4, 7)
      };

    default:
      return null;
  }
}

function processProductionForState(state) {
  if (!state || !Array.isArray(state.buildings)) return false;

  ensureResourcesObject(state);
  refreshResourceCaps(state);
  refreshSpecialStats(state);
  ensureTechnologyObject(state);
  refreshTechnologyStats(state);

  let changed = false;

  for (const building of state.buildings) {
    if (!building) continue;

    // Yalnız tamamlanmış bina istehsal edir
    if (!building.isCompleted) continue;

    // Yoldan ayrılmış bina istehsal etməsin
    if (building.hasRoadAccess === false) continue;

    const level = Math.max(1, Number(building.level) || 1);
    const rule = getProductionRule(building.buildingId, level);

    if (!rule) continue;

    const key = rule.resourceType;
    if (typeof state.resources[key] !== "number") continue;

    const baseAmount = Math.max(0, Number(rule.amountPerTick) || 0);
    const productionPct = Math.max(0, Number(state.technology?.stats?.productionPct) || 0);
    const addAmount = Math.max(0, Math.floor(baseAmount * (100 + productionPct) / 100));
    if (addAmount <= 0) continue;

    const cap = typeof state.resourceCaps?.[key] === "number"
      ? state.resourceCaps[key]
      : Number.POSITIVE_INFINITY;

    const before = Number(state.resources[key]) || 0;
    const after = Math.min(cap, before + addAmount);

    if (after !== before) {
      state.resources[key] = after;
      changed = true;
    }
  }

  const specialTickBonuses = [
    { key: "money", amount: Math.max(0, Number(state.specialStats?.moneyPerTickBonus) || 0) },
    { key: "chips", amount: Math.max(0, Number(state.specialStats?.chipsPerTickBonus) || 0) },
    { key: "electricity", amount: Math.max(0, Number(state.specialStats?.electricityPerTickBonus) || 0) }
  ];

  for (const bonus of specialTickBonuses) {
    if (bonus.amount <= 0) continue;
    if (typeof state.resources[bonus.key] !== "number") continue;

    const cap = typeof state.resourceCaps?.[bonus.key] === "number"
      ? state.resourceCaps[bonus.key]
      : Number.POSITIVE_INFINITY;

    const before = Number(state.resources[bonus.key]) || 0;
    const after = Math.min(cap, before + bonus.amount);

    if (after !== before) {
      state.resources[bonus.key] = after;
      changed = true;
    }
  }

  if (changed) {
    updateServerTime(state);
  }

  return changed;
}

function processProductionForAllPlayers() {
  for (const [playerId, state] of players) {
    const changed = processProductionForState(state);

    if (changed) {
      pushStateToPlayerConnections(playerId, state);
      console.log("[SERVER] Production pushed for player:", playerId);
    }
  }
}

// ============================================================
// BUILDING RULES
// ============================================================

function getBuildingRules(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id);

  if (meta) {
    return {
      sizeX: Math.max(1, Number(meta.sizeX) || 1),
      sizeZ: Math.max(1, Number(meta.sizeZ) || 1),
      isRoad: !!meta.isRoad,
      requiresRoad: !!meta.requiresRoad,
      placementMode: meta.placementMode === "resource_slot" ? "resource_slot" : "normal",
      requiredSlotType: meta.requiredSlotType ? normalizeResourceKey(meta.requiredSlotType) : null
    };
  }

  switch (id) {
    case "water":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "water"
      };

    case "wood":
    case "sawmill":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "wood"
      };

    case "iron":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "iron"
      };

    case "fuel":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "fuel"
      };

    case "food":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "food"
      };

    default:
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "normal",
        requiredSlotType: null
      };
  }
}


///////////////////////////////////////////////////


// ============================================================
// ROAD NETWORK HELPERS
// ============================================================

const buildingPerimeterOffsetCache = new Map();

function getPerimeterOffsets(sizeX, sizeZ) {
  const cacheKey = `${sizeX}x${sizeZ}`;

  if (buildingPerimeterOffsetCache.has(cacheKey)) {
    return buildingPerimeterOffsetCache.get(cacheKey);
  }

  const offsets = [];

  for (let dz = 0; dz < sizeZ; dz++) offsets.push({ dx: -1, dz: dz });
  for (let dz = 0; dz < sizeZ; dz++) offsets.push({ dx: sizeX, dz: dz });
  for (let dx = 0; dx < sizeX; dx++) offsets.push({ dx: dx, dz: -1 });
  for (let dx = 0; dx < sizeX; dx++) offsets.push({ dx: dx, dz: sizeZ });

  buildingPerimeterOffsetCache.set(cacheKey, offsets);
  return offsets;
}

function getBuildingPerimeterTargetCells(building) {
  const result = [];

  if (!building) return result;

  const rules = getBuildingRules(building.buildingId);
  if (!rules) return result;

  const offsets = getPerimeterOffsets(rules.sizeX, rules.sizeZ);

  for (const o of offsets) {
    result.push({
      x: building.x + o.dx,
      z: building.z + o.dz
    });
  }

  return result;
}

function getConnectedRoadKeys(state) {
  const connected = new Set();

  if (!state || !Array.isArray(state.buildings))
    return connected;

  const roadMap = new Map();

  for (const b of state.buildings) {
    if (!b) continue;
    if (normalizeBuildingId(b.buildingId) !== "road") continue;

    const key = makeRoadKey(b.x, b.z);
    roadMap.set(key, b);
  }

  const queue = [];

  for (const b of state.buildings) {
    if (!b) continue;
    if (normalizeBuildingId(b.buildingId) !== "road") continue;
    if (!b.isFixed) continue;

    const key = makeRoadKey(b.x, b.z);

    connected.add(key);
    queue.push({ x: b.x, z: b.z });
  }

  if (queue.length === 0)
    return connected;

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = getOrthogonalNeighbors(current.x, current.z);

    for (const n of neighbors) {
      const key = makeRoadKey(n.x, n.z);

      if (!roadMap.has(key)) continue;
      if (connected.has(key)) continue;

      connected.add(key);
      queue.push({ x: n.x, z: n.z });
    }
  }

  return connected;
}

function refreshRoadAccessForBuildings(state) {
  if (!state || !Array.isArray(state.buildings)) return;

  for (const b of state.buildings) {
    if (!b) continue;

    const id = normalizeBuildingId(b.buildingId);

    if (id === "hq") {
      b.hasRoadAccess = true;
      continue;
    }

    if (id === "road") {
      b.hasRoadAccess = true;
      continue;
    }

    b.hasRoadAccess = hasAdjacentConnectedRoad(state, b.buildingId, b.x, b.z);

    console.log(
      "[ROAD_ACCESS]",
      b.buildingId,
      "at",
      b.x,
      b.z,
      "=>",
      b.hasRoadAccess
    );
  }
}

function rectanglesOverlap(ax, az, aw, ah, bx, bz, bw, bh) {
  return (
    ax < bx + bw &&
    ax + aw > bx &&
    az < bz + bh &&
    az + ah > bz
  );
}

// ============================================================
// MAP / RESOURCE SLOT HELPERS
// ============================================================

function isInsideUnlockedArea(state, x, z, sizeX, sizeZ) {
  if (!state.map) return true;

  const minX = state.map.unlockedMinX;
  const maxX = state.map.unlockedMaxX;
  const minZ = state.map.unlockedMinZ;
  const maxZ = state.map.unlockedMaxZ;

  const insideX = x >= minX && x + sizeX - 1 <= maxX;
  const insideZ = z >= minZ && z + sizeZ - 1 <= maxZ;

  return insideX && insideZ;
}

// ============================================================
// RESOURCE NODE / SLOT SYSTEM
// ------------------------------------------------------------
// QAYDA:
// 1 resource node = 4 buildable slots
//
// Node-lar həm başlanğıc açıq sahədə,
// həm də gələcəkdə açılacaq locked block-larda ola bilər.
// ============================================================

function getBlockKeyFromCell(x, z, blockSize = 20) {
  const blockX = Math.floor(x / blockSize);
  const blockZ = Math.floor(z / blockSize);
  return `${blockX},${blockZ}`;
}

function makeResourceSlot(slotId, type, x, z, nodeId) {
  return {
    id: slotId,
    type: String(type || "").trim().toLowerCase(),
    x: x,
    z: z,
    nodeId: nodeId,
    blockKey: getBlockKeyFromCell(x, z),
    occupied: false,
    occupiedByInstanceId: null
  };
}

function createResourceNodeCluster(nodeId, type, nodeX, nodeZ, slotCells) {
  const normalizedType = String(type || "").trim().toLowerCase();

  const slots = slotCells.map((cell, index) =>
    makeResourceSlot(
      `${nodeId}_slot_${index + 1}`,
      normalizedType,
      cell.x,
      cell.z,
      nodeId
    )
  );

  return {
    id: nodeId,
    type: normalizedType,
    x: nodeX,
    z: nodeZ,
    blockKey: getBlockKeyFromCell(nodeX, nodeZ),
    slots: slots
  };
}

function createDefaultResourceNodes() {
  return [
    // ========================================================
    // WATER
    // ========================================================
    createResourceNodeCluster(
      "water_node_a",
      "water",
      1, 12,
      [
        { x: 1, z: 13 }, // top
        { x: 0, z: 12 }, // left
        { x: 2, z: 12 }, // right
        { x: 1, z: 11 }  // bottom
      ]
    ),

    createResourceNodeCluster(
      "water_node_b",
      "water",
      4, 21,
      [
        { x: 4, z: 22 }, // top
        { x: 3, z: 21 }, // left
        { x: 5, z: 21 }, // right
        { x: 4, z: 20 }  // bottom
      ]
    ),

    // ========================================================
    // FUEL
    // ========================================================
    createResourceNodeCluster(
      "fuel_node_a",
      "fuel",
      6, 9,
      [
        { x: 6, z: 10 }, // top
        { x: 5, z: 9 },  // left
        { x: 7, z: 9 },  // right
        { x: 6, z: 8 }   // bottom
      ]
    ),

    createResourceNodeCluster(
      "fuel_node_b",
      "fuel",
      13, 5,
      [
        { x: 13, z: 6 }, // top
        { x: 12, z: 5 }, // left
        { x: 14, z: 5 }, // right
        { x: 13, z: 4 }  // bottom
      ]
    ),

    // ========================================================
    // IRON
    // ========================================================
    createResourceNodeCluster(
      "iron_node_a",
      "iron",
      -3, -3,
      [
        { x: -3, z: -2 }, // top
        { x: -4, z: -3 }, // left
        { x: -2, z: -3 }, // right
        { x: -3, z: -4 }  // bottom
      ]
    ),

    createResourceNodeCluster(
      "iron_node_b",
      "iron",
      4, -5,
      [
        { x: 4, z: -4 }, // top
        { x: 3, z: -5 }, // left
        { x: 5, z: -5 }, // right
        { x: 4, z: -6 }  // bottom
      ]
    ),

    // ========================================================
    // WOOD
    // ========================================================
    createResourceNodeCluster(
      "wood_node_a",
      "wood",
      -7, 14,
      [
        { x: -7, z: 15 }, // top
        { x: -8, z: 14 }, // left
        { x: -6, z: 14 }, // right
        { x: -7, z: 13 }  // bottom
      ]
    ),

    createResourceNodeCluster(
      "wood_node_b",
      "wood",
      -15, 22,
      [
        { x: -15, z: 23 }, // top
        { x: -16, z: 22 }, // left
        { x: -14, z: 22 }, // right
        { x: -15, z: 21 }  // bottom
      ]
    ),

    // ========================================================
    // FOOD
    // ========================================================
    createResourceNodeCluster(
      "food_node_a",
      "food",
      -3, 10,
      [
        { x: -3, z: 11 }, // top
        { x: -4, z: 10 }, // left
        { x: -2, z: 10 }, // right
        { x: -3, z: 9 }   // bottom
      ]
    ),

    createResourceNodeCluster(
      "food_node_b",
      "food",
      -20, 20,
      [
        { x: -20, z: 21 }, // top
        { x: -21, z: 20 }, // left
        { x: -19, z: 20 }, // right
        { x: -20, z: 19 }  // bottom
      ]
    )
  ];
}

function createDefaultResourceSlots(resourceNodes = null) {
  const nodes = Array.isArray(resourceNodes) ? resourceNodes : createDefaultResourceNodes();
  const slots = [];

  for (const node of nodes) {
    if (!node || !Array.isArray(node.slots)) continue;

    for (const slot of node.slots) {
      slots.push({
        id: slot.id,
        type: slot.type,
        x: slot.x,
        z: slot.z,
        nodeId: slot.nodeId,
        blockKey: slot.blockKey,
        occupied: false,
        occupiedByInstanceId: null
      });
    }
  }

  return slots;
}






function getResourceSlotsInArea(state, x, z, sizeX, sizeZ) {
  if (!state || !Array.isArray(state.resourceSlots)) return [];

  const result = [];

  for (const slot of state.resourceSlots) {
    if (!slot) continue;

    const insideX = slot.x >= x && slot.x < x + sizeX;
    const insideZ = slot.z >= z && slot.z < z + sizeZ;

    if (insideX && insideZ) {
      result.push(slot);
    }
  }

  return result;
}

function syncResourceSlotOccupancy(state) {
  if (!state || !Array.isArray(state.resourceSlots)) return;

  // əvvəl hamısını boşalt
  for (const slot of state.resourceSlots) {
    if (!slot) continue;
    slot.occupied = false;
    slot.occupiedByInstanceId = null;
  }

  if (!Array.isArray(state.buildings)) return;

  // sonra resource-slot binalarına görə yenidən doldur
  for (const building of state.buildings) {
    if (!building) continue;

    const rules = getBuildingRules(building.buildingId);
    if (!rules) continue;

    if (rules.placementMode !== "resource_slot")
      continue;

    // hazırda resource bina 1x1 qəbul edilir
    const slot = getResourceSlotAt(state, building.x, building.z);
    if (!slot) continue;

    slot.occupied = true;
    slot.occupiedByInstanceId = building.instanceId || null;
  }
}

function ensureMapState(state) {
  if (!state.map) state.map = {};

  // Start block artıq 8x8-dir
  if (typeof state.map.unlockedMinX !== "number") state.map.unlockedMinX = 0;
  if (typeof state.map.unlockedMaxX !== "number") state.map.unlockedMaxX = 7;
  if (typeof state.map.unlockedMinZ !== "number") state.map.unlockedMinZ = 0;
  if (typeof state.map.unlockedMaxZ !== "number") state.map.unlockedMaxZ = 7;

  if (!Array.isArray(state.map.unlockedBlocks) || state.map.unlockedBlocks.length === 0) {
    state.map.unlockedBlocks = ["0,0"];
  }

  // Spiral start state
  if (!state.map.spiral) {
    state.map.spiral = {
      currentX: 0,
      currentZ: 0,
      direction: "top",
      legLength: 1,
      stepsTakenOnLeg: 0,
      legsCompletedAtCurrentLength: 0
    };
  }

  // ----------------------------------------------------------
  // RESOURCE NODES
  // ----------------------------------------------------------
  if (!Array.isArray(state.resourceNodes) || state.resourceNodes.length === 0) {
    state.resourceNodes = createDefaultResourceNodes();
  }

  // resourceSlots hər dəfə node-lardan yenidən qurulur
  state.resourceSlots = createDefaultResourceSlots(state.resourceNodes);

  // slot occupancy bina state-ə görə hesablanır
  syncResourceSlotOccupancy(state);
}

function makeBlockKey(blockX, blockZ) {
  return `${blockX},${blockZ}`;
}

function parseBlockKey(key) {
  const parts = String(key).split(",");
  return {
    x: parseInt(parts[0], 10),
    z: parseInt(parts[1], 10)
  };
}

function isCellInsideUnlockedBlocks(state, x, z) {
  ensureMapState(state);

  const blockSize = 8;
  const blockX = Math.floor(x / blockSize);
  const blockZ = Math.floor(z / blockSize);

  const key = blockX + "," + blockZ;
  return state.map.unlockedBlocks.includes(key);
}

function nextDirectionCounterClockwise(dir) {
  switch (dir) {
    case "right": return "top";
    case "top": return "left";
    case "left": return "bottom";
    case "bottom": return "right";
    default: return "right";
  }
}

function expandUnlockedArea(state, direction, blockSizeX = 8, blockSizeZ = 8) {
  ensureMapState(state);

  const spiral = state.map.spiral;
  const unlockedSet = new Set(state.map.unlockedBlocks);

  if (direction !== spiral.direction) {
    console.log("[EXPAND_WARN] direction mismatch", {
      clientDirection: direction,
      serverDirection: spiral.direction
    });
  }

  let nextX = spiral.currentX;
  let nextZ = spiral.currentZ;

  switch (spiral.direction) {
    case "right":
      nextX += 1;
      break;

    case "top":
      nextZ += 1;
      break;

    case "left":
      nextX -= 1;
      break;

    case "bottom":
      nextZ -= 1;
      break;

    default:
      return false;
  }

  unlockedSet.add(makeBlockKey(nextX, nextZ));
  state.map.unlockedBlocks = Array.from(unlockedSet);

  spiral.currentX = nextX;
  spiral.currentZ = nextZ;
  spiral.stepsTakenOnLeg += 1;

  if (spiral.stepsTakenOnLeg >= spiral.legLength) {
    spiral.stepsTakenOnLeg = 0;
    spiral.direction = nextDirectionCounterClockwise(spiral.direction);
    spiral.legsCompletedAtCurrentLength += 1;

    if (spiral.legsCompletedAtCurrentLength >= 2) {
      spiral.legsCompletedAtCurrentLength = 0;
      spiral.legLength += 1;
    }
  }

  let minBlockX = Infinity;
  let maxBlockX = -Infinity;
  let minBlockZ = Infinity;
  let maxBlockZ = -Infinity;

  for (const key of state.map.unlockedBlocks) {
    const { x: bx, z: bz } = parseBlockKey(key);

    if (bx < minBlockX) minBlockX = bx;
    if (bx > maxBlockX) maxBlockX = bx;
    if (bz < minBlockZ) minBlockZ = bz;
    if (bz > maxBlockZ) maxBlockZ = bz;
  }

  state.map.unlockedMinX = minBlockX * blockSizeX;
  state.map.unlockedMaxX = ((maxBlockX + 1) * blockSizeX) - 1;
  state.map.unlockedMinZ = minBlockZ * blockSizeZ;
  state.map.unlockedMaxZ = ((maxBlockZ + 1) * blockSizeZ) - 1;

  return true;
}

function getResourceSlotAt(state, x, z) {
  if (!state || !Array.isArray(state.resourceSlots)) return null;

  for (const slot of state.resourceSlots) {
    if (!slot) continue;
    if (slot.x === x && slot.z === z) {
      return slot;
    }
  }

  return null;
}


function isReservedResourceCell(state, x, z) {
  if (state && Array.isArray(state.resourceNodes)) {
    for (const node of state.resourceNodes) {
      if (!node) continue;
      if (node.x === x && node.z === z) {
        return true;
      }
    }
  }

  if (state && Array.isArray(state.resourceSlots)) {
    for (const slot of state.resourceSlots) {
      if (!slot) continue;
      if (slot.x === x && slot.z === z) {
        return true;
      }
    }
  }

  return false;
}

//////////////////////////////////////////////////////





function canPlaceBuilding(state, buildingId, x, z) {
  const rules = getBuildingRules(buildingId);

  if (!rules) {
    console.log("[CAN_PLACE] FAIL => rules not found", { buildingId });
    return false;
  }

  if (!state || !Array.isArray(state.buildings)) {
    console.log("[CAN_PLACE] FAIL => invalid state/buildings", { buildingId, x, z });
    return false;
  }

  const inside = isInsideUnlockedArea(state, x, z, rules.sizeX, rules.sizeZ);
  if (!inside) {
    console.log("[CAN_PLACE] FAIL => outside unlocked area", { buildingId, x, z });
    return false;
  }

  // --------------------------------------------------------
  // RESOURCE SLOT CHECK
  // --------------------------------------------------------
  const overlappedSlots = getResourceSlotsInArea(state, x, z, rules.sizeX, rules.sizeZ);
  const slotAtOrigin = getResourceSlotAt(state, x, z);

  console.log("[CAN_PLACE_DEBUG]", {
    buildingId,
    x,
    z,
    rules,
    slotAtOrigin,
    overlappedSlots
  });

  // Resource bina yalnız uyğun boş slot üzərində qurula bilər
  if (rules.placementMode === "resource_slot") {
    if (!slotAtOrigin) {
      console.log("[CAN_PLACE] FAIL => resource building not on slot", { buildingId, x, z });
      return false;
    }

    if (slotAtOrigin.type !== rules.requiredSlotType) {
      console.log("[CAN_PLACE] FAIL => wrong slot type", {
        buildingId,
        x,
        z,
        expected: rules.requiredSlotType,
        actual: slotAtOrigin.type
      });
      return false;
    }

    if (slotAtOrigin.occupied) {
      console.log("[CAN_PLACE] FAIL => slot already occupied", {
        buildingId,
        x,
        z,
        slotId: slotAtOrigin.id,
        occupiedBy: slotAtOrigin.occupiedByInstanceId
      });
      return false;
    }

    // hazırkı resource binalar 1x1-dir
    if (rules.sizeX !== 1 || rules.sizeZ !== 1) {
      console.log("[CAN_PLACE] FAIL => resource building must be 1x1 for current slot system", {
        buildingId,
        sizeX: rules.sizeX,
        sizeZ: rules.sizeZ
      });
      return false;
    }
  }

  // Normal bina heç bir resource slot-un üstünə düşə bilməz
  if (rules.placementMode === "normal") {
    if (overlappedSlots.length > 0) {
      console.log("[CAN_PLACE] FAIL => normal building overlaps resource slot", {
        buildingId,
        x,
        z,
        overlappedSlots: overlappedSlots.map(s => s.id)
      });
      return false;
    }
  }

  // --------------------------------------------------------
  // OVERLAP CHECK
  // --------------------------------------------------------
  for (const other of state.buildings) {
    if (!other) continue;

    const otherRules = getBuildingRules(other.buildingId);
    if (!otherRules) continue;

    const overlap = rectanglesOverlap(
      x, z, rules.sizeX, rules.sizeZ,
      other.x, other.z, otherRules.sizeX, otherRules.sizeZ
    );

    if (overlap) {
      console.log("[CAN_PLACE] FAIL => overlap", {
        placing: { buildingId, x, z },
        blockedBy: { buildingId: other.buildingId, instanceId: other.instanceId }
      });
      return false;
    }
  }

  console.log("[CAN_PLACE] OK", { buildingId, x, z });
  return true;
}

function hasAdjacentConnectedRoad(state, buildingId, x, z) {
  const rules = getBuildingRules(buildingId);
  console.log("[ROAD_CHECK_SIZE]", buildingId, rules.sizeX, rules.sizeZ);

  if (!rules.requiresRoad) return true;
  if (!state || !Array.isArray(state.buildings)) return false;

  const sizeX = rules.sizeX;
  const sizeZ = rules.sizeZ;
  const connectedRoadKeys = getConnectedRoadKeys(state);

  for (const other of state.buildings) {
    if (!other) continue;

    const otherRules = getBuildingRules(other.buildingId);
    if (!otherRules.isRoad) continue;

    const roadKey = makeRoadKey(other.x, other.z);

    if (!connectedRoadKeys.has(roadKey)) continue;

    const roadX = other.x;
    const roadZ = other.z;

    const leftEdge = x - 1;
    const rightEdge = x + sizeX;
    const bottomEdge = z - 1;
    const topEdge = z + sizeZ;

    const touchesLeft =
      roadX === leftEdge &&
      roadZ >= z &&
      roadZ < z + sizeZ;

    const touchesRight =
      roadX === rightEdge &&
      roadZ >= z &&
      roadZ < z + sizeZ;

    const touchesBottom =
      roadZ === bottomEdge &&
      roadX >= x &&
      roadX < x + sizeX;

    const touchesTop =
      roadZ === topEdge &&
      roadX >= x &&
      roadX < x + sizeX;

    if (touchesLeft || touchesRight || touchesBottom || touchesTop) {
      return true;
    }
  }

  return false;
}

function hasAdjacentRoadForMove(state, movingBuilding, newX, newZ) {
  const rules = getBuildingRules(movingBuilding.buildingId);

  if (!rules.requiresRoad) return true;
  if (!state || !Array.isArray(state.buildings)) return false;

  for (const other of state.buildings) {
    if (!other) continue;
    if (other.instanceId === movingBuilding.instanceId) continue;

    const otherRules = getBuildingRules(other.buildingId);
    if (!otherRules.isRoad) continue;

    const roadX = other.x;
    const roadZ = other.z;

    const leftEdge = newX - 1;
    const rightEdge = newX + rules.sizeX;
    const bottomEdge = newZ - 1;
    const topEdge = newZ + rules.sizeZ;

    const touchesLeft =
      roadX === leftEdge &&
      roadZ >= newZ &&
      roadZ < newZ + rules.sizeZ;

    const touchesRight =
      roadX === rightEdge &&
      roadZ >= newZ &&
      roadZ < newZ + rules.sizeZ;

    const touchesBottom =
      roadZ === bottomEdge &&
      roadX >= newX &&
      roadX < newX + rules.sizeX;

    const touchesTop =
      roadZ === topEdge &&
      roadX >= newX &&
      roadX < newX + rules.sizeX;

    if (touchesLeft || touchesRight || touchesBottom || touchesTop) {
      return true;
    }
  }

  return false;
}

function canMoveBuilding(state, movingBuilding, newX, newZ) {
  if (!state || !movingBuilding || !Array.isArray(state.buildings)) return false;

  const movingRules = getBuildingRules(movingBuilding.buildingId);

  for (const other of state.buildings) {
    if (!other) continue;
    if (other.instanceId === movingBuilding.instanceId) continue;

    const otherRules = getBuildingRules(other.buildingId);

    const overlap = rectanglesOverlap(
      newX, newZ, movingRules.sizeX, movingRules.sizeZ,
      other.x, other.z, otherRules.sizeX, otherRules.sizeZ
    );

    if (overlap) return false;
  }

  return true;
}

function canMoveThisBuilding(building) {
  if (!building) return false;
  if (building.isFixed) return false;
  return true;
}

// ============================================================
// PLACE BUILDING WITHOUT STARTING CONSTRUCTION
// ============================================================

function placeBuildingWithoutStarting(state, buildingId, x, z) {
  const instanceId = crypto.randomBytes(8).toString("hex");
  const id = normalizeBuildingId(buildingId);

  const isInstantCompleted = (id === "road" || isGarageBuildingId(id));

  const building = {
    instanceId: instanceId,
    buildingId: buildingId,
    x: x,
    z: z,
    level: 1,
    isCompleted: isInstantCompleted,
    buildFinishTimeMs: 0,
    isFixed: false,
    hasRoadAccess: true
  };

  state.buildings.push(building);
  updateServerTime(state);

  return building;
}

// ============================================================
// JOB CREATION / COMPLETION
// ============================================================

function createBuildJob(state, buildingId, x, z) {
  const now = nowMs();
  const levelData = getLevelData(buildingId, 1);
  const durationMs = getAdjustedBuildDurationMs(
    state,
    Number(levelData.buildTimeSeconds) || 0
  );

  const instanceId = crypto.randomBytes(8).toString("hex");
  const jobId = crypto.randomBytes(8).toString("hex");

  const building = {
    instanceId: instanceId,
    buildingId: buildingId,
    x: x,
    z: z,
    level: 1,
    isCompleted: false,
    buildFinishTimeMs: now + durationMs,
    isFixed: false,
    hasRoadAccess: true
  };

  const job = {
    jobId: jobId,
    kind: "build",
    buildingInstanceId: instanceId,
    buildingId: buildingId,
    x: x,
    z: z,
    targetLevel: 1,
    startedAtMs: now,
    durationMs: durationMs,
    endsAtMs: now + durationMs,
    isCompleted: false,
    builderSlotsRequired: getBuilderSlotsRequiredForBuilding(buildingId)
  };

  state.buildings.push(building);
  state.builders.jobs.push(job);
  updateServerTime(state);

  return { building, job };
}

function createUpgradeJob(state, building) {
  const now = nowMs();

  const currentLevel = Math.max(1, Number(building.level) || 1);
  const maxLevel = getMaxLevelForBuilding(building.buildingId);

  if (currentLevel >= maxLevel) {
    return null;
  }

  const targetLevel = currentLevel + 1;
  const levelData = getLevelData(building.buildingId, targetLevel);

  const durationMs = getAdjustedBuildDurationMs(
    state,
    Number(levelData.buildTimeSeconds) || 0
  );

  const jobId = crypto.randomBytes(8).toString("hex");

  building.isCompleted = false;
  building.buildFinishTimeMs = now + durationMs;

  const job = {
    jobId: jobId,
    kind: "upgrade",
    buildingInstanceId: building.instanceId,
    buildingId: building.buildingId,
    x: building.x,
    z: building.z,
    currentLevel: currentLevel,
    targetLevel: targetLevel,
    startedAtMs: now,
    durationMs: durationMs,
    endsAtMs: now + durationMs,
    isCompleted: false,
    builderSlotsRequired: getBuilderSlotsRequiredForBuilding(building.buildingId)
  };

  state.builders.jobs.push(job);
  updateServerTime(state);

  return job;
}

function completeFinishedJobsForState(state) {
  if (!state || !state.builders || !Array.isArray(state.builders.jobs)) return false;
  if (!Array.isArray(state.buildings)) return false;

  ensureTechnologyObject(state);

  const now = nowMs();
  let changed = false;
  const completedResearch = completeTechnologyResearchForState(state);
  if (completedResearch) {
    changed = true;
  }

  for (const job of state.builders.jobs) {
    if (!job) continue;
    if (job.isCompleted) continue;
    if (now < job.endsAtMs) continue;

    job.isCompleted = true;
    changed = true;

    const building = state.buildings.find(
      (b) => b && b.instanceId === job.buildingInstanceId
    );

    if (building) {
      if (job.kind === "build") {
        building.level = Math.max(1, Number(job.targetLevel) || 1);
      }

      if (job.kind === "upgrade") {
        building.level = Math.max(1, Number(job.targetLevel) || 1);
      }

      building.isCompleted = true;
      building.buildFinishTimeMs = 0;
    }
  }

  state.builders.jobs = state.builders.jobs.filter(job => job && !job.isCompleted);

  if (changed) {
    updateServerTime(state);
    refreshRoadAccessForBuildings(state);
    refreshBuilderCapacity(state);
    refreshTechnologyStats(state);
  }

  return changed;
}

function completeFinishedJobsForAllPlayers() {
  for (const [playerId, state] of players) {
    const changed = completeFinishedJobsForState(state);

    if (changed) {
      pushStateToPlayerConnections(playerId, state);
      console.log("[SERVER] Build completed for player:", playerId);
    }
  }
}



////////////////////////////////////////



// ============================================================
// HTTP SERVER
// ============================================================

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, time: nowMs() }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("RDC WS server is running");
});

const wss = new WebSocket.Server({ server });

// ============================================================
// WS CONNECTIONS
// ============================================================

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;

  ws._clientId = crypto.randomBytes(6).toString("hex");
  ws._authedPlayerId = null;

  console.log("WS connected:", ip);

  send(ws, {
    type: "hello",
    serverTimeUnixMs: nowMs()
  });

  ws.on("message", (data) => {
    const text = data.toString();
    console.log("[SERVER RAW MESSAGE]", text);

    const [msg, err] = safeJsonParse(text);

    if (err) {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    console.log("[SERVER PARSED TYPE]", msg.type);

    const type = msg.type;

    switch (type) {










case "research_start": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed. Send auth first." });
          break;
        }

        const buildingInstanceId = msg.buildingInstanceId;
        const techId = msg.techId;

        if (!buildingInstanceId || typeof buildingInstanceId !== "string") {
          send(ws, { type: "error", message: "Missing buildingInstanceId" });
          break;
        }

        if (!techId || typeof techId !== "string") {
          send(ws, { type: "error", message: "Missing techId" });
          break;
        }

        const state = getOrCreatePlayerState(playerId);
        ensureTechnologyObject(state);

        const institute = Array.isArray(state.buildings)
          ? state.buildings.find(
              (b) =>
                b &&
                b.instanceId === buildingInstanceId &&
                normalizeBuildingId(b.buildingId) === "institute"
            )
          : null;

        if (!institute) {
          send(ws, { type: "error", message: "Institute building not found" });
          break;
        }

        if (!institute.isCompleted) {
          send(ws, { type: "error", message: "Institute is not completed yet" });
          break;
        }

        if (institute.hasRoadAccess === false) {
          send(ws, { type: "error", message: "Institute must be road connected" });
          break;
        }

        const started = startTechnologyResearch(state, techId);

        if (!started || !started.ok) {
          send(ws, {
            type: "error",
            message: started && started.message
              ? started.message
              : "Research could not be started"
          });
          break;
        }

        refreshTechnologyStats(state);
        updateServerTime(state);

        send(ws, {
          type: "research_started",
          playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify({
            buildingInstanceId,
            techId: normalizeBuildingId(techId),
            targetLevel: started.research.targetLevel,
            startedAtMs: started.research.startedAtMs,
            durationMs: started.research.durationMs,
            endsAtMs: started.research.endsAtMs
          })
        });

        send(ws, {
          type: "state",
          playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        console.log("[TECH_RESEARCH_STARTED]", {
          playerId,
          buildingInstanceId,
          techId: normalizeBuildingId(techId),
          targetLevel: started.research.targetLevel,
          endsAtMs: started.research.endsAtMs
        });

        break;
      }














      case "expand_area_request": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed. Send auth first." });
          break;
        }

        const direction = msg.direction;

        if (
          direction !== "right" &&
          direction !== "bottom" &&
          direction !== "left" &&
          direction !== "top"
        ) {
          send(ws, { type: "error", message: "Invalid expansion direction" });
          break;
        }

        const state = getOrCreatePlayerState(playerId);
        ensureMapState(state);

        const ok = expandUnlockedArea(state, direction, 8, 8);
        if (!ok) {
          send(ws, { type: "error", message: "Expansion failed" });
          break;
        }

        updateServerTime(state);

        send(ws, {
          type: "area_expanded",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify({
            direction: direction,
            unlockedMinX: state.map.unlockedMinX,
            unlockedMaxX: state.map.unlockedMaxX,
            unlockedMinZ: state.map.unlockedMinZ,
            unlockedMaxZ: state.map.unlockedMaxZ,
            unlockedBlocks: state.map.unlockedBlocks
          })
        });

        send(ws, {
          type: "state",
          playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        console.log("[AREA_EXPANDED]", {
          playerId,
          direction,
          unlockedBlocks: state.map.unlockedBlocks,
          unlockedMinX: state.map.unlockedMinX,
          unlockedMaxX: state.map.unlockedMaxX,
          unlockedMinZ: state.map.unlockedMinZ,
          unlockedMaxZ: state.map.unlockedMaxZ
        });

        break;
      }

      case "connect_road_request": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed. Send auth first." });
          break;
        }

        const buildingInstanceId = msg.buildingInstanceId;

        if (!buildingInstanceId || typeof buildingInstanceId !== "string") {
          send(ws, { type: "error", message: "Missing buildingInstanceId" });
          break;
        }

        const state = getOrCreatePlayerState(playerId);

        const building = state.buildings.find(
          (b) => b && b.instanceId === buildingInstanceId
        );

        if (!building) {
          send(ws, { type: "error", message: "Building not found" });
          break;
        }

        const id = normalizeBuildingId(building.buildingId);
        if (id === "hq" || id === "road") {
          send(ws, { type: "error", message: "Invalid target for road connection" });
          break;
        }

        refreshRoadAccessForBuildings(state);
        if (building.hasRoadAccess) {
          send(ws, { type: "error", message: "Building already connected to road" });
          break;
        }

        const path = findRoadPathAStar(state, buildingInstanceId);

        if (!path || path.length === 0) {
          send(ws, { type: "error", message: "Road path not found" });
          break;
        }

        const createdRoads = createRoadsAlongPath(state, path);
        refreshRoadAccessForBuildings(state);

        send(ws, {
          type: "road_connected",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify({
            buildingInstanceId: buildingInstanceId,
            createdRoadCount: createdRoads.length
          })
        });

        send(ws, {
          type: "state",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        console.log("[SERVER] Road connected for building:", buildingInstanceId, "created roads =", createdRoads.length);
        break;
      }

      case "start_construction_request": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed. Send auth first." });
          break;
        }

        const buildingInstanceId = msg.buildingInstanceId;

        if (!buildingInstanceId || typeof buildingInstanceId !== "string") {
          send(ws, { type: "error", message: "Missing buildingInstanceId" });
          break;
        }

        const state = getOrCreatePlayerState(playerId);

        const building = state.buildings.find(
          b => b && b.instanceId === buildingInstanceId
        );

        if (!building) {
          send(ws, { type: "error", message: "Building not found" });
          break;
        }

        if (!hasFreeBuilder(state, building.buildingId)) {
          send(ws, { type: "error", message: "All builders are busy" });
          break;
        }

        const buildingId = normalizeBuildingId(building.buildingId);

        if (buildingId === "road" || buildingId === "hq" || isGarageBuildingId(buildingId)) {
          send(ws, { type: "error", message: "This building cannot start construction" });
          break;
        }

        if (building.isCompleted) {
          send(ws, { type: "error", message: "Building already completed" });
          break;
        }

        if (building.buildFinishTimeMs > 0) {
          send(ws, { type: "error", message: "Construction already started" });
          break;
        }

        if (!building.hasRoadAccess) {
          send(ws, { type: "error", message: "Road required before construction" });
          break;
        }

        const targetLevel = Math.max(1, Number(building.level) || 1);
        const levelData = getLevelData(building.buildingId, targetLevel);

        const check = hasEnoughResources(state, levelData.cost);
        if (!check.ok) {
          send(ws, {
            type: "error",
            message: `Not enough ${check.resource}. Need ${check.need}, have ${check.have}`
          });
          break;
        }

        spendResources(state, levelData.cost);

        const durationMs = Math.max(0, Math.round((Number(levelData.buildTimeSeconds) || 0) * 1000));
        const now = nowMs();

        building.buildFinishTimeMs = now + durationMs;
        building.isCompleted = false;

        const jobId = crypto.randomBytes(8).toString("hex");

        state.builders.jobs.push({
          jobId: jobId,
          kind: "build",
          buildingInstanceId: building.instanceId,
          buildingId: building.buildingId,
          x: building.x,
          z: building.z,
          targetLevel: targetLevel,
          startedAtMs: now,
          durationMs: durationMs,
          endsAtMs: now + durationMs,
          isCompleted: false,
          builderSlotsRequired: getBuilderSlotsRequiredForBuilding(building.buildingId)
        });

        refreshBuilderCapacity(state);
        updateServerTime(state);

        send(ws, {
          type: "construction_started",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify({
            buildingInstanceId: building.instanceId,
            buildingId: building.buildingId,
            targetLevel: targetLevel,
            endsAtMs: building.buildFinishTimeMs
          })
        });

        send(ws, {
          type: "state",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        console.log("[SERVER] Construction started:", {
          instanceId: building.instanceId,
          buildingId: building.buildingId,
          targetLevel,
          durationMs
        });

        break;
      }

      case "expand_base": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed." });
          break;
        }

        const state = getOrCreatePlayerState(playerId);

        if (!state.map) {
          send(ws, { type: "error", message: "Map not initialized" });
          break;
        }

        state.map.unlockedMinX -= 2;
        state.map.unlockedMaxX += 2;
        state.map.unlockedMinZ -= 2;
        state.map.unlockedMaxZ += 2;

        updateServerTime(state);

        send(ws, {
          type: "base_expanded",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(state.map)
        });

        pushStateToPlayerConnections(playerId, state);

        console.log("[SERVER] Base expanded for player:", playerId);
        break;
      }

      case "build_request": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed. Send auth first." });
          break;
        }

        const buildingId = msg.buildingId;
        const x = msg.x;
        const z = msg.z;

        if (!buildingId || typeof buildingId !== "string") {
          send(ws, { type: "error", message: "Missing buildingId" });
          break;
        }

        if (typeof x !== "number" || typeof z !== "number") {
          send(ws, { type: "error", message: "Invalid x/z" });
          break;
        }

        const state = getOrCreatePlayerState(playerId);
        const normalizedBuildingId = normalizeBuildingId(buildingId);

        const unlockCheck = checkUnlockRequirements(state, normalizedBuildingId);
        if (!unlockCheck.ok) {
          send(ws, { type: "error", message: unlockCheck.message });
          break;
        }

        const currentPlacedCount = countPlacedBuildingsOfType(state, normalizedBuildingId);
        const maxPlacedCount = getMaxPlacedCountForBuilding(normalizedBuildingId);
        const allowedPlacedCountNow = getAllowedPlacedCountForBuilding(state, normalizedBuildingId);

        if (currentPlacedCount >= maxPlacedCount) {
          send(ws, {
            type: "error",
            message: "This building has reached its max placed count"
          });
          break;
        }

        if (currentPlacedCount >= allowedPlacedCountNow) {
          const nextUnlock = getNextUnlockCountRequirement(state, normalizedBuildingId);
          const msg = nextUnlock
            ? `HQ level ${nextUnlock.requiredMainBuildingLevel} required to place more of this building`
            : "Current HQ level does not allow placing more of this building";

          send(ws, {
            type: "error",
            message: msg
          });
          break;
        }

        if (hasUnfinishedBuildingOfSameType(state, buildingId)) {
          send(ws, {
            type: "error",
            message: "You already have an unfinished building of this type"
          });
          break;
        }

        console.log("[BUILD_REQUEST - PLACE ONLY]", { buildingId, x, z });
        console.log("[CAN_PLACE]", canPlaceBuilding(state, buildingId, x, z));

        if (!canPlaceBuilding(state, buildingId, x, z)) {
          send(ws, { type: "error", message: "Placement blocked" });
          break;
        }

        if (normalizedBuildingId === "road" || isGarageBuildingId(normalizedBuildingId)) {
          const levelData = getLevelData(buildingId, 1);

          const check = hasEnoughResources(state, levelData.cost);
          if (!check.ok) {
            send(ws, {
              type: "error",
              message: `Not enough ${check.resource}. Need ${check.need}, have ${check.have}`
            });
            break;
          }

          spendResources(state, levelData.cost);
        }

const building = placeBuildingWithoutStarting(state, buildingId, x, z);

// Yeni bina yerləşəndən sonra slot occupancy yenilə
syncResourceSlotOccupancy(state);

// Yeni bina yerləşəndən sonra bütün road access dəyərlərini yenidən hesablayırıq
refreshRoadAccessForBuildings(state);
refreshBuilderCapacity(state);

        send(ws, {
          type: "build_placed",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify({
            buildingInstanceId: building.instanceId,
            buildingId: building.buildingId,
            x: building.x,
            z: building.z,
            level: building.level,
            isCompleted: building.isCompleted,
            buildFinishTimeMs: building.buildFinishTimeMs
          })
        });


        

        send(ws, {
          type: "state",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        break;
      }


      //////////////////////////////////////////


      case "train_unit_request": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed. Send auth first." });
          break;
        }

        const buildingInstanceId = msg.buildingInstanceId;
        const unitId = msg.unitId;
        const count = msg.count;

        if (!buildingInstanceId || typeof buildingInstanceId !== "string") {
          send(ws, { type: "error", message: "Missing buildingInstanceId" });
          break;
        }

        if (!unitId || typeof unitId !== "string") {
          send(ws, { type: "error", message: "Missing unitId" });
          break;
        }

        if (typeof count !== "number" || count <= 0) {
          send(ws, { type: "error", message: "Invalid count" });
          break;
        }

        const state = getOrCreatePlayerState(playerId);

        if (!state.army) {
          state.army = {
            troops: {
              fighter_lv1: 0, fighter_lv2: 0, fighter_lv3: 0, fighter_lv4: 0, fighter_lv5: 0,
              fighter_lv6: 0, fighter_lv7: 0, fighter_lv8: 0, fighter_lv9: 0, fighter_lv10: 0,

              shooter_lv1: 0, shooter_lv2: 0, shooter_lv3: 0, shooter_lv4: 0, shooter_lv5: 0,
              shooter_lv6: 0, shooter_lv7: 0, shooter_lv8: 0, shooter_lv9: 0, shooter_lv10: 0,

              vehicle_lv1: 0, vehicle_lv2: 0, vehicle_lv3: 0, vehicle_lv4: 0, vehicle_lv5: 0,
              vehicle_lv6: 0, vehicle_lv7: 0, vehicle_lv8: 0, vehicle_lv9: 0, vehicle_lv10: 0
            },
            trainingQueues: {}
          };
        }

        if (!state.army.trainingQueues) {
          state.army.trainingQueues = {};
        }

        const building = state.buildings.find(
          b => b && b.instanceId === buildingInstanceId
        );

        if (!building) {
          send(ws, { type: "error", message: "Building not found" });
          break;
        }

        const buildingId = normalizeBuildingId(building.buildingId);

        const isTrainingBuilding =
          buildingId === "fighter_camp" ||
          buildingId === "shooter_camp" ||
          buildingId === "vehicle_factory";

        if (!isTrainingBuilding) {
          send(ws, { type: "error", message: "This building cannot train units" });
          break;
        }

        if (!building.isCompleted) {
          send(ws, { type: "error", message: "Building is not completed" });
          break;
        }

        if (state.army.trainingQueues[buildingInstanceId]) {
          send(ws, { type: "error", message: "Training queue already busy" });
          break;
        }

        const now = nowMs();
        const durationMs = getAdjustedTrainingDurationMs(state, count * 5000);

        const queueEntry = {
          buildingInstanceId,
          unitId,
          count,
          startTimeMs: now,
          finishTimeMs: now + durationMs
        };

        state.army.trainingQueues[buildingInstanceId] = queueEntry;

        console.log("[TRAIN_STARTED]", queueEntry);

        send(ws, {
          type: "train_started",
          playerId,
          serverTimeUnixMs: now,
          payloadJson: JSON.stringify(queueEntry)
        });

        send(ws, {
          type: "state",
          playerId,
          serverTimeUnixMs: now,
          payloadJson: JSON.stringify(makeClientState(state))
        });

        break;
      }
      function processTrainingQueues() {
  const now = nowMs();

  for (const [playerId, state] of players) {
    if (!state || !state.army || !state.army.trainingQueues)
      continue;

    const queues = state.army.trainingQueues;

    for (const buildingInstanceId of Object.keys(queues)) {
      const q = queues[buildingInstanceId];
      if (!q)
        continue;

      if (q.finishTimeMs > now)
        continue;

      // TRAINING BITDI
      const unitId = q.unitId;
      const count = q.count;

      if (!state.army.troops[unitId])
        state.army.troops[unitId] = 0;

      state.army.troops[unitId] += count;

      console.log("[TRAIN_FINISHED]", playerId, unitId, count);

      delete queues[buildingInstanceId];

      // clientə yeni state göndər
      const ws = playerSockets.get(playerId);
      if (ws) {
        send(ws, {
          type: "state",
          playerId,
          serverTimeUnixMs: now,
          payloadJson: JSON.stringify(makeClientState(state))
        });
      }
    }
  }
}

      case "upgrade_request": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed. Send auth first." });
          break;
        }

        const buildingInstanceId = msg.buildingInstanceId;

        if (!buildingInstanceId || typeof buildingInstanceId !== "string") {
          send(ws, { type: "error", message: "Missing buildingInstanceId" });
          break;
        }

        const state = getOrCreatePlayerState(playerId);

        const building = state.buildings.find(
          (b) => b && b.instanceId === buildingInstanceId
        );

        if (!building) {
          send(ws, { type: "error", message: "Building not found" });
          break;
        }

        if (!hasFreeBuilder(state, building.buildingId)) {
          send(ws, { type: "error", message: "All builders are busy" });
          break;
        }

        const buildingId = normalizeBuildingId(building.buildingId);

        if (buildingId === "road" || isUpgradeDisabledBuildingId(buildingId)) {
          send(ws, { type: "error", message: "This building cannot be upgraded" });
          break;
        }

        if (!building.isCompleted) {
          send(ws, { type: "error", message: "Building is already busy" });
          break;
        }

        if (!building.hasRoadAccess) {
          send(ws, { type: "error", message: "Road connection required before upgrade" });
          break;
        }

        const currentLevel = Math.max(1, Number(building.level) || 1);
        const maxLevel = getMaxLevelForBuilding(building.buildingId);

        if (currentLevel >= maxLevel) {
          send(ws, { type: "error", message: "Building already at max level" });
          break;
        }

        const targetLevel = currentLevel + 1;
        const levelData = getLevelData(building.buildingId, targetLevel);

        const check = hasEnoughResources(state, levelData.cost);
        if (!check.ok) {
          send(ws, {
            type: "error",
            message: `Not enough ${check.resource}. Need ${check.need}, have ${check.have}`
          });
          break;
        }

        spendResources(state, levelData.cost);

        const job = createUpgradeJob(state, building);

        if (!job) {
          send(ws, { type: "error", message: "Building already at max level" });
          break;
        }

        refreshBuilderCapacity(state);

        send(ws, {
          type: "upgrade_started",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify({
            jobId: job.jobId,
            buildingInstanceId: building.instanceId,
            buildingId: building.buildingId,
            currentLevel: currentLevel,
            targetLevel: job.targetLevel,
            endsAtMs: job.endsAtMs
          })
        });

        send(ws, {
          type: "state",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        console.log("[SERVER] Upgrade started:", {
          instanceId: building.instanceId,
          buildingId: building.buildingId,
          currentLevel,
          targetLevel: job.targetLevel,
          durationMs: job.durationMs
        });

        break;
      }


case "technology_research_start": {
  const playerId =
    (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
    ws._authedPlayerId;

  if (!playerId) {
    send(ws, { type: "error", message: "Not authed. Send auth first." });
    break;
  }

  const techId = typeof msg.techId === "string" ? msg.techId.trim() : "";

  if (!techId) {
    send(ws, { type: "error", message: "Missing techId" });
    break;
  }

  const state = getOrCreatePlayerState(playerId);
  const result = startTechnologyResearch(state, techId);

  if (!result.ok) {
    send(ws, { type: "error", message: result.message || "Technology research could not start" });
    break;
  }

  send(ws, {
    type: "technology_research_started",
    playerId,
    serverTimeUnixMs: nowMs(),
    payloadJson: JSON.stringify(result.research)
  });

  send(ws, {
    type: "state",
    playerId,
    serverTimeUnixMs: nowMs(),
    payloadJson: JSON.stringify(makeClientState(state))
  });

  console.log("[TECH_RESEARCH_STARTED]", {
    playerId,
    techId: result.research.techId,
    targetLevel: result.research.targetLevel,
    endsAtMs: result.research.endsAtMs
  });

  break;
}

      case "move_request": {
        const playerId =
          (msg.playerId && typeof msg.playerId === "string" && msg.playerId) ||
          ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed. Send auth first." });
          break;
        }

        const state = getOrCreatePlayerState(playerId);
        if (!state || !Array.isArray(state.buildings)) {
          send(ws, { type: "error", message: "Player state not found." });
          break;
        }

        const instanceId =
          typeof msg.buildingInstanceId === "string"
            ? msg.buildingInstanceId.trim()
            : "";

        const newX = Number.isInteger(msg.x) ? msg.x : parseInt(msg.x, 10);
        const newZ = Number.isInteger(msg.z) ? msg.z : parseInt(msg.z, 10);

        if (!instanceId) {
          send(ws, { type: "error", message: "buildingInstanceId is required." });
          break;
        }

        if (!Number.isInteger(newX) || !Number.isInteger(newZ)) {
          send(ws, { type: "error", message: "Invalid move target coordinates." });
          break;
        }

        const movingBuilding = state.buildings.find(
          (b) => b && b.instanceId === instanceId
        );

        if (!movingBuilding) {
          send(ws, { type: "error", message: "Building instance not found." });
          break;
        }

        if (!canMoveThisBuilding(movingBuilding)) {
          send(ws, { type: "error", message: "This building cannot be moved." });
          break;
        }

        if (movingBuilding.x === newX && movingBuilding.z === newZ) {
          send(ws, {
            type: "move_ignored",
            buildingInstanceId: instanceId,
            x: newX,
            z: newZ,
            reason: "same_position"
          });
          break;
        }

        if (!canMoveBuilding(state, movingBuilding, newX, newZ)) {
          send(ws, {
            type: "error",
            message: "Target area is occupied."
          });
          break;
        }

       movingBuilding.x = newX;
movingBuilding.z = newZ;
movingBuilding.updatedAt = nowMs();

syncResourceSlotOccupancy(state);
refreshRoadAccessForBuildings(state);
updateServerTime(state);

        send(ws, {
          type: "move_applied",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify({
            buildingInstanceId: instanceId,
            x: newX,
            z: newZ
          })
        });

        send(ws, {
          type: "state",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        console.log("[SERVER] Building moved:", instanceId, "->", newX, newZ);
        break;
      }

      case "hello":
        send(ws, {
          type: "hello",
          serverTimeUnixMs: nowMs()
        });
        break;

      case "ping":
        send(ws, {
          type: "pong",
          serverTimeUnixMs: nowMs()
        });
        break;

      case "auth": {
        let playerId = msg.playerId;

        if (!playerId) {
          playerId = crypto.randomBytes(12).toString("hex");
        }

        ws._authedPlayerId = playerId;
        connections.set(playerId, ws);

        const state = getOrCreatePlayerState(playerId);
        updateServerTime(state);

        send(ws, {
          type: "ack",
          playerId: playerId,
          serverTimeUnixMs: nowMs()
        });

        send(ws, {
          type: "state",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        break;
      }

      case "get_state": {
        const playerId = ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed" });
          return;
        }

        const state = getOrCreatePlayerState(playerId);
        updateServerTime(state);

        send(ws, {
          type: "state",
          playerId: playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });

        break;
      }

      case "save_state": {
        const playerId = ws._authedPlayerId;

        if (!playerId) {
          send(ws, { type: "error", message: "Not authed" });
          return;
        }

        const payloadJson = msg.payloadJson;
        const [incoming, parseErr] = safeJsonParse(payloadJson);

        if (parseErr) {
          send(ws, { type: "error", message: "payloadJson invalid" });
          return;
        }

        incoming.playerId = playerId;
        ensureMapState(incoming);
        ensureResourcesObject(incoming);
        refreshRoadAccessForBuildings(incoming);
        refreshResourceCaps(incoming);
        refreshSpecialStats(incoming);
        updateServerTime(incoming);

        players.set(playerId, incoming);

        send(ws, {
          type: "save_ok",
          playerId: playerId
        });

        break;
      }

      default:
        send(ws, { type: "error", message: "Unknown type" });
    }
  });

  ws.on("close", () => {
    const playerId = ws._authedPlayerId;
    if (playerId && connections.get(playerId) === ws) {
      connections.delete(playerId);
    }

    console.log("WS closed");
  });
});



function completeTechnologyResearchForAllPlayers() {
  for (const [playerId, state] of players) {
    const completed = completeTechnologyResearchForState(state);

    if (!completed) continue;

    pushStateToPlayerConnections(playerId, state);

    const ws = connections.get(playerId);
    if (ws) {
      send(ws, {
        type: "technology_research_completed",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson: JSON.stringify(completed)
      });
    }

    console.log("[TECH_RESEARCH_COMPLETED]", {
      playerId,
      techId: completed.techId,
      targetLevel: completed.targetLevel
    });
  }
}

// ============================================================
// LOOPS
// ============================================================

setInterval(() => {
  const now = nowMs();

  players.forEach((state, playerId) => {
    if (!state || !state.army || !state.army.trainingQueues)
      return;

    let stateChanged = false;

    for (const buildingInstanceId in state.army.trainingQueues) {
      const queue = state.army.trainingQueues[buildingInstanceId];
      if (!queue)
        continue;

      if (now >= queue.finishTimeMs) {
        console.log("[TRAIN_FINISHED]", queue);

        if (!state.army.troops) {
          state.army.troops = {};
        }

        if (typeof state.army.troops[queue.unitId] !== "number") {
          state.army.troops[queue.unitId] = 0;
        }

        state.army.troops[queue.unitId] += queue.count;
        delete state.army.trainingQueues[buildingInstanceId];

        console.log("[TRAIN_REWARD_ADDED]", {
          playerId,
          unitId: queue.unitId,
          added: queue.count,
          newTotal: state.army.troops[queue.unitId]
        });

        stateChanged = true;
      }
    }

    if (stateChanged) {
      updateServerTime(state);

      const ws = connections.get(playerId);
      if (ws) {
        send(ws, {
          type: "state",
          playerId,
          serverTimeUnixMs: nowMs(),
          payloadJson: JSON.stringify(makeClientState(state))
        });
      }
    }
  });
}, 1000);

setInterval(() => {
  completeTechnologyResearchForAllPlayers();
}, 1000);

setInterval(() => {
  completeFinishedJobsForAllPlayers();
}, 1000);

setInterval(() => {
  processProductionForAllPlayers();
}, 5000);

// ============================================================
// SERVER START
// ============================================================

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server started on " + PORT);
});