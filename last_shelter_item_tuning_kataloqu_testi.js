"use strict";

const assert = require("assert");
const {
  ITEM_TUNING,
  itemTuningAl
} = require("./last_shelter_item_tuning_kataloqu");

assert.strictEqual(Object.isFrozen(ITEM_TUNING), true);
assert.strictEqual(Object.keys(ITEM_TUNING).length, 10);

assert.deepStrictEqual(itemTuningAl("cd_time"), {
  k1: 300, k2: 900, k3: 3600, k4: 10800, k5: 28800,
  k6: 54000, k7: 86400, k8: 259200, k9: 604800, k10: 2592000
});
assert.deepStrictEqual(itemTuningAl("worldmap_time"), {
  k1: 15, k2: 60, k3: 240, k4: 480
});
assert.deepStrictEqual(itemTuningAl("world_marchtime"), {
  k1: 0.82, k2: 120, k3: 3, k4: 20, k5: 10, k6: 0.2
});
assert.deepStrictEqual(itemTuningAl("resources_speed"), {
  k1: 6, k2: 3, k3: 4, k4: 6, k5: 24, k6: 0.00083
});
assert.deepStrictEqual(itemTuningAl("resources_speed2"), {
  k1: 18, k2: 0.75, k3: 3, k4: 18,
  k5: 360000000, k6: 15000000, k7: 60000000, k8: 360000000
});
assert.deepStrictEqual(itemTuningAl("recruit_hero_time"), { k1: 10 });
assert.deepStrictEqual(itemTuningAl("new_resources_speed"), {
  k1: 2, k2: 6, k4: 0, k5: 25, k6: 50
});
assert.deepStrictEqual(itemTuningAl("resources_output_time"), {
  k1: 20, k2: 20, k3: 20, k4: 20, k12: 20, k13: 20, k14: 20
});
assert.deepStrictEqual(itemTuningAl("trade_stay_time"), {
  k1: 1200, k2: 6000, k3: 1, k4: 60,
  k5: "34;45", k6: "35;1|35;89", k7: "36;1|36;89"
});
assert.deepStrictEqual(itemTuningAl("speedup_mode"), {
  k1: 75, k2: 20, k3: 3, k4: 25, k5: 1800, k6: 0.05
});
assert.strictEqual(itemTuningAl("unknown"), null);

console.log("PASS: verified Last Shelter item.xml tuning rows are preserved without inferred k-slot semantics.");
