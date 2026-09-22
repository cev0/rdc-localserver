"use strict";

/*
 * Last Shelter Survival v1.250.102 science.xml reference catalog.
 *
 * Full source XML level catalog. Raw numeric resource codes remain available;
 * their verified Java enum mapping lives in last_shelter_resource_types.js.
 */

function metnAl(value, max = 128) {
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

function researchNeedParseEt(raw) {
  const text = metnAl(raw, 512);

  if (!text || text === "0") {
    return [];
  }

  return text
    .split("|")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [typeCodeRaw, amountRaw] =
        part.split(";");

      return Object.freeze({
        typeCode:
          tamEded(typeCodeRaw),
        amount:
          tamEded(amountRaw)
      });
    });
}

const SCIENCE_PROTOCOL = Object.freeze({
  researchRequest: "science.research",
  upgradeRequest: "science.upgrade",
  directRequest: "science.directly",
  researchFields: Object.freeze({
    itemId: "itemId",
    queueUuid: "quuid",
    optionalGold: "gold"
  }),
  queueType: "SCIENCE",
  queueRequired: true,
  queueUuidOptional: true,
  blankQueueUuidUsesFreeQueue: true,
  suppliedQueueUuidMustBeFreeScienceQueue: true,
  secondQueueRequiresUnlock: true,
  queueFullError: "BUILDING_QUEUE_FULL",
  duplicateItemRejected: true,
  serverCalculatesResearchCost: true,
  serverCalculatesResearchTime: true,
  queueIsOccupiedUntilServerFinishTime: true,
  successResponseFields: Object.freeze([
    "resource",
    "queue",
    "gold"
  ])
});

// All 4,596 level rows come from the checksummed XML snapshot. Runtime node
// IDs remain the 441 level-zero roots; terminal rows have no research timer.
const { sourceCatalog } = require("./last_shelter_source_catalog");
const RAW_SCIENCE = Object.freeze(Object.fromEntries(
  sourceCatalog.rows("science").map(row => [row.id, Object.freeze({
    itemId: row.id,
    rootItemId: String(Number(row.id) - Number(row.science_lv)),
    quality: Number(row.quality),
    scienceLevel: Number(row.science_lv),
    maxLevel: Number(row.max_lv),
    buildingCondition: row.building_condition || "",
    scienceCondition: row.science_condition || "",
    scienceConditionNew: row.science_condition_new || "",
    scienceTypeCondition: row.science_type_condition || "",
    goodsNeedRaw: row.goods_need || "",
    researchNeedRaw: row.research_need || "0",
    researchTimeSeconds: row.time_research == null ? null : Number(row.time_research),
    para1: row.para1 || "",
    para2: row.para2 || "0",
    power: Number(row.power || 0),
    effectType: Number(row.effect_type || 0),
    sourceAttributes: Object.freeze({ ...row })
  })])
));
sourceCatalog.release("science");

function scienceMelumatiniAl(itemId) {
  const id = metnAl(itemId, 32);

  const raw =
    RAW_SCIENCE[id];

  if (!raw) {
    return null;
  }

  return {
    ...raw,
    researchNeed:
      researchNeedParseEt(
        raw.researchNeedRaw
      )
  };
}

function scienceIdleriAl() {
  return Object.keys(RAW_SCIENCE).filter(id => RAW_SCIENCE[id].scienceLevel === 0);
}

function scienceLevelMelumatiniAl(rootItemId, level) {
  const root = RAW_SCIENCE[metnAl(rootItemId, 32)];
  if (!root || root.scienceLevel !== 0 || !Number.isInteger(level) || level < 0 || level > root.maxLevel) return null;
  return scienceMelumatiniAl(String(Number(rootItemId) + level));
}

module.exports = {
  SCIENCE_PROTOCOL,
  RAW_SCIENCE,
  researchNeedParseEt,
  scienceMelumatiniAl,
  scienceIdleriAl,
  scienceLevelMelumatiniAl
};
