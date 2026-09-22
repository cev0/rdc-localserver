"use strict";

/*
 * Full building.xml source rows, including HQ 0..30 (the declared base cap is 25).
 * Runtime overlays must still enforce prerequisites and the source cost-level
 * convention; source row availability alone does not prove gameplay parity.
 */

const RDC_TO_LAST_SHELTER_BUILDING_TYPE =
  Object.freeze({
    // Only mappings proven by existing server/reference integration belong here.
    // Do not infer semantic names from XML ids: a wrong mapping would replace
    // working legacy gameplay with unrelated Last Shelter balance.
    hq: "400000",
    // These ids are independently corroborated by existing server integration
    // and stable Last Shelter runtime snapshots, not guessed from XML ordering.
    institute: "403000", hospital: "411000", farm: "415000",
    ration_truck: "460000", tower: "418000",
    // building.xml para1 troop families and arms.xml building tokens both
    // independently identify these three training-building bridges.
    fighter_camp: "423000",
    vehicle_factory: "424000",
    shooter_camp: "425000"
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

const BUILDING_MAX_LEVEL_BY_TYPE = Object.freeze(
  Object.values(RAW_BUILDING_ROWS).reduce(
    (index, raw) => {
      const typeId =
        String(
          Number(raw.id) -
          Number(raw.level)
        );
      const level =
        Number(raw.level) || 0;

      index[typeId] =
        Math.max(
          Number(index[typeId]) || 0,
          level
        );

      return index;
    },
    Object.create(null)
  )
);

const BUILDING_DECLARED_MAX_LEVEL_BY_TYPE = Object.freeze(
  Object.values(RAW_BUILDING_ROWS).reduce(
    (index, raw) => {
      const typeId =
        String(
          Number(raw.id) -
          Number(raw.level)
        );
      const declaredMax =
        Math.max(
          0,
          Math.trunc(
            Number(raw.max_level) || 0
          )
        );

      if (declaredMax > 0) {
        index[typeId] =
          Math.max(
            Number(index[typeId]) || 0,
            declaredMax
          );
      }

      return index;
    },
    Object.create(null)
  )
);


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
  const type =
    metnAl(
      buildingTypeId,
      32
    );

  if (!/^\d+$/.test(type)) {
    return 0;
  }

  return (
    Number(
      BUILDING_MAX_LEVEL_BY_TYPE[
        String(Number(type))
      ]
    ) || 0
  );
}

function buildingDeclaredMaxLeveliniAl(buildingTypeId) {
  const type =
    metnAl(
      buildingTypeId,
      32
    );

  if (!/^\d+$/.test(type)) {
    return 0;
  }

  return (
    Number(
      BUILDING_DECLARED_MAX_LEVEL_BY_TYPE[
        String(Number(type))
      ]
    ) || 0
  );
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
  buildingDeclaredMaxLeveliniAl,
  rdcBuildingTypeIdAl
};
