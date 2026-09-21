"use strict";

const {
  RAW_MAIN_BUILDING_LEVELS,
  mainBuildingLeveliniAl,
  rdcBuildingTypeIdAl
} = require("./last_shelter_building_kataloqu");

const VERIFIED_RESOURCE_KEYS = Object.freeze([
  "wood",
  "stone",
  "iron",
  "food",
  "money",
  "electricity",
  "silver"
]);

function metnAl(value, max = 64) {
  return value == null
    ? ""
    : String(value).trim().toLowerCase().slice(0, max);
}

function verifiedCostArrayHazirla(cost) {
  if (!cost || typeof cost !== "object") {
    return [];
  }

  return VERIFIED_RESOURCE_KEYS
    .map(type => ({
      type,
      amount: Math.max(0, Number(cost[type]) || 0)
    }))
    .filter(item => item.amount > 0);
}

function verifiedLastShelterBuildingLevelDataAl(
  buildingId,
  targetLevel
) {
  const id = metnAl(buildingId);
  const buildingTypeId =
    rdcBuildingTypeIdAl(id);

  if (!buildingTypeId) {
    return null;
  }

  const level =
    Math.max(
      1,
      Math.trunc(
        Number(targetLevel) || 1
      )
    );

  // Hazırda raw building.xml-dən RDC-yə təsdiqlənmiş xəritə HQ/400000-dir.
  // Yeni verified building type-lar kataloqa əlavə olunduqca bu overlay
  // generik building_definitions.json dəyərlərindən avtomatik üstün olacaq.
  if (buildingTypeId !== "400000") {
    return null;
  }

  const row =
    mainBuildingLeveliniAl(level);

  if (!row) {
    return null;
  }

  return {
    source:
      "last_shelter_v1.250.102_building_xml_verified",
    buildingId: id,
    buildingTypeId,
    xmlId: row.xmlId,
    targetLevel: level,
    maxLevelFromXml:
      Math.max(
        1,
        Number(row.maxLevelFromXml) || 1
      ),
    buildTimeSeconds:
      Math.max(
        0,
        Number(row.buildTimeSeconds) || 0
      ),
    productionPerTick: 0,
    storageCapacityBonus: 0,
    specialEffectValue: 0,
    cost:
      verifiedCostArrayHazirla(
        row.cost
      ),
    buildingConditions:
      Array.isArray(
        row.buildingConditions
      )
        ? row.buildingConditions.map(
            item => ({ ...item })
          )
        : []
  };
}

function verifiedLastShelterBuildingMaxLevelAl(
  buildingId
) {
  const id = metnAl(buildingId);
  const buildingTypeId =
    rdcBuildingTypeIdAl(id);

  if (buildingTypeId !== "400000") {
    return 0;
  }

  const levels =
    Object.keys(
      RAW_MAIN_BUILDING_LEVELS
    )
      .map(Number)
      .filter(
        level =>
          Number.isInteger(level) &&
          level >= 1 &&
          mainBuildingLeveliniAl(level)
      );

  return levels.length > 0
    ? Math.max(...levels)
    : 0;
}

module.exports = {
  VERIFIED_RESOURCE_KEYS,
  verifiedCostArrayHazirla,
  verifiedLastShelterBuildingLevelDataAl,
  verifiedLastShelterBuildingMaxLevelAl
};
