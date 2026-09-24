"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  RDC_TO_LAST_SHELTER_BUILDING_TYPE,
  RAW_MAIN_BUILDING_LEVELS,
  RAW_BUILDING_LEVELS_BY_TYPE,
  sertleriParseEt,
  mainBuildingLeveliniAl,
  buildingTypeLeveliniAl,
  buildingTypeMaxLevelAl,
  authoritativeBuildingConditionsAl,
  authoritativeBuildingConditionsYoxla,
  authoritativeBuildingMetaAl,
  canonicalBuildingTypeIdAl,
  rdcBuildingTypeIdAl
} = require("./last_shelter_building_kataloqu");

const {
  verifiedLastShelterBuildingPrerequisitesYoxla
} = require("./last_shelter_building_runtime_overlay");

assert.strictEqual(rdcBuildingTypeIdAl("hq"), "400000");
assert.strictEqual(rdcBuildingTypeIdAl("house"), "433000");
assert.strictEqual(rdcBuildingTypeIdAl("ration_truck"), "460000");
assert.strictEqual(rdcBuildingTypeIdAl("clone_center"), "462000");
assert.strictEqual(rdcBuildingTypeIdAl("fighter_camp"), "423000");
assert.strictEqual(rdcBuildingTypeIdAl("vehicle_factory"), "424000");
assert.strictEqual(rdcBuildingTypeIdAl("shooter_camp"), "425000");
assert.strictEqual(canonicalBuildingTypeIdAl("hq"), "400000");
assert.strictEqual(canonicalBuildingTypeIdAl("433000"), "433000");
assert.strictEqual(Object.isFrozen(RDC_TO_LAST_SHELTER_BUILDING_TYPE), true);
assert.strictEqual(Object.isFrozen(RAW_MAIN_BUILDING_LEVELS), true);
assert.strictEqual(Object.isFrozen(RAW_BUILDING_LEVELS_BY_TYPE), true);

const level0 = mainBuildingLeveliniAl(0);
assert.ok(level0);
assert.strictEqual(level0.xmlId, "400000");
assert.strictEqual(level0.maxLevelFromXml, 25);
assert.strictEqual(level0.buildTimeSeconds, 5);
assert.deepStrictEqual(level0.cost, {
  wood:0, stone:0, iron:130, food:30, money:0, electricity:0, silver:0
});

const level1 = mainBuildingLeveliniAl(1);
assert.strictEqual(level1.xmlId, "400001");
assert.strictEqual(level1.buildTimeSeconds, 12);
assert.strictEqual(level1.power, 2323);
assert.deepStrictEqual(level1.cost, {
  wood:0, stone:0, iron:190, food:50, money:210, electricity:0, silver:0
});
assert.deepStrictEqual(level1.buildingConditions, [
  { buildingTypeId:"460000", level:1 },
  { buildingTypeId:"433000", level:1 }
]);

const level2 = mainBuildingLeveliniAl(2);
assert.strictEqual(level2.buildTimeSeconds, 50);
assert.strictEqual(level2.population, 180);
assert.strictEqual(level2.cost.wood, 200);
assert.strictEqual(level2.cost.iron, 290);

const level3 = mainBuildingLeveliniAl(3);
assert.strictEqual(level3.buildTimeSeconds, 120);
assert.strictEqual(level3.cost.food, 0);
assert.strictEqual(level3.power, 2771);

const level4 = mainBuildingLeveliniAl(4);
assert.strictEqual(level4.buildTimeSeconds, 710);
assert.strictEqual(level4.cost.stone, 500);
assert.strictEqual(level4.cost.food, 960);

const level5 = mainBuildingLeveliniAl(5);
assert.strictEqual(level5.buildTimeSeconds, 2110);
assert.strictEqual(level5.cost.stone, 1300);
assert.strictEqual(level5.cost.iron, 3600);
assert.deepStrictEqual(level5.buildingConditions, [
  { buildingTypeId:"460000", level:5 },
  { buildingTypeId:"434000", level:5 },
  { buildingTypeId:"450000", level:1 },
  { buildingTypeId:"433000", level:5 }
]);

assert.deepStrictEqual(sertleriParseEt(""), []);
assert.ok(mainBuildingLeveliniAl(6));
assert.ok(mainBuildingLeveliniAl(25));
assert.strictEqual(Object.keys(RAW_MAIN_BUILDING_LEVELS).length, 31);

// All building families are now addressable by their original numeric type id.
assert.ok(Object.keys(RAW_BUILDING_LEVELS_BY_TYPE).length > 1);
assert.ok(buildingTypeLeveliniAl("433000", 0));
assert.ok(buildingTypeMaxLevelAl("433000") > 0);
assert.ok(authoritativeBuildingMetaAl("hq"));
assert.strictEqual(authoritativeBuildingMetaAl("hq").buildingTypeId, "400000");
assert.strictEqual(authoritativeBuildingMetaAl("road").buildingTypeId, "436000");
assert.strictEqual(authoritativeBuildingMetaAl("road").isRoad, true);

const cloneCenterSource = buildingTypeLeveliniAl("clone_center", 0);
assert.ok(cloneCenterSource);
assert.strictEqual(cloneCenterSource.buildingTypeId, "462000");
assert.strictEqual(cloneCenterSource.sourceAttributes.clone_diamond, "980000");
assert.strictEqual(cloneCenterSource.sourceAttributes.rebirth_time, "86400");
assert.strictEqual(cloneCenterSource.maxLevelFromXml, 25);

// HQ level 2 consumes row 1 prerequisites from original building.xml.
assert.deepStrictEqual(authoritativeBuildingConditionsAl("hq", 2), [
  { buildingTypeId:"460000", level:1 },
  { buildingTypeId:"433000", level:1 }
]);

const prerequisiteLevels = {
  "460000":1,
  "433000":1
};
const prereqOk = authoritativeBuildingConditionsYoxla(
  "400000",
  2,
  id => prerequisiteLevels[id] || 0
);
assert.strictEqual(prereqOk.ok, true);

const prereqMissing = authoritativeBuildingConditionsYoxla(
  "hq",
  2,
  id => id === "460000" ? 1 : 0
);
assert.strictEqual(prereqMissing.ok, false);
assert.strictEqual(prereqMissing.reason, "building_prerequisite_missing");
assert.strictEqual(prereqMissing.requiredBuildingTypeId, "433000");
assert.strictEqual(prereqMissing.requiredLevel, 1);
assert.strictEqual(prereqMissing.currentLevel, 0);

const overlayPrereq = verifiedLastShelterBuildingPrerequisitesYoxla(
  "hq",
  2,
  id => prerequisiteLevels[id] || 0
);
assert.strictEqual(overlayPrereq.mapped, true);
assert.strictEqual(overlayPrereq.buildingTypeId, "400000");
assert.strictEqual(overlayPrereq.ok, true);

const legacyUnmapped = verifiedLastShelterBuildingPrerequisitesYoxla(
  "testbuilding",
  2,
  () => 0
);
assert.strictEqual(legacyUnmapped.mapped, false);
assert.strictEqual(legacyUnmapped.ok, true);

const legacyDefinitions = JSON.parse(
  fs.readFileSync(path.join(__dirname, "building_definitions.json"), "utf8")
);
const legacyList = Array.isArray(legacyDefinitions)
  ? legacyDefinitions
  : (legacyDefinitions.definitions || legacyDefinitions.buildings || []);

for (const mappedAlias of Object.keys(RDC_TO_LAST_SHELTER_BUILDING_TYPE)) {
  assert.ok(
    !legacyList.some(item =>
      String(item && item.id || "").toLowerCase() === mappedAlias
    ),
    "Mapped Last Shelter alias old building_definitions export-da qalmamalidir: " +
      mappedAlias
  );
}

const serverSource = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
assert.ok(/silver\s*:\s*0/.test(serverSource),
  "Server state Last Shelter silver resursunu saxlamalıdır.");

console.log("PASS: authoritative Last Shelter building catalog, numeric identity and prerequisites are preserved.");
