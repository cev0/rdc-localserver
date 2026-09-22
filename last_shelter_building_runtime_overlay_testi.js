"use strict";
const assert = require("assert");
const { verifiedLastShelterBuildingLevelDataAl: level, verifiedLastShelterBuildingMaxLevelAl: max,
  verifiedLastShelterBuildingLevelStatusAl: status } = require("./last_shelter_building_runtime_overlay");
const first = level("hq", 1);
assert.strictEqual(first.source, "last_shelter_v1.250.102_building_xml_verified");
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
const farmStatus = status("farm", 1);
assert.strictEqual(farmStatus.mapped, true);
assert.strictEqual(farmStatus.buildingTypeId, "415000");
assert.ok(level("farm", 1));
assert.strictEqual(status("unknown_building",1).mapped,false);
assert.strictEqual(level("unknown_building",1),null);


console.log("PASS: complete HQ costs use the current XML level and enforce the declared cap.");
