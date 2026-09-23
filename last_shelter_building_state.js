"use strict";

// Compatibility bridge for older RDC state readers. Canonical Last Shelter
// identity/prerequisite decisions are delegated to the authoritative catalog
// whenever the building is mapped; only genuinely unmapped RDC data keeps the
// legacy compatibility path below.
const {
  rdcBuildingTypeIdAl
} = require("./last_shelter_building_kataloqu");

const {
  authoritativeBuildingStatePrerequisitesYoxla
} = require("./last_shelter_building_state_validator");

const RDC_BUILDING_TYPE_IDS = Object.freeze({
  hq: "400000", institute: "403000", house: "433000", bank: "434000",
  hospital: "411000", embassy: "402000", farm: "415000",
  ration_truck: "460000", road: "436000", tower: "418000"
});

function sourceBuildingType(row) {
  const explicit = String(row?.buildingTypeId ?? row?.itemId ?? "");
  if (/^\d+$/.test(explicit)) return explicit;

  const buildingId = String(row?.buildingId || "").trim().toLowerCase();
  return rdcBuildingTypeIdAl(buildingId) || RDC_BUILDING_TYPE_IDS[buildingId] || null;
}

function sourceBuildings(state) {
  const rows = [];
  for (const row of state?.buildings || []) {
    const upgrading = state?.builders?.jobs?.some(job => job.kind === "upgrade" &&
      job.buildingInstanceId === row?.instanceId && !job.isCompleted);
    if (row && (row.isCompleted === true || upgrading) && sourceBuildingType(row)) rows.push(row);
  }
  for (const row of state?.lastShelterCityRuntime?.buildings || []) {
    if (row && Number(row.level) > 0 && sourceBuildingType(row)) rows.push(row);
  }
  return rows;
}

function sourceBuildingLevel(state, itemId) {
  let level = 0;
  for (const row of sourceBuildings(state)) {
    if (sourceBuildingType(row) === String(itemId)) level = Math.max(level, Math.trunc(Number(row.level) || 0));
  }
  return level;
}

function legacySourceBuildingPrerequisites(state, levelData) {
  const missing = (levelData?.buildingConditions || []).map(requirement => ({
    ...requirement,
    currentLevel: sourceBuildingLevel(state, requirement.buildingTypeId)
  })).filter(requirement => requirement.currentLevel < requirement.level);

  return {
    mapped: false,
    ok: missing.length === 0,
    missing
  };
}

function sourceBuildingPrerequisites(state, levelData) {
  const buildingId =
    levelData?.buildingId ??
    levelData?.buildingTypeId ??
    null;

  const canonicalTypeId =
    buildingId == null
      ? null
      : rdcBuildingTypeIdAl(buildingId);

  if (canonicalTypeId) {
    const targetLevel = Math.max(
      1,
      Math.trunc(Number(levelData?.targetLevel) || 1)
    );

    const authoritative =
      authoritativeBuildingStatePrerequisitesYoxla(
        state,
        canonicalTypeId,
        targetLevel
      );

    if (authoritative && authoritative.mapped) {
      return authoritative;
    }
  }

  return legacySourceBuildingPrerequisites(state, levelData);
}

module.exports = {
  RDC_BUILDING_TYPE_IDS,
  sourceBuildingType,
  sourceBuildings,
  sourceBuildingLevel,
  sourceBuildingPrerequisites
};
