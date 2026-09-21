"use strict";

const assert = require("assert");

const {
  verifiedLastShelterBuildingLevelDataAl,
  verifiedLastShelterBuildingMaxLevelAl
} = require("./last_shelter_building_runtime_overlay");

const level1 =
  verifiedLastShelterBuildingLevelDataAl(
    "hq",
    1
  );

assert.ok(level1);
assert.strictEqual(
  level1.source,
  "last_shelter_v1.250.102_building_xml_verified"
);
assert.strictEqual(
  level1.buildingTypeId,
  "400000"
);
assert.strictEqual(
  level1.xmlId,
  "400001"
);
assert.strictEqual(
  level1.buildTimeSeconds,
  12
);
assert.deepStrictEqual(
  level1.cost,
  [
    { type: "iron", amount: 190 },
    { type: "food", amount: 50 },
    { type: "money", amount: 210 }
  ]
);

const level4 =
  verifiedLastShelterBuildingLevelDataAl(
    "HQ",
    4
  );

assert.ok(level4);
assert.strictEqual(
  level4.xmlId,
  "400004"
);
assert.strictEqual(
  level4.buildTimeSeconds,
  710
);
assert.deepStrictEqual(
  level4.cost,
  [
    { type: "wood", amount: 1000 },
    { type: "stone", amount: 500 },
    { type: "iron", amount: 1500 },
    { type: "food", amount: 960 },
    { type: "money", amount: 1100 }
  ]
);
assert.strictEqual(
  level4.cost.some(
    item => item.type === "fuel"
  ),
  false
);

const level5 =
  verifiedLastShelterBuildingLevelDataAl(
    "hq",
    5
  );

assert.ok(level5);
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

assert.strictEqual(
  verifiedLastShelterBuildingMaxLevelAl(
    "hq"
  ),
  5
);
assert.strictEqual(
  verifiedLastShelterBuildingLevelDataAl(
    "hq",
    6
  ),
  null
);
assert.strictEqual(
  verifiedLastShelterBuildingLevelDataAl(
    "farm",
    1
  ),
  null
);
assert.strictEqual(
  verifiedLastShelterBuildingMaxLevelAl(
    "farm"
  ),
  0
);

console.log(
  "PASS: verified Last Shelter building.xml overlay exposes only source-backed RDC building levels."
);
