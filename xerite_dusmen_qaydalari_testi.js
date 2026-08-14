"use strict";

const assert = require("assert");
const { levelMelumatiniAl, zoneLevelAraligi } = require("./xerite_dusmen_qaydalari");
const { dusmenDescriptor } = require("./xerite_dusmen_sistemi");

assert.deepStrictEqual(zoneLevelAraligi("outer"), { min: 1, max: 5 });
assert.deepStrictEqual(zoneLevelAraligi("middle"), { min: 5, max: 8 });
assert.deepStrictEqual(zoneLevelAraligi("inner_green"), { min: 8, max: 10 });

const scout5 = levelMelumatiniAl(5, "scout");
const camp5 = levelMelumatiniAl(5, "small_camp");
assert.ok(camp5.power > scout5.power);
assert.ok(camp5.reward.money > scout5.reward.money);

for (let i = 1; i <= 18; i++) {
  const d = dusmenDescriptor(1, i);
  assert.ok(d);
  if (d.zoneId === "outer") assert.ok(d.level >= 1 && d.level <= 5);
  if (d.zoneId === "middle") assert.ok(d.level >= 5 && d.level <= 8);
  if (d.zoneId === "inner_green" || d.zoneId === "president_center") {
    assert.ok(d.level >= 8 && d.level <= 10);
  }
}

console.log("xerite_dusmen_qaydalari_testi: OK");
