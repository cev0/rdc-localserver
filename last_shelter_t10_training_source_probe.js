"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

const T10_SCIENCE_IDS = Object.freeze([
  "973700",
  "971700",
  "975700"
]);

const TRAINING_BUILDING_TYPES = Object.freeze([
  "423000",
  "424000",
  "425000"
]);

function tokenContains(value, target) {
  if (value == null) return false;
  return String(value)
    .split(/[|;,\s]+/)
    .filter(Boolean)
    .includes(target);
}

function matchingFields(row, target) {
  return Object.fromEntries(
    Object.entries(row || {})
      .filter(([, value]) => tokenContains(value, target))
  );
}

for (const id of T10_SCIENCE_IDS) {
  const matches = [];

  for (const catalogName of sourceCatalog.names()) {
    let rows = [];
    try {
      rows = sourceCatalog.rows(catalogName);
    } catch (error) {
      console.log(
        "[T10_SOURCE_SCAN_ERROR]",
        catalogName,
        error && error.message
      );
      sourceCatalog.release(catalogName);
      continue;
    }

    for (const row of rows) {
      const fields = matchingFields(row, id);
      if (Object.keys(fields).length > 0) {
        matches.push({
          catalogName,
          rowId: row.id == null ? null : String(row.id),
          fields,
          row
        });
      }
    }

    sourceCatalog.release(catalogName);
  }

  console.log(
    "[T10_SOURCE_LOCATION]",
    id,
    JSON.stringify(matches)
  );
}

for (const buildingTypeId of TRAINING_BUILDING_TYPES) {
  const numeric = Number(buildingTypeId);
  const buildingRows = [];

  for (const level of [0, 1, 25, 30]) {
    const id = String(numeric + level);
    const row = sourceCatalog.row("building", id);
    if (row) buildingRows.push(row);
  }

  console.log(
    "[TRAINING_BUILDING_SOURCE]",
    buildingTypeId,
    JSON.stringify(buildingRows)
  );
}

sourceCatalog.release("building");

for (const armyId of [
  "107000", "107008", "107009",
  "107100", "107108", "107109",
  "107200", "107208", "107209"
]) {
  console.log(
    "[TRAINING_BUILDING_ARMS_LINK]",
    armyId,
    JSON.stringify(sourceCatalog.row("arms", armyId))
  );
}

sourceCatalog.release("arms");
