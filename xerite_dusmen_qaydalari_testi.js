"use strict";

const assert = require("assert");
const { levelMelumatiniAl, zoneLevelAraligi } = require("./xerite_dusmen_qaydalari");
const { dusmenDescriptor } = require("./xerite_dusmen_sistemi");

assert.deepStrictEqual(zoneLevelAraligi("outer"), { min: 1, max: 5 });
assert.deepStrictEqual(zoneLevelAraligi("middle"), { min: 5, max: 8 });
assert.deepStrictEqual(zoneLevelAraligi("inner_green"), { min: 8, max: 10 });
assert.deepStrictEqual(zoneLevelAraligi("president_center"), { min: 0, max: 0 });

const scout5 = levelMelumatiniAl(5, "enemy_scout");
const small5 = levelMelumatiniAl(5, "small_enemy");
assert.ok(small5.power > scout5.power);
assert.ok(small5.reward.money > scout5.reward.money);

for (let i = 1; i <= 17; i++) {
  const d = dusmenDescriptor(1, i);
  assert.ok(d);
  assert.ok(d.enemyType === "enemy_scout" || d.enemyType === "small_enemy");
  if (d.zoneId === "outer") assert.ok(d.level >= 1 && d.level <= 5);
  if (d.zoneId === "middle") assert.ok(d.level >= 5 && d.level <= 8);
  if (d.zoneId === "inner_green") assert.ok(d.level >= 8 && d.level <= 10);
}

assert.strictEqual(dusmenDescriptor(1, 18), null);

console.log("xerite_dusmen_qaydalari_testi: OK");
