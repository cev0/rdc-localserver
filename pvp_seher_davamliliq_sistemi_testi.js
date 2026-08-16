"use strict";
const assert = require("assert");
const {
  DEFAULT_MAX_DURABILITY,
  DEFAULT_VICTORY_DAMAGE,
  DEFAULT_FIRE_DURATION_MS,
  veziyyetiAl,
  qalibPvpHucumunuTetbiqEt,
  zeroingTamamlandi
} = require("./pvp_seher_davamliliq_sistemi");

const now = 1_800_000_000_000;
const state = {};
let info = veziyyetiAl(state, now);
assert.strictEqual(info.durability, DEFAULT_MAX_DURABILITY);
assert.strictEqual(info.burning, false);

const hit = qalibPvpHucumunuTetbiqEt(state, now);
assert.strictEqual(hit.damage, DEFAULT_VICTORY_DAMAGE);
assert.strictEqual(hit.durabilityAfter, DEFAULT_MAX_DURABILITY - DEFAULT_VICTORY_DAMAGE);
assert.strictEqual(hit.fireEndsAtMs, now + DEFAULT_FIRE_DURATION_MS);
assert.strictEqual(veziyyetiAl(state, now + 1).burning, true);
assert.strictEqual(veziyyetiAl(state, now + DEFAULT_FIRE_DURATION_MS + 1).burning, false);

state.pvpCity.durability = 500;
const zero = qalibPvpHucumunuTetbiqEt(state, now + DEFAULT_FIRE_DURATION_MS + 2);
assert.strictEqual(zero.durabilityAfter, 0);
assert.strictEqual(zero.zeroed, true);
assert.strictEqual(state.pvpCity.zeroingPending, true);

zeroingTamamlandi(state);
assert.strictEqual(state.pvpCity.zeroingPending, false);
assert.strictEqual(state.pvpCity.durability, DEFAULT_MAX_DURABILITY);
console.log("pvp_seher_davamliliq_sistemi_testi: OK");
