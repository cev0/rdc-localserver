"use strict";

const assert = require("assert");
const {
  MISSILE,
  LEGACY_MISSILE_INIT_OBSERVED,
  missileAl,
  missileIds,
  missileFreshRuntimeHazirla,
  legacyMissileInitObservedAl
} = require("./last_shelter_missile_kataloqu");

assert.deepStrictEqual(
  missileIds(),
  ["53301","53302","53303","53304","53305","53306"]
);

assert.deepStrictEqual(missileAl("53301"),{
  money:1000000,
  electricity:2500000,
  food:1000000,
  time:3600,
  item_need:"212007;800"
});
assert.deepStrictEqual(missileAl("53302"),{
  money:1000000,
  electricity:2500000,
  wood:1000000,
  time:7200,
  item_need:"212007;1600"
});
assert.deepStrictEqual(missileAl("53303"),{
  money:1000000,
  electricity:3750000,
  wood:1500000,
  time:10800,
  item_need:"212007;2400"
});
assert.deepStrictEqual(missileAl("53304"),{
  money:2000000,
  electricity:7500000,
  water:3000000,
  time:10800,
  item_need:"212007;4000"
});
assert.deepStrictEqual(missileAl("53305"),{
  money:4000000,
  electricity:7500000,
  water:3000000,
  launch_cd:14400,
  time:21600,
  item_need:"212007;8000"
});
assert.deepStrictEqual(missileAl("53306"),{
  money:100000,
  electricity:250000,
  water:100000,
  time:720,
  item_need:"212007;80"
});
assert.strictEqual(missileAl("53307"),null);
assert.strictEqual(missileAl("53308"),null);
assert.strictEqual(missileAl("99999"),null);

const runtime=missileFreshRuntimeHazirla();
assert.strictEqual(runtime.length,6);
for (const row of runtime) {
  assert.strictEqual(row.unlockFlag,0);
  assert.strictEqual(row.unlock,true);
  assert.strictEqual(row.plugin,"");
  assert.strictEqual(row.totalNum,0);
  assert.strictEqual(row.unReceive,0);
  assert.strictEqual(row.lastLaunchTime,0);
  assert.match(row.item_need,/^212007;\d+$/);
  assert.ok(row.time>0);
}
assert.strictEqual(runtime.find(x=>x.missileId==="53305").launch_cd,14400);

assert.strictEqual(Object.isFrozen(MISSILE),true);
assert.strictEqual(Object.isFrozen(MISSILE["53301"]),true);
assert.strictEqual(Object.isFrozen(LEGACY_MISSILE_INIT_OBSERVED),true);

// Older eight-row observations are retained but cannot leak into active v1.250.102 lookups.
assert.strictEqual(legacyMissileInitObservedAl("53307").missile_effect,53503);
assert.strictEqual(legacyMissileInitObservedAl("53308").unlock_level,8);
assert.strictEqual(legacyMissileInitObservedAl("53301").item_need,"200047;15");
assert.strictEqual(missileIds().includes("53307"),false);
assert.strictEqual(missileIds().includes("53308"),false);

console.log("PASS: active Last Shelter v1.250.102 missile catalog/runtime is separated from legacy init observations.");
