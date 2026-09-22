"use strict";

const {
  verified107xProjection
} = require("./last_shelter_troop_107x_runtime_adapteri");

const CLASS_DEFINITIONS = Object.freeze({
  warrior: Object.freeze({
    classId: "warrior",
    displayNameAz: "Savaşçı",
    buildingId: "fighter_camp",
    lastShelterArmyPrefix: "1070"
  }),
  shooter: Object.freeze({
    classId: "shooter",
    displayNameAz: "Nişançı",
    buildingId: "shooter_camp",
    lastShelterArmyPrefix: "1072"
  }),
  vehicle: Object.freeze({
    classId: "vehicle",
    displayNameAz: "Hərbi Maşın",
    buildingId: "vehicle_factory",
    lastShelterArmyPrefix: "1071"
  })
});

const WARRIOR_NAMES = Object.freeze([
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
]);

const SHOOTER_NAMES = Object.freeze([
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
]);

const VEHICLE_NAMES = Object.freeze([
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
]);

function unitHazirla(classDef, displayNameAz, index) {
  const tier = index + 1;
  const lastShelterArmyId =
    `${classDef.lastShelterArmyPrefix}${String(index).padStart(2, "0")}`;
  const verified =
    verified107xProjection(
      lastShelterArmyId
    );

  if (!verified) {
    throw new Error(
      `Verified Last Shelter troop row yoxdur: ${lastShelterArmyId}`
    );
  }

  return Object.freeze({
    unitId:
      `${classDef.classId}_t${tier}`,
    lastShelterArmyId,
    lastShelterArmyFamily:
      classDef.lastShelterArmyPrefix,
    classId:
      classDef.classId,
    classDisplayNameAz:
      classDef.displayNameAz,
    displayNameAz,
    tier,
    buildingId:
      classDef.buildingId,
    baseTrainingSeconds:
      verified.baseTrainingSeconds,
    costPerUnit:
      verified.costPerUnit,
    stats:
      Object.freeze({
        ...verified.stats,
        consumption:
          Object.freeze({
            resourceId: "food",
            amount:
              verified.stats.upkeep
          })
      }),
    lastShelterVerified: true
  });
}

function sinifUnitleriniHazirla(
  classDef,
  names
) {
  return names.map(
    (displayNameAz, index) =>
      unitHazirla(
        classDef,
        displayNameAz,
        index
      )
  );
}

const UNITS = Object.freeze([
  ...sinifUnitleriniHazirla(
    CLASS_DEFINITIONS.warrior,
    WARRIOR_NAMES
  ),
  ...sinifUnitleriniHazirla(
    CLASS_DEFINITIONS.shooter,
    SHOOTER_NAMES
  ),
  ...sinifUnitleriniHazirla(
    CLASS_DEFINITIONS.vehicle,
    VEHICLE_NAMES
  )
]);

const BY_ID =
  new Map(
    UNITS.map(
      unit => [
        unit.unitId,
        unit
      ]
    )
  );

const BY_LAST_SHELTER_ARMY_ID =
  new Map(
    UNITS.map(
      unit => [
        unit.lastShelterArmyId,
        unit
      ]
    )
  );

function qosunMelumatiniAl(unitId) {
  const id =
    typeof unitId === "string"
      ? unitId.trim().toLowerCase()
      : "";

  return BY_ID.get(id) || null;
}

function qosunMelumatiniArmyIdIleAl(
  lastShelterArmyId
) {
  const id =
    lastShelterArmyId == null
      ? ""
      : String(
          lastShelterArmyId
        ).trim();

  return (
    BY_LAST_SHELTER_ARMY_ID.get(
      id
    ) ||
    null
  );
}

function sinifMelumatiniAl(classId) {
  const id =
    typeof classId === "string"
      ? classId.trim().toLowerCase()
      : "";

  return (
    CLASS_DEFINITIONS[id] ||
    null
  );
}

function binaSinifiniAl(buildingId) {
  const id =
    typeof buildingId === "string"
      ? buildingId.trim().toLowerCase()
      : "";

  return (
    Object.values(
      CLASS_DEFINITIONS
    ).find(
      item =>
        item.buildingId === id
    ) ||
    null
  );
}

function qosunKilidiniYoxla(
  state,
  building,
  unitId
) {
  const unit =
    qosunMelumatiniAl(
      unitId
    );

  if (!unit) {
    return {
      success: false,
      reason: "unknown_unit",
      message:
        "Naməlum qoşun növüdür."
    };
  }

  if (
    !building ||
    building.isCompleted !== true
  ) {
    return {
      success: false,
      reason:
        "building_not_completed",
      message:
        "Qoşun binası tamamlanmayıb."
    };
  }

  const buildingId =
    typeof building.buildingId ===
    "string"
      ? building.buildingId
          .trim()
          .toLowerCase()
      : "";

  if (
    buildingId !==
    unit.buildingId
  ) {
    return {
      success: false,
      reason:
        "wrong_training_building",
      message:
        `${unit.classDisplayNameAz} bu binada hazırlana bilməz.`
    };
  }

  // Last Shelter 107x source rows do not prove the old RDC tier->building-level
  // thresholds. Do not enforce invented level gates until native unlock rules
  // are recovered.
  const buildingLevel =
    Math.max(
      0,
      Math.trunc(
        Number(
          building.level
        ) || 0
      )
    );

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

function telimXerciniHesabla(
  state,
  unitId,
  rawCount
) {
  const unit =
    qosunMelumatiniAl(
      unitId
    );
  const count =
    Math.max(
      0,
      Math.trunc(
        Number(rawCount) || 0
      )
    );

  if (
    !unit ||
    count <= 0
  ) {
    return null;
  }

  const reductionPct =
    trainingCostReductionPctAl(
      state,
      unit.classId
    );
  const multiplier =
    (100 - reductionPct) /
    100;

  const baseCost =
    unit.costPerUnit.map(
      item => ({
        type:
          item.type,
        amount:
          item.amount *
          count
      })
    );

  const finalCost =
    baseCost.map(
      item => ({
        type:
          item.type,
        amount:
          Math.max(
            0,
            Math.ceil(
              item.amount *
              multiplier
            )
          )
      })
    );

  return {
    unitId: unit.unitId,
    count,
    reductionPct,
    baseCost,
    finalCost
  };
}

function telimMuddetiniHesabla(
  state,
  unitId,
  rawCount
) {
  const unit =
    qosunMelumatiniAl(
      unitId
    );
  const count =
    Math.max(
      0,
      Math.trunc(
        Number(rawCount) || 0
      )
    );

  if (
    !unit ||
    count <= 0
  ) {
    return null;
  }

  const speedPct =
    trainingSpeedPctAl(
      state,
      unit.classId
    );
  const baseDurationMs =
    unit.baseTrainingSeconds *
    1000 *
    count;
  const finalDurationMs =
    Math.max(
      1000,
      Math.round(
        baseDurationMs *
        (
          100 /
          (100 + speedPct)
        )
      )
    );

  return {
    unitId:
      unit.unitId,
    count,
    speedPct,
    baseTrainingSecondsPerUnit:
      unit.baseTrainingSeconds,
    baseDurationMs,
    finalDurationMs
  };
}

function kataloquClientUcunHazirla() {
  return UNITS.map(
    unit => ({
      unitId:
        unit.unitId,
      lastShelterArmyId:
        unit.lastShelterArmyId,
      lastShelterArmyFamily:
        unit.lastShelterArmyFamily,
      classId:
        unit.classId,
      classDisplayNameAz:
        unit.classDisplayNameAz,
      displayNameAz:
        unit.displayNameAz,
      tier:
        unit.tier,
      buildingId:
        unit.buildingId,
      baseTrainingSeconds:
        unit.baseTrainingSeconds,
      costPerUnit:
        unit.costPerUnit.map(
          item => ({
            ...item
          })
        ),
      stats: {
        attack:
          unit.stats.attack,
        attackSpeed:
          unit.stats.attackSpeed,
        defense:
          unit.stats.defense,
        hp:
          unit.stats.hp,
        battlePower:
          unit.stats.battlePower,
        marchSpeed:
          unit.stats.marchSpeed,
        move:
          unit.stats.move,
        range:
          unit.stats.range,
        march:
          unit.stats.march,
        loadCapacity:
          unit.stats.loadCapacity,
        upkeep:
          unit.stats.upkeep,
        healResource:
          unit.stats.healResource,
        healTime:
          unit.stats.healTime,
        consumption: {
          ...unit.stats.consumption
        }
      }
    })
  );
}

module.exports = {
  CLASS_DEFINITIONS,
  UNITS,
  qosunMelumatiniAl,
  qosunMelumatiniArmyIdIleAl,
  sinifMelumatiniAl,
  binaSinifiniAl,
  qosunKilidiniYoxla,
  trainingCostReductionPctAl,
  trainingSpeedPctAl,
  telimXerciniHesabla,
  telimMuddetiniHesabla,
  kataloquClientUcunHazirla
};
