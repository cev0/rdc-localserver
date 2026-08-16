"use strict";

const BUILDING_LEVEL_BY_TIER = Object.freeze({
  1: 1,
  2: 2,
  3: 5,
  4: 10,
  5: 13,
  6: 16,
  7: 19,
  8: 22,
  9: 25,
  10: 25
});

const BASE_TRAINING_SECONDS_BY_TIER = Object.freeze({
  1: 5,
  2: 6,
  3: 8,
  4: 10,
  5: 13,
  6: 16,
  7: 20,
  8: 25,
  9: 31,
  10: 38
});

const CLASS_DEFINITIONS = Object.freeze({
  warrior: Object.freeze({
    classId: "warrior",
    displayNameAz: "Savaşçı",
    buildingId: "fighter_camp",
    tier9ResearchId: "unlock_warrior_t9",
    tier10ResearchId: "unlock_warrior_t10",
    consumptionResourceId: "food"
  }),
  shooter: Object.freeze({
    classId: "shooter",
    displayNameAz: "Nişançı",
    buildingId: "shooter_camp",
    tier9ResearchId: "unlock_shooter_t9",
    tier10ResearchId: "unlock_shooter_t10",
    consumptionResourceId: "food"
  }),
  vehicle: Object.freeze({
    classId: "vehicle",
    displayNameAz: "Hərbi Maşın",
    buildingId: "vehicle_factory",
    tier9ResearchId: "unlock_vehicle_t9",
    tier10ResearchId: "unlock_vehicle_t10",
    consumptionResourceId: "fuel"
  })
});

const WARRIOR_NAMES = [
  "Əsgər",
  "Müdafiəçi",
  "Hücumçu",
  "Qartal",
  "Cəsur",
  "Dəmir Yumruq",
  "Komando",
  "Xüsusi Təyinatlı",
  "Qarabağ Qartalı",
  "Zəfər Döyüşçüsü"
];

const SHOOTER_NAMES = [
  "Atıcı",
  "Dəqiq Atıcı",
  "Nişançı",
  "Kəşfiyyatçı",
  "Xüsusi Atıcı",
  "Sərrast Nişançı",
  "Dağ Nişançısı",
  "Xüsusi Təyinatlı Nişançı",
  "Qarabağ Nişançısı",
  "Zəfər Nişançısı"
];

const VEHICLE_NAMES = [
  "Patrul Maşını",
  "Zirehli Patrul",
  "Yüngül Zirehli Maşın",
  "Döyüş Maşını",
  "Zirehli Döyüş Maşını",
  "Hücum Maşını",
  "Ağır Zirehli Maşın",
  "Ağır Döyüş Maşını",
  "Qarabağ Zirehlisi",
  "Zəfər Maşını"
];

const WARRIOR_STATS = [
  [9, 11, 4, 1.0, 15, 15, 0.04],
  [13, 15, 5, 1.4, 15, 15, 0.04],
  [18, 20, 7, 1.9, 14, 14, 0.04],
  [23, 27, 8, 2.5, 14, 13, 0.04],
  [32, 33, 10, 3.2, 13, 12, 0.04],
  [38, 44, 13, 4.0, 13, 11, 0.04],
  [46, 53, 15, 4.9, 12, 10, 0.08],
  [59, 61, 17, 5.9, 12, 10, 0.08],
  [59, 61, 17, 5.9, 12, 10, 0.08],
  [70, 73, 20, 7.0, 11, 9, 0.12]
];

const SHOOTER_STATS = [
  [15, 6, 3, 1.0, 15, 15, 0.04],
  [21, 9, 3, 1.4, 15, 15, 0.04],
  [28, 13, 4, 1.9, 14, 14, 0.04],
  [37, 17, 5, 2.5, 14, 13, 0.04],
  [48, 20, 7, 3.2, 13, 12, 0.04],
  [60, 26, 8, 4.0, 13, 11, 0.04],
  [73, 34, 10, 4.9, 12, 10, 0.08],
  [89, 38, 12, 5.9, 12, 10, 0.08],
  [105, 49, 14, 7.0, 11, 9, 0.12],
  [124, 55, 17, 8.2, 10, 9, 0.12]
];

const VEHICLE_STATS = [
  [11, 8, 4, 1.0, 18, 15, 0.04],
  [16, 11, 4, 1.4, 18, 15, 0.04],
  [21, 15, 6, 1.9, 17, 14, 0.04],
  [31, 17, 7, 2.5, 17, 13, 0.04],
  [40, 22, 9, 3.2, 16, 12, 0.04],
  [46, 32, 11, 4.0, 16, 11, 0.04],
  [61, 34, 13, 4.9, 15, 10, 0.08],
  [67, 47, 15, 5.9, 15, 10, 0.08],
  [87, 49, 18, 7.0, 14, 9, 0.12],
  [94, 65, 21, 8.2, 13, 9, 0.12]
];

const WARRIOR_COSTS = [
  { food: 14 },
  { food: 35, wood: 8 },
  { food: 56, wood: 12 },
  { food: 75, wood: 16 },
  { food: 93, wood: 20 },
  { food: 112, wood: 25 },
  { food: 131, wood: 29 },
  { food: 149, wood: 34 },
  { food: 168, wood: 39 },
  { food: 188, wood: 45 }
];

const SHOOTER_COSTS = [
  { food: 14 },
  { food: 32, iron: 11 },
  { food: 36, iron: 19 },
  { food: 50, iron: 25 },
  { food: 62, iron: 31 },
  { food: 74, iron: 37 },
  { food: 86, iron: 43 },
  { food: 99, iron: 49 },
  { food: 113, iron: 56 },
  { food: 128, iron: 64 }
];

const VEHICLE_COSTS = [
  { fuel: 14 },
  { fuel: 23, iron: 12 },
  { fuel: 37, iron: 17 },
  { fuel: 50, iron: 23 },
  { fuel: 62, iron: 29 },
  { fuel: 75, iron: 35 },
  { fuel: 88, iron: 41 },
  { fuel: 99, iron: 49 },
  { fuel: 113, iron: 57 },
  { fuel: 128, iron: 66 }
];

function requiredResearchId(classDef, tier) {
  if (tier === 9) return classDef.tier9ResearchId;
  if (tier === 10) return classDef.tier10ResearchId;
  return "";
}

function costObjectToArray(cost) {
  return Object.entries(cost || {})
    .filter(([, amount]) => Number(amount) > 0)
    .map(([type, amount]) => ({ type, amount: Number(amount) }));
}

function buildClassUnits(classDef, names, statsRows, costRows) {
  return names.map((displayNameAz, index) => {
    const tier = index + 1;
    const stats = statsRows[index];
    return Object.freeze({
      unitId: `${classDef.classId}_t${tier}`,
      classId: classDef.classId,
      classDisplayNameAz: classDef.displayNameAz,
      displayNameAz,
      tier,
      buildingId: classDef.buildingId,
      requiredBuildingLevel: BUILDING_LEVEL_BY_TIER[tier],
      requiredResearchId: requiredResearchId(classDef, tier),
      baseTrainingSeconds: BASE_TRAINING_SECONDS_BY_TIER[tier],
      costPerUnit: Object.freeze(costObjectToArray(costRows[index])),
      stats: Object.freeze({
        attackSpeed: stats[0],
        defense: stats[1],
        hp: stats[2],
        battlePower: stats[3],
        marchSpeed: stats[4],
        loadCapacity: stats[5],
        consumption: Object.freeze({
          resourceId: classDef.consumptionResourceId,
          amount: stats[6]
        })
      })
    });
  });
}

const UNITS = Object.freeze([
  ...buildClassUnits(CLASS_DEFINITIONS.warrior, WARRIOR_NAMES, WARRIOR_STATS, WARRIOR_COSTS),
  ...buildClassUnits(CLASS_DEFINITIONS.shooter, SHOOTER_NAMES, SHOOTER_STATS, SHOOTER_COSTS),
  ...buildClassUnits(CLASS_DEFINITIONS.vehicle, VEHICLE_NAMES, VEHICLE_STATS, VEHICLE_COSTS)
]);

const BY_ID = new Map(UNITS.map(x => [x.unitId, x]));

function qosunMelumatiniAl(unitId) {
  const id = typeof unitId === "string" ? unitId.trim().toLowerCase() : "";
  return BY_ID.get(id) || null;
}

function sinifMelumatiniAl(classId) {
  const id = typeof classId === "string" ? classId.trim().toLowerCase() : "";
  return CLASS_DEFINITIONS[id] || null;
}

function binaSinifiniAl(buildingId) {
  const id = typeof buildingId === "string" ? buildingId.trim().toLowerCase() : "";
  return Object.values(CLASS_DEFINITIONS).find(x => x.buildingId === id) || null;
}

function texnologiyaLeveliniAl(state, techId) {
  if (!techId) return 0;
  const levels = state && state.technology && state.technology.levels;
  const raw = levels && typeof levels === "object" ? Number(levels[techId]) : 0;
  return Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
}

function qosunKilidiniYoxla(state, building, unitId) {
  const unit = qosunMelumatiniAl(unitId);
  if (!unit) {
    return { success: false, reason: "unknown_unit", message: "Naməlum qoşun növüdür." };
  }

  if (!building || building.isCompleted !== true) {
    return { success: false, reason: "building_not_completed", message: "Qoşun binası tamamlanmayıb." };
  }

  const buildingId = typeof building.buildingId === "string"
    ? building.buildingId.trim().toLowerCase()
    : "";

  if (buildingId !== unit.buildingId) {
    return {
      success: false,
      reason: "wrong_training_building",
      message: `${unit.classDisplayNameAz} bu binada hazırlana bilməz.`
    };
  }

  const buildingLevel = Math.max(0, Math.trunc(Number(building.level) || 0));
  if (buildingLevel < unit.requiredBuildingLevel) {
    return {
      success: false,
      reason: "building_level_too_low",
      requiredBuildingLevel: unit.requiredBuildingLevel,
      currentBuildingLevel: buildingLevel,
      message: `Bina səviyyəsi ${unit.requiredBuildingLevel} olmalıdır.`
    };
  }

  if (unit.requiredResearchId) {
    const researchLevel = texnologiyaLeveliniAl(state, unit.requiredResearchId);
    if (researchLevel < 1) {
      return {
        success: false,
        reason: "research_required",
        requiredResearchId: unit.requiredResearchId,
        message: "Bu qoşun səviyyəsi üçün uyğun kilid açma araşdırması tamamlanmalıdır."
      };
    }
  }

  return {
    success: true,
    unit,
    buildingLevel
  };
}

function trainingCostReductionPctAl(state, classId) {
  const stats = state && state.technology && state.technology.stats;
  if (!stats || typeof stats !== "object") return 0;

  const generic = Number(stats.trainingCostReductionPct) || 0;
  const specificKey = `${classId}TrainingCostReductionPct`;
  const specific = Number(stats[specificKey]) || 0;
  return Math.min(90, Math.max(0, generic + specific));
}

function trainingSpeedPctAl(state, classId) {
  const stats = state && state.technology && state.technology.stats;
  if (!stats || typeof stats !== "object") return 0;

  const generic = Number(stats.trainingSpeedPct) || 0;
  const specificKey = `${classId}TrainingSpeedPct`;
  const specific = Number(stats[specificKey]) || 0;
  return Math.max(0, generic + specific);
}

function telimXerciniHesabla(state, unitId, rawCount) {
  const unit = qosunMelumatiniAl(unitId);
  const count = Math.max(0, Math.trunc(Number(rawCount) || 0));
  if (!unit || count <= 0) return null;

  const reductionPct = trainingCostReductionPctAl(state, unit.classId);
  const multiplier = (100 - reductionPct) / 100;

  const baseCost = unit.costPerUnit.map(x => ({
    type: x.type,
    amount: x.amount * count
  }));

  const finalCost = baseCost.map(x => ({
    type: x.type,
    amount: Math.max(0, Math.ceil(x.amount * multiplier))
  }));

  return {
    unitId: unit.unitId,
    count,
    reductionPct,
    baseCost,
    finalCost
  };
}

function telimMuddetiniHesabla(state, unitId, rawCount) {
  const unit = qosunMelumatiniAl(unitId);
  const count = Math.max(0, Math.trunc(Number(rawCount) || 0));
  if (!unit || count <= 0) return null;

  const speedPct = trainingSpeedPctAl(state, unit.classId);
  const baseDurationMs = unit.baseTrainingSeconds * 1000 * count;
  const finalDurationMs = Math.max(
    1000,
    Math.round(baseDurationMs * (100 / (100 + speedPct)))
  );

  return {
    unitId: unit.unitId,
    count,
    speedPct,
    baseTrainingSecondsPerUnit: unit.baseTrainingSeconds,
    baseDurationMs,
    finalDurationMs
  };
}

function kataloquClientUcunHazirla() {
  return UNITS.map(unit => ({
    unitId: unit.unitId,
    classId: unit.classId,
    classDisplayNameAz: unit.classDisplayNameAz,
    displayNameAz: unit.displayNameAz,
    tier: unit.tier,
    buildingId: unit.buildingId,
    requiredBuildingLevel: unit.requiredBuildingLevel,
    requiredResearchId: unit.requiredResearchId,
    baseTrainingSeconds: unit.baseTrainingSeconds,
    costPerUnit: unit.costPerUnit.map(x => ({ ...x })),
    stats: {
      attackSpeed: unit.stats.attackSpeed,
      defense: unit.stats.defense,
      hp: unit.stats.hp,
      battlePower: unit.stats.battlePower,
      marchSpeed: unit.stats.marchSpeed,
      loadCapacity: unit.stats.loadCapacity,
      consumption: { ...unit.stats.consumption }
    }
  }));
}

module.exports = {
  BUILDING_LEVEL_BY_TIER,
  BASE_TRAINING_SECONDS_BY_TIER,
  CLASS_DEFINITIONS,
  UNITS,
  qosunMelumatiniAl,
  sinifMelumatiniAl,
  binaSinifiniAl,
  texnologiyaLeveliniAl,
  qosunKilidiniYoxla,
  trainingCostReductionPctAl,
  trainingSpeedPctAl,
  telimXerciniHesabla,
  telimMuddetiniHesabla,
  kataloquClientUcunHazirla
};
