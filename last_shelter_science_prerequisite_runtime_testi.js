"use strict";

const assert = require("assert");

const {
  scienceConditionTokeniniAc,
  buildingConditionTokeniniAc,
  scienceLevelAl,
  sciencePrerequisiteStatusuAl,
  topologyButovlukYoxlamasi
} = require("./last_shelter_science_prerequisite_runtime");

assert.deepStrictEqual(
  scienceConditionTokeniniAc("901401"),
  {
    token: "901401",
    itemId: "901400",
    requiredLevel: 1
  }
);

assert.deepStrictEqual(
  scienceConditionTokeniniAc("902205"),
  {
    token: "902205",
    itemId: "902200",
    requiredLevel: 5
  }
);

assert.deepStrictEqual(
  scienceConditionTokeniniAc("997520"),
  {
    token: "997520",
    itemId: "997500",
    requiredLevel: 20
  }
);

assert.strictEqual(
  scienceConditionTokeniniAc("997521"),
  null
);
assert.strictEqual(
  scienceConditionTokeniniAc("bad"),
  null
);

assert.deepStrictEqual(
  buildingConditionTokeniniAc(
    "403001"
  ),
  {
    token: "403001",
    buildingTypeId: "403000",
    requiredLevel: 1
  }
);

assert.deepStrictEqual(
  buildingConditionTokeniniAc(
    "423025"
  ),
  {
    token: "423025",
    buildingTypeId: "423000",
    requiredLevel: 25
  }
);

assert.strictEqual(
  scienceLevelAl(
    {
      science: {
        "901400": 1
      }
    },
    "901400"
  ),
  1
);

assert.strictEqual(
  scienceLevelAl(
    {
      science: [
        {
          itemId: "902200",
          level: 5
        }
      ]
    },
    "902200"
  ),
  5
);

const blocked =
  sciencePrerequisiteStatusuAl(
    {
      science: {
        "901400": 1,
        "901500": 0
      }
    },
    "901600"
  );

assert.strictEqual(
  blocked.ok,
  false
);
assert.strictEqual(
  blocked.code,
  "SCIENCE_CONDITION_NOT_MET"
);
assert.deepStrictEqual(
  blocked.missingScience,
  [
    {
      token: "901501",
      itemId: "901500",
      requiredLevel: 1,
      currentLevel: 0
    }
  ]
);

const unlocked =
  sciencePrerequisiteStatusuAl(
    {
      science: {
        "901400": 1,
        "901500": 1
      }
    },
    "901600"
  );

assert.strictEqual(
  unlocked.ok,
  true
);
assert.strictEqual(
  unlocked.code,
  "OK"
);
assert.strictEqual(
  unlocked.missingScience.length,
  0
);

const advanced =
  sciencePrerequisiteStatusuAl(
    {
      science: {
        "997500": 20
      }
    },
    "997600"
  );

assert.strictEqual(
  advanced.ok,
  true
);
assert.deepStrictEqual(
  advanced.goodsNeed,
  {
    itemId: "210163",
    amount: 180
  }
);

const integrity =
  topologyButovlukYoxlamasi();

assert.strictEqual(
  integrity.ok,
  true
);

// Both counts are derived from the complete verified 441-node response and
// protect against silently dropping a dependency during future edits.
assert.strictEqual(
  integrity.scienceConditionCount,
  548
);
assert.ok(
  integrity.buildingConditionCount > 250
);
assert.deepStrictEqual(
  integrity.malformedScience,
  []
);
assert.deepStrictEqual(
  integrity.malformedBuilding,
  []
);

console.log(
  "PASS: all verified Last Shelter science prerequisites resolve and enforce exact required levels."
);
