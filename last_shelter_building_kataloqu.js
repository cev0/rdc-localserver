"use strict";

/*
 * Verified Last Shelter v1.250.x building.xml reference rows.
 *
 * These values are kept as reference semantics first. They are not yet used as
 * the active RDC build/upgrade engine because the complete 400000 level chain
 * and all prerequisite type mappings have not been recovered.
 */

const RDC_TO_LAST_SHELTER_BUILDING_TYPE =
  Object.freeze({
    hq: "400000"
  });

function metnAl(value, max = 1024) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function tamEded(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : fallback;
}

function sertleriParseEt(raw) {
  const text = metnAl(raw, 4096);

  if (!text) {
    return [];
  }

  return text
    .split("|")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [buildingTypeId, levelRaw] =
        part.split(";");

      return Object.freeze({
        buildingTypeId:
          metnAl(buildingTypeId, 32),
        level:
          tamEded(levelRaw)
      });
    });
}

function xercHazirla(row) {
  return Object.freeze({
    wood: tamEded(row.wood),
    stone: tamEded(row.stone),
    iron: tamEded(row.iron),
    food: tamEded(row.food),
    money: tamEded(row.money),
    electricity:
      tamEded(row.electricity),
    silver:
      tamEded(row.silver)
  });
}

const RAW_MAIN_BUILDING_LEVELS =
  Object.freeze({
    0: Object.freeze({
      xmlId: "400000",
      buildingTypeId: "400000",
      level: 0,
      maxLevelFromXml: 25,
      buildingConditionRaw: "",
      wood: 0,
      stone: 0,
      iron: 130,
      food: 30,
      money: 0,
      electricity: 0,
      silver: 0,
      putConsumeRaw: "15;140",
      powerDissipation: 0,
      buildTimeSeconds: 5,
      exp: 0,
      power: 0,
      stationedSlots: 0,
      num: 1,
      tiles: 3,
      unlockPopulationRaw: "1;0"
    }),

    1: Object.freeze({
      xmlId: "400001",
      buildingTypeId: "400000",
      level: 1,
      maxLevelFromXml: 25,
      buildingConditionRaw:
        "460000;1|433000;1",
      wood: 0,
      stone: 0,
      iron: 190,
      food: 50,
      money: 210,
      electricity: 0,
      silver: 0,
      putConsumeRaw: "0",
      powerDissipation: 1,
      buildTimeSeconds: 12,
      destroyTimeSeconds: 3,
      exp: 0,
      power: 2323,
      para1: "3000;11000",
      para2: "1",
      population: 0
    }),

    2: Object.freeze({
      xmlId: "400002",
      buildingTypeId: "400000",
      level: 2,
      maxLevelFromXml: 25,
      buildingConditionRaw:
        "460000;2|433000;2",
      wood: 200,
      stone: 0,
      iron: 290,
      food: 100,
      money: 320,
      electricity: 0,
      silver: 0,
      putConsumeRaw: "0",
      powerDissipation: 10,
      buildTimeSeconds: 50,
      destroyTimeSeconds: 6,
      exp: 0,
      power: 2551,
      para1: "5000;11000",
      para2: "1",
      population: 180
    }),

    3: Object.freeze({
      xmlId: "400003",
      buildingTypeId: "400000",
      level: 3,
      maxLevelFromXml: 25,
      buildingConditionRaw:
        "460000;3|433000;3",
      wood: 800,
      stone: 0,
      iron: 860,
      food: 0,
      money: 710,
      electricity: 0,
      silver: 0,
      putConsumeRaw: "0",
      powerDissipation: 13,
      buildTimeSeconds: 120,
      destroyTimeSeconds: 25,
      exp: 0,
      power: 2771,
      para1: "7100;11000",
      para3: "404000;424000",
      population: 295
    }),

    4: Object.freeze({
      xmlId: "400004",
      buildingTypeId: "400000",
      level: 4,
      maxLevelFromXml: 25,
      buildingConditionRaw:
        "460000;4|433000;4",
      wood: 1000,
      stone: 500,
      iron: 1500,
      food: 960,
      money: 1100,
      electricity: 0,
      silver: 0,
      putConsumeRaw: "0",
      powerDissipation: 18,
      buildTimeSeconds: 710,
      destroyTimeSeconds: 60,
      exp: 0,
      power: 2985,
      para1: "9300;11000",
      para3: "425000;411000"
    }),

    5: Object.freeze({
      xmlId: "400005",
      buildingTypeId: "400000",
      level: 5,
      maxLevelFromXml: 25,
      buildingConditionRaw:
        "460000;5|434000;5|450000;1|433000;5",
      wood: 0,
      stone: 1300,
      iron: 3600,
      food: 1800,
      money: 3200,
      electricity: 0,
      silver: 0,
      putConsumeRaw: "0",
      powerDissipation: 25,
      buildTimeSeconds: 2110,
      destroyTimeSeconds: 355,
      exp: 0,
      power: 3194,
      para1: "10000;11000",
      para3: "416000;426000"
    })
  });

function mainBuildingLeveliniAl(level) {
  const lvl =
    tamEded(level);

  const raw =
    RAW_MAIN_BUILDING_LEVELS[
      lvl
    ];

  if (!raw) {
    return null;
  }

  return {
    ...raw,
    cost:
      xercHazirla(raw),
    buildingConditions:
      sertleriParseEt(
        raw.buildingConditionRaw
      )
  };
}

function rdcBuildingTypeIdAl(
  buildingId
) {
  const key =
    metnAl(
      buildingId,
      64
    ).toLowerCase();

  return (
    RDC_TO_LAST_SHELTER_BUILDING_TYPE[
      key
    ] ||
    null
  );
}

module.exports = {
  RDC_TO_LAST_SHELTER_BUILDING_TYPE,
  RAW_MAIN_BUILDING_LEVELS,
  sertleriParseEt,
  mainBuildingLeveliniAl,
  rdcBuildingTypeIdAl
};
