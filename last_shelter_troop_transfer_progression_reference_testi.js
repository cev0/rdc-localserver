"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_TROOP_TRANSFER_LEVEL6,
  level6PointAl,
  level6AktivPointleriAl,
  level6RawEffectleriTopla,
  level6RawSkillleriTopla
} = require("./last_shelter_troop_transfer_progression_reference");

assert.strictEqual(
  LAST_SHELTER_TROOP_TRANSFER_LEVEL6.total,
  50
);
assert.strictEqual(
  LAST_SHELTER_TROOP_TRANSFER_LEVEL6.level,
  6
);
assert.strictEqual(
  LAST_SHELTER_TROOP_TRANSFER_LEVEL6.power,
  244
);
assert.strictEqual(
  LAST_SHELTER_TROOP_TRANSFER_LEVEL6.singleCostAmount,
  10
);

for (const type of [1,2,3,4]) {
  const points =
    level6AktivPointleriAl(type);

  assert.strictEqual(points.length,6);
  assert.deepStrictEqual(
    points.map(x => x.pointType),
    ["5","6","7","8","9","10"]
  );
  assert.ok(
    points.every(x => x.level === 1)
  );
}

assert.deepStrictEqual(
  level6PointAl(1,"109034"),
  {
    id:"109034",
    level:1,
    pointType:"5",
    skills:{},
    effects:{
      "1561":-5,
      "1531":-5,
      "1541":-5,
      "1551":-5
    }
  }
);

assert.deepStrictEqual(
  level6RawEffectleriTopla(1),
  {
    "1561":-5,
    "1531":-5,
    "1541":-5,
    "1551":-5,
    "1331":3,
    "1041":2,
    "1514":30,
    "1513":20,
    "1322":3,
    "1122":100
  }
);

assert.deepStrictEqual(
  level6RawSkillleriTopla(2),
  {
    "101004":1,
    "101024":1,
    "101021":1,
    "101005":1,
    "101025":1
  }
);

assert.deepStrictEqual(
  level6RawSkillleriTopla(3),
  {
    "101008":1,
    "101009":1
  }
);

assert.deepStrictEqual(
  level6RawSkillleriTopla(4),
  {
    "101013":1,
    "101018":1,
    "101014":1,
    "101012":1,
    "101015":1,
    "101019":1
  }
);

assert.deepStrictEqual(
  level6RawEffectleriTopla(4),
  {
    "1566":5,
    "1565":5,
    "1218":20,
    "1576":5,
    "1575":5
  }
);

assert.strictEqual(level6PointAl(99,"109034"),null);
assert.deepStrictEqual(level6AktivPointleriAl(99),[]);
assert.deepStrictEqual(level6RawEffectleriTopla(99),{});
assert.deepStrictEqual(level6RawSkillleriTopla(99),{});

assert.strictEqual(
  Object.isFrozen(
    LAST_SHELTER_TROOP_TRANSFER_LEVEL6
  ),
  true
);

console.log(
  "PASS: verified Last Shelter level-6 troop-transfer topology/effect/skill state is preserved without inventing effect semantics."
);
