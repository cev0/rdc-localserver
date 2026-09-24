"use strict";

const {
  buildingTypeLeveliniAl,
  authoritativeBuildingMaxLevelAl,
  authoritativeBuildingConditionsYoxla,
  canonicalBuildingTypeIdAl,
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
  const id =
    metnAl(
      buildingId
    );

  const buildingTypeId =
    rdcBuildingTypeIdAl(
      id
    );

  if (!buildingTypeId) {
    return null;
  }

  const level =
    Math.max(
      1,
      Math.trunc(
        Number(targetLevel) ||
        1
      )
    );

  // Original runtime current-row convention:
  // level N qurmaq/upgradeləmək üçün N-1 sətrinin xərci/müddəti istifadə olunur,
  // N sətrinin mövcudluğu isə target level-in real olduğunu təsdiqləyir.
  const row =
    buildingTypeLeveliniAl(
      buildingTypeId,
      level - 1
    );

  const targetRow =
    buildingTypeLeveliniAl(
      buildingTypeId,
      level
    );

  const maxLevel =
    authoritativeBuildingMaxLevelAl(
      buildingTypeId
    );

  if (
    !row ||
    !targetRow ||
    maxLevel <= 0 ||
    level > maxLevel
  ) {
    return null;
  }

  return {
    source:
      "last_shelter_building_xml_authoritative",
    buildingId:
      id,
    buildingTypeId,
    xmlId:
      row.xmlId,
    targetXmlId:
      targetRow.xmlId,
    targetLevel:
      level,
    maxLevelFromXml:
      maxLevel,
    buildTimeSeconds:
      Math.max(
        0,
        Number(
          row.buildTimeSeconds
        ) ||
        0
      ),
    productionPerTick:
      0,
    storageCapacityBonus:
      0,
    specialEffectValue:
      0,
    cost:
      verifiedCostArrayHazirla(
        row.cost
      ),
    buildingConditions:
      Array.isArray(
        row.buildingConditions
      )
        ? row.buildingConditions.map(
            item => ({
              ...item
            })
          )
        : []
  };
}

function verifiedLastShelterBuildingMaxLevelAl(
  buildingId
) {
  return Math.max(
    0,
    authoritativeBuildingMaxLevelAl(
      buildingId
    ) ||
    0
  );
}

function verifiedLastShelterBuildingLevelStatusAl(
  buildingId,
  targetLevel
) {
  const id =
    metnAl(
      buildingId
    );

  const buildingTypeId =
    rdcBuildingTypeIdAl(
      id
    );

  const level =
    Math.max(
      1,
      Math.trunc(
        Number(targetLevel) ||
        1
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
      buildingTypeId
    );

  const verified =
    verifiedLastShelterBuildingLevelDataAl(
      buildingTypeId,
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

function verifiedLastShelterBuildingPrerequisitesYoxla(
  buildingId,
  targetLevel,
  highestLevelResolver
) {
  const id = metnAl(buildingId);
  const buildingTypeId = rdcBuildingTypeIdAl(id);

  if (!buildingTypeId) {
    return {
      mapped:false,
      ok:true,
      buildingId:id,
      buildingTypeId:null,
      targetLevel:Math.max(1, Math.trunc(Number(targetLevel) || 1)),
      conditions:[]
    };
  }

  const level = Math.max(1, Math.trunc(Number(targetLevel) || 1));
  const result = authoritativeBuildingConditionsYoxla(
    buildingTypeId,
    level,
    requiredTypeId => {
      if (typeof highestLevelResolver !== "function") return 0;
      return highestLevelResolver(canonicalBuildingTypeIdAl(requiredTypeId));
    }
  );

  return {
    mapped:true,
    buildingId:id,
    buildingTypeId,
    targetLevel:level,
    ...result
  };
}

module.exports = {
  VERIFIED_RESOURCE_KEYS,
  verifiedCostArrayHazirla,
  verifiedLastShelterBuildingLevelDataAl,
  verifiedLastShelterBuildingMaxLevelAl,
  verifiedLastShelterBuildingLevelStatusAl,
  verifiedLastShelterBuildingPrerequisitesYoxla
};
