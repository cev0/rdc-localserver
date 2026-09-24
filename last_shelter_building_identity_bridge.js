"use strict";

const {
  authoritativeBuildingMetaAl,
  canonicalBuildingTypeIdAl,
  rdcBuildingTypeIdAl
} = require("./last_shelter_building_kataloqu");

const LAST_SHELTER_HQ_BUILDING_ID =
  canonicalBuildingTypeIdAl("hq");
const LAST_SHELTER_ROAD_BUILDING_ID =
  canonicalBuildingTypeIdAl("road");

function canonicalRuntimeBuildingId(buildingId) {
  return canonicalBuildingTypeIdAl(buildingId);
}

function mappedLastShelterBuildingTypeId(buildingId) {
  return rdcBuildingTypeIdAl(buildingId);
}

function sameCanonicalBuildingType(leftBuildingId, rightBuildingId) {
  const left = canonicalRuntimeBuildingId(leftBuildingId);
  const right = canonicalRuntimeBuildingId(rightBuildingId);

  return !!left && !!right && left === right;
}

function isHeadquartersBuildingId(buildingId) {
  return sameCanonicalBuildingType(buildingId, LAST_SHELTER_HQ_BUILDING_ID);
}

function isRoadBuildingId(buildingId) {
  return sameCanonicalBuildingType(buildingId, LAST_SHELTER_ROAD_BUILDING_ID);
}

function authoritativeBuildingMetaForRuntimeId(buildingId) {
  return authoritativeBuildingMetaAl(buildingId);
}

function stateHighestBuildingLevel(state, buildingId, options = {}) {
  if (!state || !Array.isArray(state.buildings)) return 0;

  const completedOnly = options.completedOnly === true;
  let highest = 0;

  for (const building of state.buildings) {
    if (!building) continue;
    if (completedOnly && building.isCompleted === false) continue;
    if (!sameCanonicalBuildingType(building.buildingId, buildingId)) continue;

    highest = Math.max(
      highest,
      Math.max(1, Math.trunc(Number(building.level) || 1))
    );
  }

  return highest;
}

module.exports = {
  LAST_SHELTER_HQ_BUILDING_ID,
  LAST_SHELTER_ROAD_BUILDING_ID,
  authoritativeBuildingMetaForRuntimeId,
  canonicalRuntimeBuildingId,
  isHeadquartersBuildingId,
  isRoadBuildingId,
  mappedLastShelterBuildingTypeId,
  sameCanonicalBuildingType,
  stateHighestBuildingLevel
};
