"use strict";

const {
  sourceCatalog
} = require("./last_shelter_source_catalog");

const SEARCH_TOKENS = [
  "107000",
  "107100",
  "107200",
  "1070",
  "1071",
  "1072",
  "FOOT_SOLDIER",
  "RIDE_SOLDIER",
  "BOW_SOLDIER",
  "CAR_SOLDIER"
];

function containsToken(value) {
  const text =
    JSON.stringify(value || {})
      .toUpperCase();

  return SEARCH_TOKENS.some(token =>
    text.includes(token)
  );
}

function compactEntry(entry) {
  return {
    groups:
      Array.isArray(entry.groups)
        ? entry.groups
        : [],
    attributes:
      entry.attributes || {}
  };
}

const crossCatalogHits = [];

for (const name of sourceCatalog.names()) {
  const entries =
    sourceCatalog.entries(name);

  const hits =
    entries
      .filter(containsToken)
      .slice(0, 40)
      .map(compactEntry);

  if (hits.length > 0) {
    crossCatalogHits.push({
      catalog:name,
      hits
    });
  }

  sourceCatalog.release(name);
}

const buildingRows =
  sourceCatalog.rows("building");

const levelZero =
  buildingRows
    .filter(row =>
      /^4\d{5}$/.test(
        String(row.id || "")
      ) &&
      Number(row.level || 0) === 0
    )
    .map(row => ({
      id: row.id,
      level: row.level,
      building: row.building,
      para1: row.para1,
      para2: row.para2,
      para3: row.para3,
      para4: row.para4,
      para5: row.para5,
      para6: row.para6,
      para7: row.para7,
      para8: row.para8,
      para9: row.para9,
      para10: row.para10,
      is_stationed: row.is_stationed,
      opType: row.opType,
      num: row.num,
      tiles: row.tiles,
      position: row.position,
      unlock_population:
        row.unlock_population
    }));

sourceCatalog.release("building");

console.log(
  "LAST_SHELTER_BUILDING_SEMANTIC_PROBE=" +
  JSON.stringify({
    crossCatalogHits,
    levelZero
  })
);
