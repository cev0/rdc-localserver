"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_FORT_TROOPS,
  fortTroopAl,
  fortTroopRuntimeProjectionAl
} = require("./last_shelter_fort_troop_reference");

assert.strictEqual(LAST_SHELTER_FORT_TROOPS.length, 20);

const ids = LAST_SHELTER_FORT_TROOPS.map(x => x.id).sort();
assert.deepStrictEqual(ids, [
  "107900",
  "107901",
  "107902",
  "107903",
  "107904",
  "107910",
  "107911",
  "107912",
  "107913",
  "107914",
  "107920",
  "107921",
  "107922",
  "107923",
  "107924",
  "107930",
  "107931",
  "107932",
  "107933",
  "107934"
]);

for (const row of LAST_SHELTER_FORT_TROOPS) {
  assert.strictEqual(row.level, 1);
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(row, "free"),
    false,
    "Mutable free count must not be stored as troop configuration."
  );
}

assert.deepStrictEqual(
  fortTroopRuntimeProjectionAl("107900"),
  {
    troopId: "107900",
    level: 1,
    attack: 11,
    defense: 0,
    trainingTimeSeconds: 40,
    power: 1,
    cost: { food: 251, wood: 0, stone: 0, iron: 0 }
  }
);

assert.deepStrictEqual(
  fortTroopRuntimeProjectionAl("107934"),
  {
    troopId: "107934",
    level: 1,
    attack: 77,
    defense: 0,
    trainingTimeSeconds: 288,
    power: 7,
    cost: { food: 900, wood: 434, stone: 42, iron: 110 }
  }
);

const copy = fortTroopAl("107913");
copy.food = 999999;
assert.strictEqual(fortTroopAl("107913").food, 295);
assert.strictEqual(fortTroopAl("107999"), null);

console.log("PASS: verified Last Shelter fort troop rows are preserved.");
