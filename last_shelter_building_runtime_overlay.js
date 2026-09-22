"use strict";

const {
  RAW_MAIN_BUILDING_LEVELS,
  buildingLeveliniAl,
  buildingMaxLeveliniAl,
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

  // UserBuildingManager.upgradeBuilding obtains costs/time/conditions from
  // getItemLevelId() (the CURRENT level), then verifies the next row exists.
  // Creating level 1 similarly consumes the level-zero row.
  const row = buildingLeveliniAl(buildingTypeId, level - 1);
  const targetRow = buildingLeveliniAl(buildingTypeId, level);

  if (!row || !targetRow || level > row.maxLevelFromXml) {
    return null;
  }

  return {
    source:
      "last_shelter_v1.250.102_building_xml_verified",
    buildingId: id,
    buildingTypeId,
    xmlId: row.xmlId,
    targetXmlId: targetRow.xmlId,
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
  const buildingTypeId = rdcBuildingTypeIdAl(id);
  if (!buildingTypeId) return 0;
  const catalogMax = buildingMaxLeveliniAl(buildingTypeId);
  const rows = Object.values(require("./last_shelter_building_kataloqu").RAW_BUILDING_ROWS)
    .filter(row => Number(row.id)-Number(row.level)===Number(buildingTypeId));
  const declared = rows.map(row=>Math.max(0,Math.trunc(Number(row.max_level)||0))).filter(Boolean);
  const declaredMax = declared.length ? Math.max(...declared) : catalogMax;
  return Math.min(catalogMax, declaredMax || catalogMax);
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
