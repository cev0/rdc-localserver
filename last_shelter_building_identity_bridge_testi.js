"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  LAST_SHELTER_HQ_BUILDING_ID,
  LAST_SHELTER_ROAD_BUILDING_ID,
  authoritativeBuildingMetaForRuntimeId,
  canonicalRuntimeBuildingId,
  isHeadquartersBuildingId,
  isRoadBuildingId,
  mappedLastShelterBuildingTypeId,
  sameCanonicalBuildingType,
  stateHighestBuildingLevel
} = require("./last_shelter_building_identity_bridge");

assert.strictEqual(LAST_SHELTER_HQ_BUILDING_ID, "400000");
assert.strictEqual(LAST_SHELTER_ROAD_BUILDING_ID, "436000");
assert.strictEqual(canonicalRuntimeBuildingId("hq"), "400000");
assert.strictEqual(canonicalRuntimeBuildingId("road"), "436000");
assert.strictEqual(canonicalRuntimeBuildingId("400000"), "400000");
assert.strictEqual(canonicalRuntimeBuildingId("436000"), "436000");
assert.strictEqual(mappedLastShelterBuildingTypeId("unknown_rdc"), null);

assert.strictEqual(sameCanonicalBuildingType("hq", "400000"), true);
assert.strictEqual(sameCanonicalBuildingType("road", "436000"), true);
assert.strictEqual(sameCanonicalBuildingType("unknown_rdc", "400000"), false);
assert.strictEqual(isHeadquartersBuildingId("400000"), true);
assert.strictEqual(isRoadBuildingId("436000"), true);

const roadMeta = authoritativeBuildingMetaForRuntimeId("436000");
const hqMeta = authoritativeBuildingMetaForRuntimeId("hq");
assert.ok(roadMeta);
assert.ok(hqMeta);
assert.strictEqual(roadMeta.isRoad, true);
assert.strictEqual(roadMeta.requiresRoad, false);
assert.strictEqual(hqMeta.buildingTypeId, "400000");
assert.strictEqual(hqMeta.requiresRoad, false);

const mixedState = {
  buildings:[
    {buildingId:"400000",level:3,isCompleted:true},
    {buildingId:"hq",level:2,isCompleted:true},
    {buildingId:"436000",level:1,isCompleted:true},
    {buildingId:"house",level:4,isCompleted:false},
    {buildingId:"433000",level:2,isCompleted:true}
  ]
};

assert.strictEqual(stateHighestBuildingLevel(mixedState, "hq"), 3);
assert.strictEqual(stateHighestBuildingLevel(mixedState, "400000"), 3);
assert.strictEqual(stateHighestBuildingLevel(mixedState, "road"), 1);
assert.strictEqual(stateHighestBuildingLevel(mixedState, "house"), 4);
assert.strictEqual(
  stateHighestBuildingLevel(mixedState, "433000", {completedOnly:true}),
  2
);

const serverSource = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
assert.match(serverSource,/buildingId:\s*LAST_SHELTER_HQ_BUILDING_ID/);
assert.match(serverSource,/buildingId:\s*LAST_SHELTER_ROAD_BUILDING_ID/);
assert.doesNotMatch(serverSource,/buildingId:\s*["']hq["']/);
assert.doesNotMatch(serverSource,/buildingId:\s*["']road["']/);

console.log(
  "PASS: server identity bridge accepts compatibility aliases and emits authoritative numeric HQ/road IDs."
);
