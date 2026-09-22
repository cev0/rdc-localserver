"use strict";

/*
 * Full building.xml source rows, including HQ 0..30 (the declared base cap is 25).
 * Runtime overlays must still enforce prerequisites and the source cost-level
 * convention; source row availability alone does not prove gameplay parity.
 */

const RDC_TO_LAST_SHELTER_BUILDING_TYPE =
  Object.freeze({
    hq: "400000"
  });

function metnAl(value, max = 1024) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function tamEded(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : fallback;
}

function sertleriParseEt(raw) {
  const text = metnAl(raw, 4096);

  if (!text) {
    return [];
  }

  return text
    .split("|")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [buildingTypeId, levelRaw] =
        part.split(";");

      return Object.freeze({
        buildingTypeId:
          metnAl(buildingTypeId, 32),
        level:
          tamEded(levelRaw)
      });
    });
}

function xercHazirla(row) {
  return Object.freeze({
    wood: tamEded(row.wood),
    stone: tamEded(row.stone),
    iron: tamEded(row.iron),
    food: tamEded(row.food),
    money: tamEded(row.money),
    electricity:
      tamEded(row.electricity),
    silver:
      tamEded(row.silver)
  });
}

const { sourceCatalog } = require("./last_shelter_source_catalog");
const RAW_BUILDING_ROWS = Object.freeze(Object.fromEntries(sourceCatalog.rows("building")
  .map(row => [row.id, Object.freeze({ ...row })])));
sourceCatalog.release("building");

function buildingXmlRowAl(xmlId) {
  const raw = RAW_BUILDING_ROWS[String(xmlId)];
  return raw ? { ...raw } : null;
}

function buildingRowHazirla(row) {
  const result = {
    xmlId: row.id,
    buildingTypeId: String(Number(row.id) - Number(row.level)),
    level: Number(row.level),
    maxLevelFromXml: Number(row.max_level || 0),
    buildingConditionRaw: row.building || "",
    ...xercHazirla(row),
    putConsumeRaw: row.put_consume || "",
    powerDissipation: Number(row.power_dissipation || 0),
    buildTimeSeconds: row.time == null ? null : Number(row.time),
    exp: Number(row.exp || 0),
    power: Number(row.power || 0),
    sourceAttributes: Object.freeze({ ...row })
  };
  for (const [xml, name] of [["destroy_time", "destroyTimeSeconds"], ["is_stationed", "stationedSlots"],
    ["population", "population"], ["num", "num"], ["tiles", "tiles"]]) {
    if (row[xml] != null) result[name] = Number(row[xml]);
  }
  for (const key of Object.keys(row).filter(key => /^para\d+$/.test(key))) result[key] = row[key];
  if (row.unlock_population != null) result.unlockPopulationRaw = row.unlock_population;
  return Object.freeze(result);
}

const RAW_MAIN_BUILDING_LEVELS = Object.freeze(Object.fromEntries(
  Object.values(RAW_BUILDING_ROWS).filter(row => Number(row.id) - Number(row.level) === 400000)
    .map(row => [row.level, buildingRowHazirla(row)])
));

function buildingLeveliniAl(buildingTypeId, level) {
  const type = metnAl(buildingTypeId, 32);
  const lvl = tamEded(level);
  if (!/^\d+$/.test(type)) return null;
  const raw = RAW_BUILDING_ROWS[String(Number(type) + lvl)];
  if (!raw || Number(raw.level) !== lvl || Number(raw.id) - Number(raw.level) !== Number(type)) return null;
  const row = buildingRowHazirla(raw);
  return { ...row, cost:xercHazirla(raw), buildingConditions:sertleriParseEt(raw.building || "") };
}

function buildingMaxLeveliniAl(buildingTypeId) {
  const type=metnAl(buildingTypeId,32);
  if (!/^\d+$/.test(type)) return 0;
  let max=0;
  for (const raw of Object.values(RAW_BUILDING_ROWS)) {
    if (Number(raw.id)-Number(raw.level)===Number(type)) max=Math.max(max,Number(raw.level)||0);
  }
  return max;
}

function mainBuildingLeveliniAl(level) {
  const lvl =
    tamEded(level);

  const raw =
    RAW_MAIN_BUILDING_LEVELS[
      lvl
    ];

  if (!raw) {
    return null;
  }

  return {
    ...raw,
    cost:
      xercHazirla(raw),
    buildingConditions:
      sertleriParseEt(
        raw.buildingConditionRaw
      )
  };
}

function rdcBuildingTypeIdAl(
  buildingId
) {
  const key =
    metnAl(
      buildingId,
      64
    ).toLowerCase();

  return (
    RDC_TO_LAST_SHELTER_BUILDING_TYPE[
      key
    ] ||
    null
  );
}

module.exports = {
  RDC_TO_LAST_SHELTER_BUILDING_TYPE,
  RAW_MAIN_BUILDING_LEVELS,
  RAW_BUILDING_ROWS,
  buildingXmlRowAl,
  buildingRowHazirla,
  sertleriParseEt,
  mainBuildingLeveliniAl,
  buildingLeveliniAl,
  buildingMaxLeveliniAl,
  rdcBuildingTypeIdAl
};
