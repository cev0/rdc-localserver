"use strict";

const assert = require("assert");

const {
  RDC_TO_LAST_SHELTER_BUILDING_TYPE,
  RAW_MAIN_BUILDING_LEVELS,
  sertleriParseEt,
  mainBuildingLeveliniAl,
  rdcBuildingTypeIdAl
} = require("./last_shelter_building_kataloqu");

assert.strictEqual(
  rdcBuildingTypeIdAl("hq"),
  "400000"
);

assert.strictEqual(
  Object.isFrozen(
    RDC_TO_LAST_SHELTER_BUILDING_TYPE
  ),
  true
);

assert.strictEqual(
  Object.isFrozen(
    RAW_MAIN_BUILDING_LEVELS
  ),
  true
);

const level0 =
  mainBuildingLeveliniAl(0);

assert.ok(level0);
assert.strictEqual(
  level0.xmlId,
  "400000"
);
assert.strictEqual(
  level0.maxLevelFromXml,
  25
);
assert.strictEqual(
  level0.buildTimeSeconds,
  5
);
assert.deepStrictEqual(
  level0.cost,
  {
    wood: 0,
    stone: 0,
    iron: 130,
    food: 30,
    money: 0,
    electricity: 0,
    silver: 0
  }
);

const level1 =
  mainBuildingLeveliniAl(1);

assert.strictEqual(
  level1.xmlId,
  "400001"
);
assert.strictEqual(
  level1.buildTimeSeconds,
  12
);
assert.strictEqual(
  level1.power,
  2323
);
assert.deepStrictEqual(
  level1.cost,
  {
    wood: 0,
    stone: 0,
    iron: 190,
    food: 50,
    money: 210,
    electricity: 0,
    silver: 0
  }
);
assert.deepStrictEqual(
  level1.buildingConditions,
  [
    {
      buildingTypeId: "460000",
      level: 1
    },
    {
      buildingTypeId: "433000",
      level: 1
    }
  ]
);

const level2 =
  mainBuildingLeveliniAl(2);

assert.strictEqual(
  level2.buildTimeSeconds,
  50
);
assert.strictEqual(
  level2.population,
  180
);
assert.strictEqual(
  level2.cost.wood,
  200
);
assert.strictEqual(
  level2.cost.iron,
  290
);

const level3 =
  mainBuildingLeveliniAl(3);

assert.strictEqual(
  level3.buildTimeSeconds,
  120
);
assert.strictEqual(
  level3.cost.food,
  0
);
assert.strictEqual(
  level3.power,
  2771
);

const level4 =
  mainBuildingLeveliniAl(4);

assert.strictEqual(
  level4.buildTimeSeconds,
  710
);
assert.strictEqual(
  level4.cost.stone,
  500
);
assert.strictEqual(
  level4.cost.food,
  960
);

const level5 =
  mainBuildingLeveliniAl(5);

assert.strictEqual(
  level5.buildTimeSeconds,
  2110
);
assert.strictEqual(
  level5.cost.stone,
  1300
);
assert.strictEqual(
  level5.cost.iron,
  3600
);
assert.deepStrictEqual(
  level5.buildingConditions,
  [
    {
      buildingTypeId: "460000",
      level: 5
    },
    {
      buildingTypeId: "434000",
      level: 5
    },
    {
      buildingTypeId: "450000",
      level: 1
    },
    {
      buildingTypeId: "433000",
      level: 5
    }
  ]
);

assert.deepStrictEqual(
  sertleriParseEt(""),
  []
);

assert.strictEqual(
  mainBuildingLeveliniAl(6),
  null
);

console.log(
  "PASS: verified Last Shelter main-building 400000-400005 reference rows are preserved."
);
