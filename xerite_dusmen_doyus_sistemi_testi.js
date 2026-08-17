"use strict";

const assert = require("assert");
const {
  birQosununGucunuAl,
  qosunGucunuHesabla,
  stateTeminEt
} = require("./xerite_dusmen_doyus_sistemi");
const { konvoyMesguldur } = require("./konvoy_mesgul_sistemi");

assert.strictEqual(birQosununGucunuAl("fighter_lv1"), 1);
assert.strictEqual(birQosununGucunuAl("shooter_lv2"), 1.4);
assert.strictEqual(birQosununGucunuAl("vehicle_lv3"), 1.9);
assert.strictEqual(birQosununGucunuAl("unknown"), 0);

assert.strictEqual(
  qosunGucunuHesabla({
    fighter_lv1: 100,
    shooter_lv2: 50,
    vehicle_lv3: 10
  }),
  189
);

const state = {};
const battle = stateTeminEt(state);
assert.ok(battle);
assert.deepStrictEqual(battle.activeByConvoy, {});
assert.deepStrictEqual(battle.lastResults, []);

state.worldEnemyBattle.activeByConvoy.konvoy_1 = {
  convoyId: "konvoy_1",
  enemyId: "state_1_enemy_1",
  status: "active"
};

const lock = konvoyMesguldur(state, "konvoy_1", Date.now());
assert.strictEqual(lock.mesguldur, true);
assert.strictEqual(lock.sebeb, "world_enemy_battle");

console.log("xerite_dusmen_doyus_sistemi_testi: OK");
