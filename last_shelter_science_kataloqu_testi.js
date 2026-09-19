"use strict";

const assert = require("assert");

const {
  RAW_SCIENCE,
  researchNeedParseEt,
  scienceMelumatiniAl,
  scienceIdleriAl
} = require("./last_shelter_science_kataloqu");

assert.deepStrictEqual(
  scienceIdleriAl(),
  [
    "901000",
    "901100",
    "901200",
    "901300"
  ]
);

assert.strictEqual(
  Object.isFrozen(RAW_SCIENCE),
  true
);

const s901000 =
  scienceMelumatiniAl(
    "901000"
  );

assert.ok(s901000);
assert.strictEqual(
  s901000.buildingCondition,
  "403001"
);
assert.strictEqual(
  s901000.researchTimeSeconds,
  90
);
assert.strictEqual(
  s901000.maxLevel,
  1
);
assert.strictEqual(
  s901000.para1,
  "801"
);
assert.deepStrictEqual(
  s901000.researchNeed,
  [
    { typeCode: 0, amount: 0 },
    { typeCode: 1, amount: 0 },
    { typeCode: 2, amount: 0 },
    { typeCode: 3, amount: 0 },
    { typeCode: 14, amount: 1000 }
  ]
);

const s901200 =
  scienceMelumatiniAl(
    "901200"
  );

assert.strictEqual(
  s901200.quality,
  2
);
assert.strictEqual(
  s901200.researchTimeSeconds,
  180
);
assert.strictEqual(
  s901200.para1,
  "803"
);

assert.deepStrictEqual(
  researchNeedParseEt("0"),
  []
);

assert.strictEqual(
  scienceMelumatiniAl(
    "999999"
  ),
  null
);

console.log(
  "PASS: Last Shelter science.xml reference catalog preserves verified raw node semantics."
);
