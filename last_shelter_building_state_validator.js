"use strict";

const {
  rdcBuildingTypeIdAl
} = require("./last_shelter_building_kataloqu");

const {
  verifiedLastShelterBuildingPrerequisitesYoxla
} = require("./last_shelter_building_runtime_overlay");

function metnAl(value, max = 64) {
  return value == null
    ? ""
    : String(value).trim().toLowerCase().slice(0, max);
}

function authoritativeBuildingTypeIdAl(buildingId) {
  const id = metnAl(buildingId);
  return rdcBuildingTypeIdAl(id) || null;
}

function stateBuildingHighestCompletedLevelAl(state, buildingId) {
  const wantedTypeId = authoritativeBuildingTypeIdAl(buildingId);
  if (!wantedTypeId || !state || !Array.isArray(state.buildings)) return 0;

  let highest = 0;

  for (const building of state.buildings) {
    if (!building || building.isCompleted === false) continue;

    const currentTypeId = authoritativeBuildingTypeIdAl(building.buildingId);
    if (currentTypeId !== wantedTypeId) continue;

    highest = Math.max(
      highest,
      Math.max(1, Math.trunc(Number(building.level) || 1))
    );
  }

  return highest;
}

function authoritativeBuildingStatePrerequisitesYoxla(
  state,
  buildingId,
  targetLevel
) {
  const typeId = authoritativeBuildingTypeIdAl(buildingId);

  if (!typeId) {
    return {
      mapped:false,
      ok:true,
      buildingId:metnAl(buildingId),
      buildingTypeId:null,
      targetLevel:Math.max(1, Math.trunc(Number(targetLevel) || 1)),
      conditions:[]
    };
  }

  return verifiedLastShelterBuildingPrerequisitesYoxla(
    typeId,
    targetLevel,
    requiredTypeId =>
      stateBuildingHighestCompletedLevelAl(state, requiredTypeId)
  );
}

module.exports = {
  authoritativeBuildingTypeIdAl,
  stateBuildingHighestCompletedLevelAl,
  authoritativeBuildingStatePrerequisitesYoxla
};
