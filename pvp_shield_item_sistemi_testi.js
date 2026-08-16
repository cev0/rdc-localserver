"use strict";

const assert = require("assert");
const {
  PVP_SHIELD_ITEMS,
  shieldItemiElaveEt,
  shieldIteminiAktivEt,
  shieldItemKataloqunuAl
} = require("./pvp_shield_item_sistemi");
const { pvpQorumaMelumatiniAl } = require("./pvp_qoruma_sistemi");

const now = 2_000_000_000_000;
assert.strictEqual(PVP_SHIELD_ITEMS.peace_shield_8h.durationMs, 8 * 60 * 60 * 1000);
assert.strictEqual(PVP_SHIELD_ITEMS.peace_shield_12h.durationMs, 12 * 60 * 60 * 1000);
assert.strictEqual(PVP_SHIELD_ITEMS.peace_shield_3d.durationMs, 3 * 24 * 60 * 60 * 1000);

const state = {};
let result = shieldIteminiAktivEt(state, "peace_shield_8h", now);
assert.strictEqual(result.success, false);
assert.strictEqual(result.blocker, "shield_item_missing");

assert.strictEqual(shieldItemiElaveEt(state, "peace_shield_8h", 2).success, true);
result = shieldIteminiAktivEt(state, "peace_shield_8h", now);
assert.strictEqual(result.success, true);
assert.strictEqual(result.shieldUntilMs, now + 8 * 60 * 60 * 1000);
assert.strictEqual(result.remainingCount, 1);
assert.strictEqual(pvpQorumaMelumatiniAl(state, now).shieldActive, true);

const second = shieldIteminiAktivEt(state, "peace_shield_8h", now + 1000);
assert.strictEqual(second.success, false);
assert.strictEqual(second.blocker, "shield_already_active");
assert.strictEqual(shieldItemKataloqunuAl(state).find(x => x.itemId === "peace_shield_8h").count, 1,
  "aktiv shield üstündən uğursuz activation item sərf etməməlidir");

const afterExpiry = shieldIteminiAktivEt(state, "peace_shield_8h", now + 8 * 60 * 60 * 1000 + 1);
assert.strictEqual(afterExpiry.success, true);
assert.strictEqual(afterExpiry.remainingCount, 0);

console.log("pvp_shield_item_sistemi_testi: OK");
