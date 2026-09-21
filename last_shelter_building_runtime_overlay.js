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

  const declaredMaxLevels =
    Object.values(
      RAW_MAIN_BUILDING_LEVELS
    )
      .map(
        row =>
          Math.max(
            0,
            Math.trunc(
              Number(
                row &&
                row.maxLevelFromXml
              ) || 0
            )
          )
      )
      .filter(level => level > 0);

  return declaredMaxLevels.length > 0
    ? Math.max(...declaredMaxLevels)
    : 0;
}

function verifiedLastShelterBuildingLevelStatusAl(
  buildingId,
  targetLevel
) {
  const id = metnAl(buildingId);
  const buildingTypeId =
    rdcBuildingTypeIdAl(id);
  const level =
    Math.max(
      1,
      Math.trunc(
        Number(targetLevel) || 1
      )
    );

  if (!buildingTypeId) {
    return {
      mapped:false,
      buildingId:id,
      buildingTypeId:null,
      targetLevel:level,
      maxLevel:0,
      verified:false,
      withinDeclaredMax:false
    };
  }

  const maxLevel =
    verifiedLastShelterBuildingMaxLevelAl(
      id
    );
  const verified =
    verifiedLastShelterBuildingLevelDataAl(
      id,
      level
    ) !== null;

  return {
    mapped:true,
    buildingId:id,
    buildingTypeId,
    targetLevel:level,
    maxLevel,
    verified,
    withinDeclaredMax:
      maxLevel > 0 &&
      level <= maxLevel
  };
}

module.exports = {
  VERIFIED_RESOURCE_KEYS,
  verifiedCostArrayHazirla,
  verifiedLastShelterBuildingLevelDataAl,
  verifiedLastShelterBuildingMaxLevelAl,
  verifiedLastShelterBuildingLevelStatusAl
};
