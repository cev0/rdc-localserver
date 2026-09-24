"use strict";

const {
  buildingTypeLeveliniAl,
  rdcBuildingTypeIdAl
} = require("./last_shelter_building_kataloqu");

const LAST_SHELTER_RESOURCE_PRODUCER_BY_TYPE = Object.freeze({
  "412000": "iron",
  "413000": "water",
  "414000": "wood",
  "415000": "food",
  "431000": "electricity",
  "432000": "fuel"
});

const LAST_SHELTER_RESOURCE_STORAGE_BY_TYPE = Object.freeze({
  "437000": "electricity",
  "438000": "fuel",
  "439000": "water",
  "440000": "food",
  "441000": "wood",
  "442000": "iron",
  "520000": "water",
  "521000": "water",
  "522000": "iron",
  "523000": "iron",
  "524000": "wood",
  "525000": "wood",
  "526000": "food",
  "527000": "food",
  "528000": "fuel",
  "529000": "fuel",
  "530000": "electricity",
  "531000": "electricity"
});

function levelAl(value) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(1, Math.trunc(n))
    : 1;
}

function sourceEffectRowAl(buildingId, level) {
  const typeId = rdcBuildingTypeIdAl(buildingId);
  if (!typeId) return null;

  const row = buildingTypeLeveliniAl(
    typeId,
    levelAl(level)
  );

  return row
    ? { typeId, row }
    : null;
}

function lastShelterResourceProductionReferenceAl(
  buildingId,
  level,
  tickMs = 5000
) {
  const source = sourceEffectRowAl(buildingId, level);
  if (!source) return null;

  const resourceType =
    LAST_SHELTER_RESOURCE_PRODUCER_BY_TYPE[
      source.typeId
    ] ||
    null;

  if (!resourceType) return null;

  const amountPerHour =
    Math.max(
      0,
      Number(source.row.para1) || 0
    );

  const tick =
    Math.max(
      1,
      Number(tickMs) || 5000
    );

  return Object.freeze({
    source: "last_shelter_building_xml_para1",
    buildingTypeId: source.typeId,
    level: levelAl(level),
    resourceType,
    amountPerHour,
    amountPerTick:
      amountPerHour *
      (tick / 3600000)
  });
}

function lastShelterResourceStorageReferenceAl(
  buildingId,
  level
) {
  const source = sourceEffectRowAl(buildingId, level);
  if (!source) return null;

  const resourceType =
    LAST_SHELTER_RESOURCE_STORAGE_BY_TYPE[
      source.typeId
    ] ||
    null;

  if (!resourceType) return null;

  return Object.freeze({
    source: "last_shelter_building_xml_para1",
    buildingTypeId: source.typeId,
    level: levelAl(level),
    resourceType,
    capacity:
      Math.max(
        0,
        Number(source.row.para1) || 0
      )
  });
}

module.exports = {
  LAST_SHELTER_RESOURCE_PRODUCER_BY_TYPE,
  LAST_SHELTER_RESOURCE_STORAGE_BY_TYPE,
  lastShelterResourceProductionReferenceAl,
  lastShelterResourceStorageReferenceAl
};
