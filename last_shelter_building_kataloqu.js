"use strict";

/*
 * Full building.xml source rows, including HQ 0..30 (the declared base cap is 25).
 * Runtime overlays must still enforce prerequisites and the source cost-level
 * convention; source row availability alone does not prove gameplay parity.
 */

const {
  LAST_SHELTER_TROOP_CLASS_REFERENCE,
  troopBuildingRequiredMaxLevelAl
} = require("./last_shelter_troop_building_reference");

const RDC_TO_LAST_SHELTER_BUILDING_TYPE =
  Object.freeze({
    hq: "400000",
    institute: "403000",
    house: "433000",
    bank: "434000",
    hospital: "411000",
    embassy: "402000",
    farm: "415000",
    ration_truck: "460000",
    road: "436000",
    tower: "418000",
    fighter_camp: LAST_SHELTER_TROOP_CLASS_REFERENCE.warrior.buildingTypeId,
    vehicle_factory: LAST_SHELTER_TROOP_CLASS_REFERENCE.vehicle.buildingTypeId,
    shooter_camp: LAST_SHELTER_TROOP_CLASS_REFERENCE.shooter.buildingTypeId
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

const RAW_BUILDING_LEVELS_BY_TYPE =
  Object.freeze(
    Object.fromEntries(
      Object.values(RAW_BUILDING_ROWS)
        .map(buildingRowHazirla)
        .filter(row =>
          /^4\d{5}$/.test(
            String(
              row &&
              row.buildingTypeId ||
              ""
            )
          )
        )
        .reduce((groups,row) => {
          const typeId =
            String(row.buildingTypeId);

          if (!groups.has(typeId)) {
            groups.set(
              typeId,
              []
            );
          }

          groups
            .get(typeId)
            .push(row);

          return groups;
        },new Map())
        .entries()
    )
  );

const RAW_MAIN_BUILDING_LEVELS =
  Object.freeze(
    Object.fromEntries(
      (
        RAW_BUILDING_LEVELS_BY_TYPE[
          "400000"
        ] ||
        []
      )
        .map(row => [
          row.level,
          row
        ])
    )
  );

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

  if (/^4\d{5}$/.test(key)) {
    return Object.prototype.hasOwnProperty.call(
      RAW_BUILDING_LEVELS_BY_TYPE,
      key
    )
      ? key
      : null;
  }

  return (
    RDC_TO_LAST_SHELTER_BUILDING_TYPE[
      key
    ] ||
    null
  );
}

function canonicalBuildingTypeIdAl(buildingId) {
  const mapped = rdcBuildingTypeIdAl(buildingId);
  if (mapped) return mapped;
  return metnAl(buildingId, 64).toLowerCase();
}

function buildingTypeLeveliniAl(
  buildingId,
  level
) {
  const typeId =
    rdcBuildingTypeIdAl(
      buildingId
    );

  if (!typeId) {
    return null;
  }

  const lvl =
    tamEded(
      level
    );

  const rows =
    RAW_BUILDING_LEVELS_BY_TYPE[
      typeId
    ] ||
    [];

  const raw =
    rows.find(
      row =>
        Number(row.level) ===
        lvl
    ) ||
    null;

  if (!raw) {
    return null;
  }

  return {
    ...raw,
    cost:
      xercHazirla(
        raw
      ),
    buildingConditions:
      sertleriParseEt(
        raw.buildingConditionRaw
      )
  };
}

function buildingTypeMaxLevelAl(
  buildingId
) {
  const typeId =
    rdcBuildingTypeIdAl(
      buildingId
    );

  if (!typeId) {
    return 0;
  }

  const rows =
    RAW_BUILDING_LEVELS_BY_TYPE[
      typeId
    ] ||
    [];

  if (rows.length === 0) {
    return 0;
  }

  const declared =
    rows
      .map(
        row =>
          tamEded(
            row.maxLevelFromXml
          )
      )
      .filter(
        value =>
          value > 0
      );

  if (declared.length > 0) {
    return Math.max(
      ...declared
    );
  }

  return Math.max(
    ...rows.map(
      row =>
        tamEded(
          row.level
        )
    )
  );
}

function authoritativeBuildingMaxLevelAl(buildingId) {
  const typeId=rdcBuildingTypeIdAl(buildingId);
  if(!typeId) return 0;

  return Math.max(
    buildingTypeMaxLevelAl(typeId),
    troopBuildingRequiredMaxLevelAl(typeId)
  );
}

function authoritativeBuildingConditionsAl(buildingId, targetLevel) {
  const level = Math.max(1, tamEded(targetLevel, 1));
  const row = buildingTypeLeveliniAl(buildingId, level - 1);
  if (!row || !Array.isArray(row.buildingConditions)) return [];
  return row.buildingConditions.map(condition => ({ ...condition }));
}

function authoritativeBuildingConditionsYoxla(
  buildingId,
  targetLevel,
  highestLevelResolver
) {
  const conditions = authoritativeBuildingConditionsAl(
    buildingId,
    targetLevel
  );

  if (conditions.length === 0) {
    return { ok:true, conditions:[] };
  }

  if (typeof highestLevelResolver !== "function") {
    return {
      ok:false,
      reason:"highest_level_resolver_required",
      conditions
    };
  }

  for (const condition of conditions) {
    const requiredTypeId = canonicalBuildingTypeIdAl(
      condition.buildingTypeId
    );
    const requiredLevel = Math.max(1, tamEded(condition.level, 1));
    const currentLevel = Math.max(
      0,
      tamEded(highestLevelResolver(requiredTypeId), 0)
    );

    if (currentLevel < requiredLevel) {
      return {
        ok:false,
        reason:"building_prerequisite_missing",
        requiredBuildingTypeId:requiredTypeId,
        requiredLevel,
        currentLevel,
        conditions
      };
    }
  }

  return { ok:true, conditions };
}

function authoritativeBuildingMetaAl(
  buildingId
) {
  const typeId =
    rdcBuildingTypeIdAl(
      buildingId
    );

  if (!typeId) {
    return null;
  }

  const row =
    buildingTypeLeveliniAl(
      typeId,
      0
    ) ||
    buildingTypeLeveliniAl(
      typeId,
      1
    );

  if (!row) {
    return null;
  }

  const tiles =
    Math.max(
      1,
      tamEded(
        row.tiles,
        1
      )
    );

  const num =
    Math.max(
      1,
      tamEded(
        row.num,
        1
      )
    );

  return Object.freeze({
    source:
      "last_shelter_building_xml",
    buildingTypeId:
      typeId,
    sizeX:
      tiles,
    sizeZ:
      tiles,
    isRoad:
      typeId ===
      "436000",
    requiresRoad:
      typeId !==
        "400000" &&
      typeId !==
        "436000",
    placementMode:
      "normal",
    requiredSlotType:
      null,
    multiBuild:
      num > 1,
    maxPlacedCount:
      num,
    builderSlotsRequired:
      1,
    maxLevel:
      Math.max(
        1,
        authoritativeBuildingMaxLevelAl(
          typeId
        )
      )
  });
}

module.exports = {
  RDC_TO_LAST_SHELTER_BUILDING_TYPE,
  RAW_MAIN_BUILDING_LEVELS,
  RAW_BUILDING_LEVELS_BY_TYPE,
  RAW_BUILDING_ROWS,
  buildingXmlRowAl,
  buildingRowHazirla,
  sertleriParseEt,
  mainBuildingLeveliniAl,
  buildingTypeLeveliniAl,
  buildingTypeMaxLevelAl,
  authoritativeBuildingMaxLevelAl,
  authoritativeBuildingConditionsAl,
  authoritativeBuildingConditionsYoxla,
  authoritativeBuildingMetaAl,
  canonicalBuildingTypeIdAl,
  rdcBuildingTypeIdAl
};