"use strict";
const assert = require("assert");
const { verifiedLastShelterBuildingLevelDataAl: level, verifiedLastShelterBuildingMaxLevelAl: max,
  verifiedLastShelterBuildingLevelStatusAl: status } = require("./last_shelter_building_runtime_overlay");
const first = level("hq", 1);
assert.strictEqual(first.source, "last_shelter_building_xml_authoritative");
assert.strictEqual(first.buildingTypeId, "400000");
assert.strictEqual(first.xmlId, "400000");
assert.strictEqual(first.targetXmlId, "400001");
assert.strictEqual(first.buildTimeSeconds, 5);
assert.deepStrictEqual(first.cost, [{ type:"iron", amount:130 }, { type:"food", amount:30 }]);
const fourth = level("HQ", 4);
assert.strictEqual(fourth.xmlId, "400003");
assert.strictEqual(fourth.buildTimeSeconds, 120);
assert.deepStrictEqual(fourth.cost, [{ type:"wood", amount:800 }, { type:"iron", amount:860 }, { type:"money", amount:710 }]);
assert.strictEqual(fourth.cost.some(row => row.type === "fuel"), false);
const sixth = level("hq", 6);
assert.strictEqual(sixth.buildTimeSeconds, 2110);
assert.deepStrictEqual(sixth.buildingConditions, [
  {buildingTypeId:"460000",level:5}, {buildingTypeId:"434000",level:5},
  {buildingTypeId:"450000",level:1}, {buildingTypeId:"433000",level:5}
]);
assert.strictEqual(max("hq"), 25);
assert.deepStrictEqual(status("hq",6), {mapped:true,buildingId:"hq",buildingTypeId:"400000",targetLevel:6,maxLevel:25,verified:true,withinDeclaredMax:true});
assert.strictEqual(level("hq",25).buildTimeSeconds,1893030);
assert.strictEqual(level("hq",25).cost.find(row => row.type === "money").amount,34000000);
assert.strictEqual(level("hq",26),null,"Source rows above the declared cap must not unlock higher levels");
const farmFirst = level("farm", 1);
assert.strictEqual(farmFirst.buildingTypeId, "415000");
assert.strictEqual(farmFirst.xmlId, "415000");
assert.strictEqual(farmFirst.targetXmlId, "415001");
assert.strictEqual(farmFirst.buildTimeSeconds, 2);
assert.deepStrictEqual(farmFirst.cost, [{ type:"iron", amount:100 }]);
assert.deepStrictEqual(farmFirst.buildingConditions, [
  { buildingTypeId:"400000", level:1 }
]);
assert.strictEqual(max("farm"),25);
console.log("PASS: complete HQ costs use the current XML level and enforce the declared cap.");
