"use strict";

const assert = require("assert");

const {
  RAW_SCIENCE_TREE,
  goodsNeedParseEt,
  scienceTreeMelumatiniAl,
  scienceTreeIdleriniAl
} = require("./last_shelter_science_tree_reference");

assert.strictEqual(
  scienceTreeIdleriniAl().length,
  58,
  "GetScienceInfo bulk topology batch must preserve all 58 verified nodes."
);

assert.strictEqual(
  Object.isFrozen(RAW_SCIENCE_TREE),
  true
);

const root = scienceTreeMelumatiniAl("901600");
assert.ok(root);
assert.strictEqual(root.maxLevel, 1);
assert.strictEqual(root.buildingCondition, "403001");
assert.strictEqual(root.para1, "816");
assert.deepStrictEqual(
  root.scienceConditions,
  ["901401", "901501"]
);

const economy = scienceTreeMelumatiniAl("902500");
assert.deepStrictEqual(
  economy.goodsNeed,
  {
    itemId: "210163",
    amount: 5
  }
);
assert.strictEqual(
  economy.buildingCondition,
  "403001"
);

const multiEffect = scienceTreeMelumatiniAl("902800");
assert.strictEqual(
  multiEffect.para1,
  "832|833|834|835|836|837|838"
);
assert.deepStrictEqual(
  multiEffect.scienceConditions,
  ["974501", "970501", "972501"]
);
assert.deepStrictEqual(
  multiEffect.goodsNeed,
  {
    itemId: "210163",
    amount: 1
  }
);

const lateA = scienceTreeMelumatiniAl("905200");
assert.deepStrictEqual(
  lateA.scienceConditions,
  ["905110", "904910", "905010"]
);
assert.strictEqual(lateA.buildingCondition, "403006");

const lateB = scienceTreeMelumatiniAl("906800");
assert.strictEqual(
  lateB.scienceTypeCondition,
  "20004002"
);
assert.deepStrictEqual(
  lateB.scienceConditions,
  ["906710", "906510", "906610"]
);

const paired = scienceTreeMelumatiniAl("906600");
assert.strictEqual(paired.maxLevel, 10);
assert.strictEqual(paired.nextPara2, "2");
assert.deepStrictEqual(
  paired.scienceConditions,
  ["906901", "907101"]
);

const special = scienceTreeMelumatiniAl("903700");
assert.strictEqual(special.para2, "10");
assert.strictEqual(special.nextPara2, "15");
assert.deepStrictEqual(
  special.goodsNeed,
  {
    itemId: "210163",
    amount: 180
  }
);

assert.deepStrictEqual(
  goodsNeedParseEt("210163;180"),
  {
    itemId: "210163",
    amount: 180
  }
);
assert.strictEqual(
  goodsNeedParseEt(""),
  null
);
assert.strictEqual(
  scienceTreeMelumatiniAl("999999999"),
  null
);

for (const node of Object.values(RAW_SCIENCE_TREE)) {
  assert.ok(/^\d+$/.test(node.itemId));
  assert.ok(Number.isInteger(node.maxLevel));
  assert.ok(node.maxLevel > 0);

  // Runtime topology reference deliberately excludes transformed response
  // research_need/time_research from authoritative XML balance semantics.
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(node, "researchNeed"),
    false
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(node, "researchTimeSeconds"),
    false
  );
}

console.log(
  "PASS: Last Shelter GetScienceInfo bulk science-tree topology is preserved without overriding raw XML costs/times."
);
