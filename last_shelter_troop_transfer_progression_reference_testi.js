"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_TROOP_TRANSFER_LEVEL6,
  level6PointAl,
  level6AktivPointleriAl,
  level6RawEffectleriTopla,
  level6RawSkillleriTopla,
  level6RuntimeTreeProjectionHazirla,
  runtimeTreesProjectionHazirla
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

const runtimeLevel6 = {
  type:1,
  total:10,
  level:6,
  todayTranTimes:3,
  power:0,
  exp:777,
  singleCostAmount:10,
  details:[
    {id:"109000",pointType:"1",level:1},
    {id:"109034",pointType:"5",level:0},
    {id:"109036",pointType:"6",level:0},
    {id:"109038",pointType:"7",level:0},
    {id:"109040",pointType:"8",level:0},
    {id:"109042",pointType:"9",level:0},
    {id:"109044",pointType:"10",level:0}
  ]
};

const projectedLevel6 =
  level6RuntimeTreeProjectionHazirla(
    runtimeLevel6
  );

assert.strictEqual(projectedLevel6.total,50);
assert.strictEqual(projectedLevel6.level,6);
assert.strictEqual(projectedLevel6.power,244);
assert.strictEqual(projectedLevel6.exp,777);
assert.strictEqual(projectedLevel6.todayTranTimes,3);
assert.strictEqual(
  projectedLevel6.details.find(x=>x.id==="109000").level,
  1
);
assert.deepStrictEqual(
  projectedLevel6.details.find(x=>x.id==="109034").effects,
  {"1561":-5,"1531":-5,"1541":-5,"1551":-5}
);
assert.strictEqual(
  projectedLevel6.details.find(x=>x.id==="109034").level,
  1
);
assert.deepStrictEqual(
  runtimeTreesProjectionHazirla([runtimeLevel6])[0],
  projectedLevel6
);

const untouched =
  level6RuntimeTreeProjectionHazirla({
    type:1,
    total:10,
    level:5,
    power:100,
    details:[{id:"109034",pointType:"5",level:0}]
  });
assert.strictEqual(untouched.total,10);
assert.strictEqual(untouched.level,5);
assert.strictEqual(untouched.power,100);
assert.strictEqual(untouched.details[0].level,0);

assert.strictEqual(
  Object.isFrozen(
    LAST_SHELTER_TROOP_TRANSFER_LEVEL6
  ),
  true
);

console.log(
  "PASS: verified Last Shelter level-6 troop-transfer topology/effect/skill state is preserved without inventing effect semantics."
);
