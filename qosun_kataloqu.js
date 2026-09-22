"use strict";

const {
  applyVerified107xBatch
} = require("./last_shelter_troop_107x_runtime_adapteri");

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
  // Last Shelter v1.250.102 army 107x00..107x09 "time" dəyərləri.
  1: 20,
  2: 25,
  3: 33,
  4: 44,
  5: 58,
  6: 75,
  7: 95,
  8: 118,
  9: 144,
  10: 173
});

const CLASS_DEFINITIONS = Object.freeze({
  warrior: Object.freeze({
    classId: "warrior",
    displayNameAz: "Savaşçı",
    buildingId: "fighter_camp",
    lastShelterArmyPrefix: "1070",
    consumptionResourceId: "food"
  }),
  shooter: Object.freeze({
    classId: "shooter",
    displayNameAz: "Nişançı",
    buildingId: "shooter_camp",
    lastShelterArmyPrefix: "1072",
    consumptionResourceId: "food"
  }),
  vehicle: Object.freeze({
    classId: "vehicle",
    displayNameAz: "Hərbi Maşın",
    buildingId: "vehicle_factory",
    lastShelterArmyPrefix: "1071",
    consumptionResourceId: "food"
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

// [attack, defense, hp, battlePower, marchSpeed, loadCapacity, consumption]
//
// İlk 6 sütun Last Shelter v1.250.102 server dump-dakı əsas troop ailələrindən
// götürülür: warrior=1070xx, vehicle=1071xx, shooter=1072xx.
// Son consumption sütunu ayrıca economy/upkeep migration-a qədər mövcud RDC
// resource modelində saxlanılır.
const WARRIOR_STATS = [
  [6, 14, 8, 1.0, 8, 8, 0.2083333283662796],
  [8, 19, 9, 1.4, 8, 8, 0.4166666567325592],
  [22, 13, 6, 1.9, 9, 9, 0.625],
  [15, 35, 15, 2.5, 8, 9, 0.8333333134651184],
  [38, 22, 9, 3.2, 9, 10, 1.0416666269302368],
  [24, 56, 22, 4.0, 8, 10, 1.25],
  [29, 68, 26, 4.9, 8, 11, 1.4583333730697632],
  [70, 41, 15, 5.9, 9, 11, 1.6666666269302368],
  [84, 49, 18, 7.0, 9, 12, 1.875],
  [49, 114, 42, 8.2, 8, 12, 2.0833332538604736]
];

const VEHICLE_STATS = [
  [11, 8, 4, 1.0, 16.100000381469727, 6, 0.2083333283662796],
  [15, 11, 4, 1.4, 16.100000381469727, 6, 0.4166666567325592],
  [20, 15, 6, 1.9, 16.100000381469727, 7, 0.625],
  [32, 17, 7, 2.5, 14.949999809265137, 7, 0.8333333134651184],
  [41, 22, 9, 3.2, 14.949999809265137, 8, 1.0416666269302368],
  [44, 32, 11, 4.0, 16.100000381469727, 8, 1.25],
  [63, 34, 13, 4.9, 14.949999809265137, 9, 1.4583333730697632],
  [64, 47, 15, 5.9, 16.100000381469727, 9, 1.6666666269302368],
  [91, 49, 18, 7.0, 14.949999809265137, 10, 1.875],
  [90, 65, 21, 8.2, 16.100000381469727, 10, 2.0833332538604736]
];

const SHOOTER_STATS = [
  [8, 6, 3, 1.0, 8, 8, 0.2083333283662796],
  [11, 8, 3, 1.4, 8, 8, 0.4166666567325592],
  [26, 13, 4, 1.9, 8, 8, 0.625],
  [35, 17, 5, 2.5, 8, 8, 0.8333333134651184],
  [25, 19, 6, 3.2, 8, 10, 1.0416666269302368],
  [32, 24, 8, 4.0, 8, 10, 1.25],
  [68, 34, 10, 4.9, 8, 10, 1.4583333730697632],
  [47, 35, 11, 5.9, 8, 11, 1.6666666269302368],
  [98, 49, 13, 7.0, 8, 11, 1.875],
  [65, 49, 15, 8.2, 8, 12, 2.0833332538604736]
];

// Last Shelter v1.250.102 təmiz/new-account troop resource costs.
// 107000..107209 əsas üç ailənin bütün 30 sətri artıq ayrıca authoritative
// last_shelter_troop_107x_reference kataloqunda source-verified-dir. Aşağıdakı
// cədvəllər legacy oxunaqlılıq/compatibility üçündür; final UNITS projection
// həmin authoritative kataloqla overlay olunur ki iki mənbə arasında drift
// gameplay-a keçməsin.
const WARRIOR_COSTS = [
  { food: 61 },
  { food: 100 },
  { food: 119, wood: 31 },
  { food: 169, iron: 7 },
  { food: 164, wood: 57, iron: 9 },
  { food: 245, iron: 18 },
  { food: 253, stone: 3, iron: 22 },
  { food: 203, wood: 108, stone: 4, iron: 25 },
  { food: 206, wood: 133, stone: 6, iron: 30 },
  { food: 323, stone: 9, iron: 39 }
];

const VEHICLE_COSTS = [
  { food: 57 },
  { food: 100 },
  { food: 155 },
  { food: 175, wood: 20, iron: 2 },
  { food: 228, wood: 27, iron: 5 },
  { food: 271, iron: 15 },
  { food: 269, wood: 56, stone: 3, iron: 9 },
  { food: 253, stone: 5, iron: 27 },
  { food: 276, wood: 104, stone: 8, iron: 15 },
  { food: 189, stone: 11, iron: 52 }
];

const SHOOTER_COSTS = [
  { food: 57 },
  { food: 90, wood: 10 },
  { food: 130, wood: 14 },
  { food: 185, wood: 20, iron: 2 },
  { food: 241, wood: 27, iron: 3 },
  { food: 296, wood: 35, iron: 4 },
  { food: 254, wood: 46, stone: 5, iron: 5 },
  { food: 217, wood: 53, stone: 9, iron: 7 },
  { food: 181, wood: 68, stone: 15, iron: 10 },
  { food: 155, wood: 77, stone: 19, iron: 13 }
];

function costObjectToArray(cost) {
  return Object.entries(cost || {})
    .filter(([, amount]) => Number(amount) > 0)
    .map(([type, amount]) => ({ type, amount: Number(amount) }));
}

function buildClassUnits(classDef, names, statsRows, costRows) {
  return names.map((displayNameAz, index) => {
    const tier = index + 1;
    const stats = statsRows[index];
    const lastShelterArmyId = `${classDef.lastShelterArmyPrefix}${String(index).padStart(2, "0")}`;
    return Object.freeze({
      unitId: `${classDef.classId}_t${tier}`,
      lastShelterArmyId,
      lastShelterArmyFamily: classDef.lastShelterArmyPrefix,
      classId: classDef.classId,
      classDisplayNameAz: classDef.displayNameAz,
      displayNameAz,
      tier,
      buildingId: classDef.buildingId,
      requiredBuildingLevel: BUILDING_LEVEL_BY_TIER[tier],
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

const UNITS = Object.freeze(
  applyVerified107xBatch([
    ...buildClassUnits(CLASS_DEFINITIONS.warrior, WARRIOR_NAMES, WARRIOR_STATS, WARRIOR_COSTS),
    ...buildClassUnits(CLASS_DEFINITIONS.shooter, SHOOTER_NAMES, SHOOTER_STATS, SHOOTER_COSTS),
    ...buildClassUnits(CLASS_DEFINITIONS.vehicle, VEHICLE_NAMES, VEHICLE_STATS, VEHICLE_COSTS)
  ])
);

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

  return {
    success: true,
    unit,
    buildingLevel
  };
}

function trainingCostReductionPctAl() {
  // Last Shelter training-cost science/effect mapping is not source-verified yet.
  return 0;
}

function trainingSpeedPctAl() {
  // Last Shelter training-speed science/effect mapping is not source-verified yet.
  return 0;
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
    lastShelterArmyId: unit.lastShelterArmyId,
    lastShelterArmyFamily: unit.lastShelterArmyFamily,
    classId: unit.classId,
    classDisplayNameAz: unit.classDisplayNameAz,
    displayNameAz: unit.displayNameAz,
    tier: unit.tier,
    buildingId: unit.buildingId,
    requiredBuildingLevel: unit.requiredBuildingLevel,
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
  qosunKilidiniYoxla,
  trainingCostReductionPctAl,
  trainingSpeedPctAl,
  telimXerciniHesabla,
  telimMuddetiniHesabla,
  kataloquClientUcunHazirla
};
