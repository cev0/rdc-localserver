"use strict";

const assert = require("assert");
const { MISSILE, missileAl, missileIds } = require("./last_shelter_missile_kataloqu");

assert.deepStrictEqual(missileIds(), ["53301", "53302", "53303", "53304", "53305", "53306"]);
assert.strictEqual(missileAl(53301).wood, 200000);
assert.strictEqual(missileAl(53301).iron, 20000);
assert.strictEqual(missileAl(53301).status, 500901);
assert.strictEqual(missileAl(53302).missile_effect, 53500);
assert.strictEqual(missileAl(53303).def_value, 4500);
assert.strictEqual(missileAl(53303).capacity, 2);
assert.strictEqual(missileAl(53304).missile_effect, 53501);
assert.strictEqual(missileAl(53305).atk_value, 10);
assert.strictEqual(missileAl(53306).speed, 4.5);
assert.strictEqual(missileAl(53306).missile_effect, 53502);
assert.strictEqual(missileAl(99999), null);

for (const id of missileIds()) {
  const row = MISSILE[id];
  assert.ok(Object.isFrozen(row));
  assert.ok(row.time > 0);
  assert.ok(row.capacity > 0);
  assert.ok(row.unlock_level > 0);
  assert.match(row.item_need, /^200047;\d+$/);
  assert.ok(!Object.prototype.hasOwnProperty.call(row, "producing"));
  assert.ok(!Object.prototype.hasOwnProperty.call(row, "totalNum"));
  assert.ok(!Object.prototype.hasOwnProperty.call(row, "finishTime"));
}

console.log("Last Shelter missile catalog regression OK");
