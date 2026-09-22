"use strict";

const {
  RDC_TO_LAST_SHELTER_BUILDING_TYPE
} = require("./last_shelter_building_kataloqu");

// Keep one verified semantic bridge. Numeric Last Shelter rows remain accepted
// directly; RDC names are translated only when their mapping is corroborated.
const RDC_BUILDING_TYPE_IDS =
  RDC_TO_LAST_SHELTER_BUILDING_TYPE;

function sourceBuildingType(row) {
  const explicit = String(row?.buildingTypeId ?? row?.itemId ?? "");
  if (/^\d+$/.test(explicit)) return explicit;
  return RDC_BUILDING_TYPE_IDS[String(row?.buildingId || "").trim().toLowerCase()] || null;
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
function sourceBuildingPrerequisites(state, levelData) {
  const missing = (levelData?.buildingConditions || []).map(requirement => ({
    ...requirement, currentLevel: sourceBuildingLevel(state, requirement.buildingTypeId)
  })).filter(requirement => requirement.currentLevel < requirement.level);
  return { ok: missing.length === 0, missing };
}
module.exports = { RDC_BUILDING_TYPE_IDS, sourceBuildingType, sourceBuildings, sourceBuildingLevel, sourceBuildingPrerequisites };
