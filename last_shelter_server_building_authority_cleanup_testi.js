"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  authoritativeBuildingMetaForRuntimeId,
  mappedLastShelterBuildingTypeId
} = require("./last_shelter_building_identity_bridge");

const {
  lastShelterResourceProductionReferenceAl,
  lastShelterResourceStorageReferenceAl
} = require("./last_shelter_resource_building_reference");

const {
  verifiedLastShelterBuildingLevelDataAl,
  verifiedLastShelterBuildingLevelStatusAl
} = require("./last_shelter_building_runtime_overlay");

const source = fs.readFileSync(
  path.join(__dirname, "server.js"),
  "utf8"
);

assert.ok(
  source.includes("const LEGACY_RDC_BUILDING_LEVEL_CONFIG = {"),
  "Unmapped RDC level fallback must be explicitly marked compatibility-only."
);

assert.ok(
  !source.includes("const BUILDING_LEVEL_CONFIG = {"),
  "Old generic custom building level source must be removed."
);

const legacyLevelStart =
  source.indexOf("const LEGACY_RDC_BUILDING_LEVEL_CONFIG = {");
const legacyMetaStart =
  source.indexOf("const LEGACY_RDC_BUILDING_DEFINITION_META = {");

assert.ok(legacyLevelStart >= 0);
assert.ok(legacyMetaStart > legacyLevelStart);

const legacyLevelBlock =
  source.slice(legacyLevelStart, legacyMetaStart);

assert.ok(!/^\s*hq\s*:/m.test(legacyLevelBlock));
assert.ok(!/^\s*road\s*:/m.test(legacyLevelBlock));

const legacyMetaEnd =
  source.indexOf(
    "let EXTERNAL_BUILDING_DEFINITION_META",
    legacyMetaStart
  );

const legacyMetaBlock =
  source.slice(legacyMetaStart, legacyMetaEnd);

for (const mappedAlias of [
  "bank",
  "embassy",
  "hospital",
  "house",
  "hq",
  "ration_truck",
  "clone_center",
  "road",
  "tower",
  "institute",
  "fighter_camp",
  "vehicle_factory",
  "shooter_camp",
  "farm",
  "refinery",
  "water_treatment_plant",
  "lumber_mill",
  "power_plant",
  "oil_well",
  "power_storage_facility_1",
  "power_storage_facility_2",
  "power_storage_facility_3",
  "oil_storage_tank_1",
  "oil_storage_tank_2",
  "oil_storage_tank_3",
  "water_tank_1",
  "water_tank_2",
  "water_tank_3",
  "granary_1",
  "granary_2",
  "granary_3",
  "lumber_warehouse_1",
  "lumber_warehouse_2",
  "lumber_warehouse_3",
  "iron_warehouse_1",
  "iron_warehouse_2",
  "iron_warehouse_3"
]) {
  assert.ok(
    !new RegExp(
      '^\\s*"' + mappedAlias + '"\\s*:',
      "m"
    ).test(legacyMetaBlock),
    mappedAlias + " must not keep duplicate legacy metadata."
  );
}

for (const mappedTroopAlias of [
  "fighter_camp",
  "vehicle_factory",
  "shooter_camp"
]) {
  assert.ok(
    !new RegExp("^\\s*" + mappedTroopAlias + "\\s*:", "m").test(legacyLevelBlock),
    mappedTroopAlias + " must not keep legacy level balance."
  );
}

for (const [alias, numericId] of [
  ["hq", "400000"],
  ["road", "436000"],
  ["clone_center", "462000"],
  ["farm", "415000"],
  ["institute", "403000"],
  ["fighter_camp", "423000"],
  ["vehicle_factory", "424000"],
  ["shooter_camp", "425000"],
  ["refinery", "412000"],
  ["water_treatment_plant", "413000"],
  ["lumber_mill", "414000"],
  ["power_plant", "431000"],
  ["oil_well", "432000"],
  ["power_storage_facility_1", "437000"],
  ["power_storage_facility_2", "530000"],
  ["power_storage_facility_3", "531000"],
  ["oil_storage_tank_1", "438000"],
  ["oil_storage_tank_2", "528000"],
  ["oil_storage_tank_3", "529000"],
  ["water_tank_1", "439000"],
  ["water_tank_2", "520000"],
  ["water_tank_3", "521000"],
  ["granary_1", "440000"],
  ["granary_2", "526000"],
  ["granary_3", "527000"],
  ["lumber_warehouse_1", "441000"],
  ["lumber_warehouse_2", "524000"],
  ["lumber_warehouse_3", "525000"],
  ["iron_warehouse_1", "442000"],
  ["iron_warehouse_2", "522000"],
  ["iron_warehouse_3", "523000"]
]) {
  assert.strictEqual(
    mappedLastShelterBuildingTypeId(alias),
    numericId
  );
}

for (const [alias, requiredSlotType] of [
  ["farm", "food"],
  ["water_treatment_plant", "water"],
  ["lumber_mill", "wood"],
  ["refinery", "iron"],
  ["oil_well", "fuel"]
]) {
  const meta = authoritativeBuildingMetaForRuntimeId(alias);
  assert.ok(meta, alias + " must have authoritative building.xml metadata.");
  assert.strictEqual(meta.placementMode, "resource_slot");
  assert.strictEqual(meta.requiredSlotType, requiredSlotType);
}

const farmProduction =
  lastShelterResourceProductionReferenceAl("farm", 1, 5000);
assert.ok(farmProduction);
assert.strictEqual(farmProduction.buildingTypeId, "415000");
assert.strictEqual(farmProduction.resourceType, "food");
assert.strictEqual(farmProduction.amountPerHour, 400);
assert.ok(Math.abs(farmProduction.amountPerTick - (400 / 720)) < 1e-12);

const powerProduction =
  lastShelterResourceProductionReferenceAl("power_plant", 1, 5000);
assert.ok(powerProduction);
assert.strictEqual(powerProduction.buildingTypeId, "431000");
assert.strictEqual(powerProduction.resourceType, "electricity");
assert.strictEqual(powerProduction.amountPerHour, 2200);

for (const [alias, typeId, resourceType, capacity] of [
  ["power_storage_facility_1", "437000", "electricity", 20000],
  ["oil_storage_tank_1", "438000", "fuel", 30000],
  ["water_tank_1", "439000", "water", 30000],
  ["granary_1", "440000", "food", 30000],
  ["lumber_warehouse_1", "441000", "wood", 30000],
  ["iron_warehouse_1", "442000", "iron", 25000],
  ["water_tank_2", "520000", "water", 1000000],
  ["water_tank_3", "521000", "water", 20000000]
]) {
  const storage =
    lastShelterResourceStorageReferenceAl(alias, 1);
  assert.ok(storage, alias + " must resolve source capacity.");
  assert.strictEqual(storage.buildingTypeId, typeId);
  assert.strictEqual(storage.resourceType, resourceType);
  assert.strictEqual(storage.capacity, capacity);
}

const hqLevel1 =
  verifiedLastShelterBuildingLevelDataAl("hq", 1);

assert.ok(hqLevel1);
assert.strictEqual(hqLevel1.buildingTypeId, "400000");

const hqPastCap =
  verifiedLastShelterBuildingLevelStatusAl("hq", 26);

assert.strictEqual(hqPastCap.mapped, true);
assert.strictEqual(hqPastCap.withinDeclaredMax, false);
assert.strictEqual(hqPastCap.verified, false);

assert.ok(
  source.includes(
    'verifiedCoverage.mapped &&\n    !verifiedCoverage.verified'
  ),
  "Mapped level gaps/out-of-cap levels must fail closed before legacy fallback."
);

assert.ok(
  source.includes(
    "if (mappedLastShelterBuildingTypeId(id)) {\n          continue;"
  ),
  "Old building_definitions exports must be ignored for mapped Last Shelter IDs."
);

const legacyDefinitions = JSON.parse(
  fs.readFileSync(path.join(__dirname, "building_definitions.json"), "utf8")
);
const legacyDefinitionList = Array.isArray(legacyDefinitions)
  ? legacyDefinitions
  : (legacyDefinitions.definitions || legacyDefinitions.buildings || []);

for (const mappedAlias of [
  "bank",
  "embassy",
  "hospital",
  "house",
  "hq",
  "ration_truck",
  "road",
  "tower",
  "institute",
  "fighter_camp",
  "vehicle_factory",
  "shooter_camp",
  "farm",
  "refinery",
  "water_treatment_plant",
  "lumber_mill",
  "power_plant",
  "oil_well",
  "power_storage_facility_1",
  "power_storage_facility_2",
  "power_storage_facility_3",
  "oil_storage_tank_1",
  "oil_storage_tank_2",
  "oil_storage_tank_3",
  "water_tank_1",
  "water_tank_2",
  "water_tank_3",
  "granary_1",
  "granary_2",
  "granary_3",
  "lumber_warehouse_1",
  "lumber_warehouse_2",
  "lumber_warehouse_3",
  "iron_warehouse_1",
  "iron_warehouse_2",
  "iron_warehouse_3"
]) {
  assert.ok(
    !legacyDefinitionList.some(row =>
      String(row && row.id || "").trim().toLowerCase() === mappedAlias
    ),
    mappedAlias + " duplicate old building_definitions entry must be removed."
  );
}

console.log(
  "PASS: mapped Last Shelter buildings cannot fall back to old RDC balance/metadata."
);
