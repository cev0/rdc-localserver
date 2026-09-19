"use strict";

/*
 * Last Shelter Survival v1.250.102 science.xml reference catalog.
 *
 * Bu modul yalnız reference fayldan tam təsdiqlənmiş science node-larını
 * saxlayır. research_need daxilindəki numeric resource type-lar qəsdən
 * adlandırılmır; original server mapping-i ayrıca təsdiqlənənə qədər raw
 * kod + amount semantikası qorunur.
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
  queueFullError: "BUILDING_QUEUE_FULL",
  duplicateItemRejected: true,
  serverCalculatesResearchCost: true,
  serverCalculatesResearchTime: true
});

const RAW_SCIENCE = Object.freeze({
  "901000": Object.freeze({
    itemId: "901000",
    quality: 1,
    scienceLevel: 0,
    maxLevel: 1,
    buildingCondition: "403001",
    researchNeedRaw:
      "0;0|1;0|2;0|3;0|14;1000",
    researchTimeSeconds: 90,
    para1: "801",
    para2: "0",
    power: 0,
    effectType: 1
  }),

  "901100": Object.freeze({
    itemId: "901100",
    quality: 1,
    scienceLevel: 0,
    maxLevel: 1,
    buildingCondition: "403001",
    researchNeedRaw:
      "0;0|1;0|2;0|3;0|14;1000",
    researchTimeSeconds: 90,
    para1: "802",
    para2: "0",
    power: 0,
    effectType: 1
  }),

  "901200": Object.freeze({
    itemId: "901200",
    quality: 2,
    scienceLevel: 0,
    maxLevel: 1,
    buildingCondition: "403001",
    researchNeedRaw:
      "0;0|1;0|2;0|3;0|14;1000",
    researchTimeSeconds: 180,
    para1: "803",
    para2: "0",
    power: 0,
    effectType: 1
  }),

  "901300": Object.freeze({
    itemId: "901300",
    quality: 2,
    scienceLevel: 0,
    maxLevel: 1,
    buildingCondition: "403001",
    researchNeedRaw:
      "0;0|1;0|2;0|3;0|14;1000",
    researchTimeSeconds: 180,
    para1: "804",
    para2: "0",
    power: 0,
    effectType: 1
  })
});

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
  return Object.keys(
    RAW_SCIENCE
  );
}

module.exports = {
  SCIENCE_PROTOCOL,
  RAW_SCIENCE,
  researchNeedParseEt,
  scienceMelumatiniAl,
  scienceIdleriAl
};
