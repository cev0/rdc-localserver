"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_TROOP_TRANSFER_TREES,
  troopTransferTreeAl,
  troopTransferPointAl,
  troopTransferRuntimeDefaultHazirla
} = require("./last_shelter_troop_transfer_reference");

assert.strictEqual(LAST_SHELTER_TROOP_TRANSFER_TREES.length, 4);

for (const type of [1,2,3,4]) {
  const tree = troopTransferTreeAl(type);
  assert.ok(tree);
  assert.strictEqual(tree.total, 10);
  assert.strictEqual(tree.level, 0);
  assert.strictEqual(tree.todayTranTimes, 0);
  assert.strictEqual(tree.power, 0);
  assert.strictEqual(tree.exp, 0);
  assert.strictEqual(tree.singleCostAmount, 10);
  assert.strictEqual(tree.details.length, 12);
  assert.deepStrictEqual(
    tree.details.map(x => x.pointType),
    ["1","2","3","4","5","6","7","8","9","10","11","12"]
  );
}

assert.deepStrictEqual(troopTransferPointAl(1, 1), {
  level: 0,
  pointType: "1",
  id: "109000"
});
assert.deepStrictEqual(troopTransferPointAl(1, 12), {
  level: 0,
  pointType: "12",
  id: "109048"
});
assert.deepStrictEqual(troopTransferPointAl(2, 12), {
  level: 0,
  pointType: "12",
  id: "109098"
});
assert.deepStrictEqual(troopTransferPointAl(3, 12), {
  level: 0,
  pointType: "12",
  id: "109148"
});
assert.deepStrictEqual(troopTransferPointAl(4, 12), {
  level: 0,
  pointType: "12",
  id: "109198"
});

const runtime = troopTransferRuntimeDefaultHazirla();
runtime[0].details[0].id = "changed";
assert.strictEqual(
  LAST_SHELTER_TROOP_TRANSFER_TREES[0].details[0].id,
  "109000"
);

assert.strictEqual(troopTransferTreeAl(99), null);
assert.strictEqual(troopTransferPointAl(99, 1), null);

console.log("PASS: verified Last Shelter troop-transfer trees are preserved.");
