"use strict";

const assert = require("assert");

const {
  SCIENCE_PROTOCOL,
  RAW_SCIENCE,
  researchNeedParseEt,
  scienceMelumatiniAl,
  scienceIdleriAl
} = require("./last_shelter_science_kataloqu");

assert.strictEqual(SCIENCE_PROTOCOL.researchRequest, "science.research");
assert.strictEqual(SCIENCE_PROTOCOL.upgradeRequest, "science.upgrade");
assert.strictEqual(SCIENCE_PROTOCOL.directRequest, "science.directly");
assert.deepStrictEqual(SCIENCE_PROTOCOL.researchFields, {
  itemId: "itemId",
  queueUuid: "quuid",
  optionalGold: "gold"
});
assert.strictEqual(SCIENCE_PROTOCOL.queueType, "SCIENCE");
assert.strictEqual(SCIENCE_PROTOCOL.queueRequired, true);
assert.strictEqual(SCIENCE_PROTOCOL.queueUuidOptional, true);
assert.strictEqual(SCIENCE_PROTOCOL.blankQueueUuidUsesFreeQueue, true);
assert.strictEqual(SCIENCE_PROTOCOL.suppliedQueueUuidMustBeFreeScienceQueue, true);
assert.strictEqual(SCIENCE_PROTOCOL.secondQueueRequiresUnlock, true);
assert.strictEqual(SCIENCE_PROTOCOL.queueFullError, "BUILDING_QUEUE_FULL");
assert.strictEqual(SCIENCE_PROTOCOL.duplicateItemRejected, true);
assert.strictEqual(SCIENCE_PROTOCOL.serverCalculatesResearchCost, true);
assert.strictEqual(SCIENCE_PROTOCOL.serverCalculatesResearchTime, true);
assert.strictEqual(SCIENCE_PROTOCOL.queueIsOccupiedUntilServerFinishTime, true);
assert.deepStrictEqual(SCIENCE_PROTOCOL.successResponseFields, ["resource", "queue", "gold"]);

assert.deepStrictEqual(scienceIdleriAl(), ["901000", "901100", "901200", "901300"]);
assert.strictEqual(Object.isFrozen(RAW_SCIENCE), true);

const s901000 = scienceMelumatiniAl("901000");
assert.ok(s901000);
assert.strictEqual(s901000.buildingCondition, "403001");
assert.strictEqual(s901000.researchTimeSeconds, 90);
assert.strictEqual(s901000.maxLevel, 1);
assert.strictEqual(s901000.para1, "801");
assert.deepStrictEqual(s901000.researchNeed, [
  { typeCode: 0, amount: 0 },
  { typeCode: 1, amount: 0 },
  { typeCode: 2, amount: 0 },
  { typeCode: 3, amount: 0 },
  { typeCode: 14, amount: 1000 }
]);

const s901200 = scienceMelumatiniAl("901200");
assert.strictEqual(s901200.quality, 2);
assert.strictEqual(s901200.researchTimeSeconds, 180);
assert.strictEqual(s901200.para1, "803");
assert.deepStrictEqual(researchNeedParseEt("0"), []);
assert.strictEqual(scienceMelumatiniAl("999999"), null);

console.log("PASS: Last Shelter science.xml catalog and verified queue-selection contract are preserved.");
