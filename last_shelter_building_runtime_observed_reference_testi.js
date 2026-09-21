"use strict";

const assert = require("assert");
const {
  BUILDING_RUNTIME_STABLE,
  buildingRuntimeStableAl,
  buildingRuntimeStableIdsAl,
  minimumObservationCountAl
} = require("./last_shelter_building_runtime_observed_reference");

assert.strictEqual(buildingRuntimeStableIdsAl().length,21);
assert.ok(Object.isFrozen(BUILDING_RUNTIME_STABLE));

for (const row of Object.values(BUILDING_RUNTIME_STABLE)) {
  assert.ok(row.observedSnapshots >= 2);
  for (const dynamicField of ["uuid","pos","refreshTime","heroId"]) {
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(row,dynamicField),
      false,
      row.itemId + ":" + row.level + ":" + dynamicField
    );
  }
}

assert.deepStrictEqual(
  buildingRuntimeStableAl("413000",1),
  {
    itemId:"413000",level:1,observedSnapshots:3,building:"",
    wood:0,food:140,stone:0,iron:0,silver:0,destroy_time:1,
    time:150,exp:8,power:1,para1:"120",para2:"1200",para3:"2",
    nextLevelParas:"240,2400,4",is_stationed:0,opType:0
  }
);

assert.deepStrictEqual(
  buildingRuntimeStableAl("414000",1),
  {
    itemId:"414000",level:1,observedSnapshots:2,building:"400000;2",
    wood:224,food:0,stone:0,iron:0,silver:0,destroy_time:290,
    time:582,exp:12,power:1,para1:"20",para2:"200",para3:"3",
    nextLevelParas:"40,400,6",is_stationed:0,opType:0
  }
);

assert.strictEqual(buildingRuntimeStableAl("402000",25).power,23851);
assert.strictEqual(buildingRuntimeStableAl("403000",25).power,32013);
assert.strictEqual(buildingRuntimeStableAl("419000",25).power,54337);
assert.strictEqual(buildingRuntimeStableAl("460000",25).time,676800);
assert.strictEqual(buildingRuntimeStableAl("400000",26).power,327113);
assert.strictEqual(minimumObservationCountAl("418000",25),4);
assert.strictEqual(buildingRuntimeStableAl("999999",1),null);

const copy = buildingRuntimeStableAl("410000",25);
copy.power=1;
assert.strictEqual(BUILDING_RUNTIME_STABLE["410000:25"].power,9358);

console.log("PASS: cross-snapshot-stable Last Shelter building runtime rows are preserved separately from raw building.xml.");
