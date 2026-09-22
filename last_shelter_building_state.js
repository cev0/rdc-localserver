"use strict";

// Explicit bridge to the existing RDC building state. The Institute is RDC's
// research building; the source BuildingType enum identifies ACADEMY as 403000.
const RDC_BUILDING_TYPE_IDS = Object.freeze({
  hq: "400000", institute: "403000", house: "433000", bank: "434000",
  hospital: "411000", embassy: "402000", farm: "415000",
  ration_truck: "460000", road: "436000", tower: "418000"
});

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
