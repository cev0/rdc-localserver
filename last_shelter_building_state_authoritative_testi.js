"use strict";

const assert = require("assert");

const {
  sourceBuildingPrerequisites,
  sourceBuildingType
} = require("./last_shelter_building_state");

const {
  verifiedLastShelterBuildingLevelDataAl
} = require("./last_shelter_building_runtime_overlay");

const hqLevel2 =
  verifiedLastShelterBuildingLevelDataAl(
    "hq",
    2
  );

assert.ok(hqLevel2);
assert.strictEqual(hqLevel2.buildingTypeId, "400000");
assert.strictEqual(sourceBuildingType({ buildingId:"hq" }), "400000");
assert.strictEqual(sourceBuildingType({ buildingId:"433000" }), "433000");

const missingState = {
  buildings:[
    {
      buildingId:"460000",
      level:1,
      isCompleted:true
    }
  ],
  builders:{ jobs:[] }
};

const missing =
  sourceBuildingPrerequisites(
    missingState,
    hqLevel2
  );

assert.strictEqual(missing.mapped, true);
assert.strictEqual(missing.ok, false);
assert.strictEqual(missing.requiredBuildingTypeId, "433000");
assert.strictEqual(missing.requiredLevel, 1);
assert.strictEqual(missing.currentLevel, 0);

const satisfiedState = {
  buildings:[
    {
      buildingId:"ration_truck",
      level:1,
      isCompleted:true
    },
    {
      buildingId:"433000",
      level:1,
      isCompleted:true
    }
  ],
  builders:{ jobs:[] }
};

const satisfied =
  sourceBuildingPrerequisites(
    satisfiedState,
    hqLevel2
  );

assert.strictEqual(satisfied.mapped, true);
assert.strictEqual(satisfied.ok, true);

// Mapped Last Shelter building-lərdə caller-in ötürdüyü buildingConditions
// authoritative qərarı dəyişə bilməz. Validator original building.xml-dən
// target level şərtlərini özü yenidən çıxarır.
const forgedLevelData = {
  ...hqLevel2,
  buildingConditions:[]
};

const forgedResult =
  sourceBuildingPrerequisites(
    missingState,
    forgedLevelData
  );

assert.strictEqual(forgedResult.mapped, true);
assert.strictEqual(forgedResult.ok, false);
assert.strictEqual(forgedResult.requiredBuildingTypeId, "433000");

// Genuinely unmapped RDC building compatibility shell-də qalır.
const legacy =
  sourceBuildingPrerequisites(
    {
      buildings:[],
      builders:{ jobs:[] }
    },
    {
      buildingId:"testbuilding",
      targetLevel:2,
      buildingConditions:[
        {
          buildingTypeId:"433000",
          level:1
        }
      ]
    }
  );

assert.strictEqual(legacy.mapped, false);
assert.strictEqual(legacy.ok, false);
assert.strictEqual(legacy.missing.length, 1);

console.log(
  "PASS: mapped building prerequisites are authoritative and legacy fallback remains isolated."
);
