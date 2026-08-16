"use strict";

const assert = require("assert");
const {
  QEHRAMAN_MAX_LEVEL,
  QEHRAMAN_EXP_CEDVELI,
  telebOlunanExp,
  toplamExpTelebi
} = require("./qehreman_exp_sistemi");
const { QEHRAMANLAR } = require("./qehreman_kataloqu");

assert.strictEqual(QEHRAMAN_MAX_LEVEL, 50);
assert.ok(QEHRAMANLAR.length > 0);
for (const hero of QEHRAMANLAR) {
  assert.strictEqual(hero.maxLevel, 50, `${hero.heroId} maxLevel 50 olmalıdır.`);
}

assert.strictEqual(telebOlunanExp(1, 50), 10);
assert.strictEqual(telebOlunanExp(5, 50), 5400);
assert.strictEqual(telebOlunanExp(11, 50), 14560);
assert.strictEqual(telebOlunanExp(24, 50), 705600);
assert.strictEqual(telebOlunanExp(34, 50), 2234400);
assert.strictEqual(telebOlunanExp(44, 50), 5820000);
assert.strictEqual(telebOlunanExp(49, 50), 9360000);
assert.strictEqual(telebOlunanExp(50, 50), 0);
assert.strictEqual(telebOlunanExp(60, 50), 0);

for (let nextLevel = 2; nextLevel <= 50; nextLevel++) {
  assert.ok(Number.isInteger(QEHRAMAN_EXP_CEDVELI[nextLevel]));
  assert.ok(QEHRAMAN_EXP_CEDVELI[nextLevel] > 0);
}

assert.strictEqual(toplamExpTelebi(50), 94172800);
assert.strictEqual(toplamExpTelebi(1), 0);

console.log("qehreman_exp_progression_testi: OK");
