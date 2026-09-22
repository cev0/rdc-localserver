"use strict";

const assert = require("assert");
const {
  ITEM_TUNING,
  itemTuningAl
} = require("./last_shelter_item_tuning_kataloqu");

assert.strictEqual(Object.isFrozen(ITEM_TUNING), true);
assert.strictEqual(Object.keys(ITEM_TUNING).length, 30);

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
assert.deepStrictEqual(itemTuningAl("timed_event"), {
  k1: 0.01, k2: 0.1, k3: 0.05, k4: 0.18, k5: 1
});
assert.deepStrictEqual(itemTuningAl("scoutmark_time"), { k1: 10 });
assert.deepStrictEqual(itemTuningAl("enforce_guide_training_time"), { k1: 2 });
assert.deepStrictEqual(itemTuningAl("four_kind_speedup_switch"), {
  k1: "0|", k2: "1|", k3: "2|", k4: "3|1-10000"
});
assert.deepStrictEqual(itemTuningAl("truck_stay_time"), { k1: 15 });
assert.deepStrictEqual(itemTuningAl("recourse_refresh_time"), { k1: 600 });
assert.deepStrictEqual(itemTuningAl("global_timer"), { k1: 20 });
assert.deepStrictEqual(itemTuningAl("wonder_acceleration"), { k1: 999 });
assert.deepStrictEqual(itemTuningAl("killerevent_starttime"), { k1: 2 });
assert.deepStrictEqual(itemTuningAl("monster_life_time"), {
  k1: 7200, k2: 21300
});
assert.deepStrictEqual(itemTuningAl("preliminaries_time"), {
  k1: 259200, k2: 3600
});
assert.deepStrictEqual(itemTuningAl("red_packet_time"), {
  k1: 12, k2: 4
});
assert.deepStrictEqual(itemTuningAl("wood_material_together"), {
  k1:"232536|410100", k2:"232537|410100", k3:"232538|410100",
  k4:"232539|410100", k5:"232540|410100", k6:"232541|410100",
  k7:"232542|410100", k8:"232543|410100", k9:"232544|410100",
  k10:"232545|410100", k11:"232545|410100", k12:"232545|410100",
  k100:"0|0", speed:"0|30"
});
assert.deepStrictEqual(itemTuningAl("food_material_together"), {
  k1:"232546|410100", k2:"232547|410100", k3:"232548|410100",
  k4:"232549|410100", k5:"232550|410100", k6:"232551|410100",
  k7:"232552|410100", k8:"232553|410100", k9:"232554|410100",
  k10:"232555|410100", k11:"232555|410100", k12:"232555|410100",
  k100:"0|0", speed:"0|30"
});
assert.deepStrictEqual(itemTuningAl("iron_material_together"), {
  k1:"232556|410100", k2:"232557|410100", k3:"232558|410100",
  k4:"232559|410100", k5:"232560|410100", k6:"232561|410100",
  k7:"232562|410100", k8:"232563|410100", k9:"232564|410100",
  k10:"232565|410100", k11:"232565|410100", k12:"232565|410100",
  k100:"0|0", speed:"0|30"
});
assert.deepStrictEqual(itemTuningAl("mithril_material_together"), {
  k1:"232566|410100", k2:"232567|410100", k3:"232568|410100",
  k4:"232569|410100", k5:"232570|410100", k6:"232571|410100",
  k7:"232572|410100", k8:"232573|410100", k9:"232574|410100",
  k10:"232575|410100", k11:"232575|410100", k12:"232575|410100",
  k100:"0|0", speed:"0|30"
});
assert.deepStrictEqual(itemTuningAl("goldmine_gift_together"), {
  k1:"0|0", k2:"0|0", k3:"0|0", k4:"0|0", k5:"0|0",
  k6:"0|0", k7:"0|0", k8:"0|0", k9:"0|0", k10:"0|0",
  k11:"0|0", k100:"0|0", speed:"0|0"
});
assert.deepStrictEqual(itemTuningAl("state_war_time"), {
  k1:16,k2:100,k3:30,k4:50
});
assert.deepStrictEqual(itemTuningAl("desert_zombiesiege_rewardtimes"), {k1:5});
assert.deepStrictEqual(itemTuningAl("desert_goldmine_speed"), {
  k1:0.0001,k2:0.0002,k3:0.0003,k4:0.0004,k5:0.0005,
  k6:0.0006,k7:0.0007,k8:0.0008,k9:0.0009,k10:0.001
});
assert.strictEqual(itemTuningAl("unknown"), null);

console.log("PASS: verified Last Shelter item.xml tuning rows are preserved without inferred k-slot semantics.");
