"use strict";

const assert = require("assert");
const {
  TROOP_1073X_STABLE,
  OBSERVED_SPEEDS,
  troop1073xStableAl,
  troop1073xObservedSpeedsAl,
  troop1073xRuntimeProjectionAl
} = require("./last_shelter_troop_1073x_reference");

assert.deepStrictEqual(
  Object.keys(TROOP_1073X_STABLE),
  [
    "107300","107301","107302","107303","107304",
    "107305","107306","107307","107308","107309"
  ]
);

for (
  let index = 0;
  index < 10;
  index++
) {
  const id =
    "1073" +
    String(index).padStart(2,"0");

  const row =
    troop1073xStableAl(id);

  assert.ok(row,id);
  assert.strictEqual(row.level,0,id);
  assert.strictEqual(row.march,0,id);
  assert.strictEqual(row.move,10,id);
  assert.strictEqual(row.food,0,id);
  assert.strictEqual(row.heal_res,50,id);
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(row,"free"),
    false,
    id + ": mutable free leaked"
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(row,"speed"),
    false,
    id + ": snapshot-varying speed must not become static"
  );

  const speeds =
    troop1073xObservedSpeedsAl(id);

  assert.ok(speeds.length >= 2,id);
}

assert.deepStrictEqual(
  troop1073xRuntimeProjectionAl("107309"),
  {
    lastShelterArmyId:"107309",
    attack:139,
    defense:41,
    hp:26,
    battlePower:9.399999618530273,
    trainingTimeSeconds:173,
    range:110,
    loadCapacity:6,
    upkeep:0.2083333283662796,
    cost:{
      food:0,
      wood:330,
      stone:5,
      iron:60
    },
    speedVerifiedStatic:false
  }
);

assert.deepStrictEqual(
  troop1073xObservedSpeedsAl("107309"),
  [
    13,
    13.130000114440918,
    13.260000228881836,
    15.210000038146973
  ]
);

assert.strictEqual(
  troop1073xStableAl("107399"),
  null
);
assert.deepStrictEqual(
  troop1073xObservedSpeedsAl("107399"),
  []
);

assert.strictEqual(
  Object.isFrozen(TROOP_1073X_STABLE),
  true
);
assert.strictEqual(
  Object.isFrozen(OBSERVED_SPEEDS),
  true
);

console.log(
  "PASS: Last Shelter 1073xx fourth troop-family stable fields are preserved while snapshot-varying speed stays unguessed."
);
