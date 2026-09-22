"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  RDC_TO_LAST_SHELTER_BUILDING_TYPE,
  RAW_MAIN_BUILDING_LEVELS,
  RAW_BUILDING_ROWS,
  sertleriParseEt,
  mainBuildingLeveliniAl,
  buildingLeveliniAl,
  buildingMaxLeveliniAl,
  buildingDeclaredMaxLeveliniAl,
  rdcBuildingTypeIdAl
} = require("./last_shelter_building_kataloqu");

const {
  RDC_BUILDING_TYPE_IDS,
  sourceBuildingType
} = require("./last_shelter_building_state");

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
  RDC_BUILDING_TYPE_IDS,
  RDC_TO_LAST_SHELTER_BUILDING_TYPE,
  "Building state bridge must reuse the verified mapping object."
);

for (const unverifiedId of [
  "house",
  "bank",
  "embassy",
  "road"
]) {
  assert.strictEqual(
    sourceBuildingType({
      buildingId: unverifiedId
    }),
    null,
    `Unverified semantic mapping must stay disabled: ${unverifiedId}`
  );
}

assert.strictEqual(
  sourceBuildingType({
    buildingId: "institute"
  }),
  "403000"
);

assert.strictEqual(
  sourceBuildingType({
    buildingTypeId: "433000",
    buildingId: "house"
  }),
  "433000",
  "Explicit Last Shelter numeric building types remain authoritative."
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

assert.ok(mainBuildingLeveliniAl(6));
assert.ok(mainBuildingLeveliniAl(25));
assert.strictEqual(Object.keys(RAW_MAIN_BUILDING_LEVELS).length,31);


const activeDefinitions =
  JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "building_definitions.json"
      ),
      "utf8"
    )
  );

const activeList =
  Array.isArray(activeDefinitions)
    ? activeDefinitions
    : (
      activeDefinitions.definitions ||
      activeDefinitions.buildings ||
      []
    );

const verifiedDefinitionIds = [
  "hq",
  "institute",
  "hospital",
  "farm",
  "ration_truck",
  "tower"
];

for (const id of verifiedDefinitionIds) {
  const definition =
    activeList.find(
      item =>
        String(
          item &&
          item.id ||
          ""
        ).toLowerCase() === id
    );

  assert.ok(
    definition,
    `Aktiv definition olmalıdır: ${id}`
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      definition,
      "levels"
    ),
    false,
    `Verified Last Shelter level balansı building_definitions.json-da təkrarlanmamalıdır: ${id}`
  );
}

for (let level = 1; level <= 5; level += 1) {
  const reference =
    mainBuildingLeveliniAl(
      level
    );

  assert.ok(reference);
  assert.strictEqual(
    reference.level,
    level
  );
  assert.ok(
    Number.isFinite(
      reference.buildTimeSeconds
    )
  );
}

const serverSource =
  fs.readFileSync(
    path.join(
      __dirname,
      "server.js"
    ),
    "utf8"
  );

assert.ok(
  /silver\s*:\s*0/.test(
    serverSource
  ),
  "Server state Last Shelter silver resursunu saxlamalıdır."
);

const academy1=buildingLeveliniAl("403000",1);
assert(academy1);
assert.strictEqual(academy1.buildingTypeId,"403000");
assert.strictEqual(academy1.level,1);
assert.strictEqual(buildingLeveliniAl("403000",999),null);
assert(buildingMaxLeveliniAl("403000")>=1);
assert.strictEqual(buildingMaxLeveliniAl("not-a-building"),0);

const expectedMaxByType =
  Object.values(
    RAW_BUILDING_ROWS
  ).reduce(
    (index, raw) => {
      const typeId =
        String(
          Number(raw.id) -
          Number(raw.level)
        );
      index[typeId] =
        Math.max(
          Number(index[typeId]) || 0,
          Number(raw.level) || 0
        );
      return index;
    },
    Object.create(null)
  );

for (
  const [typeId, expectedMax] of
  Object.entries(expectedMaxByType)
) {
  assert.strictEqual(
    buildingMaxLeveliniAl(typeId),
    expectedMax,
    `Indexed max level mismatch for building type ${typeId}`
  );
}

const expectedDeclaredMaxByType =
  Object.values(
    RAW_BUILDING_ROWS
  ).reduce(
    (index, raw) => {
      const typeId =
        String(
          Number(raw.id) -
          Number(raw.level)
        );
      const declaredMax =
        Math.max(
          0,
          Math.trunc(
            Number(raw.max_level) || 0
          )
        );
      if (declaredMax > 0) {
        index[typeId] =
          Math.max(
            Number(index[typeId]) || 0,
            declaredMax
          );
      }
      return index;
    },
    Object.create(null)
  );

for (
  const [typeId, expectedMax] of
  Object.entries(expectedDeclaredMaxByType)
) {
  assert.strictEqual(
    buildingDeclaredMaxLeveliniAl(typeId),
    expectedMax,
    `Indexed declared max mismatch for building type ${typeId}`
  );
}

assert.strictEqual(
  buildingDeclaredMaxLeveliniAl(
    "not-a-building"
  ),
  0
);

console.log(
  "PASS: verified Last Shelter main-building 400000-400005 reference rows are preserved."
);
