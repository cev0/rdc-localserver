"use strict";

const assert = require("assert");
const { TROOP_107X, troop107xAl } = require("./last_shelter_troop_107x_reference");

assert.deepStrictEqual(Object.keys(TROOP_107X), ["107000","107001","107002","107003","107004","107005","107006","107007"]);

const expected = {
  "107000": [6,14,8,20,61,0,0,1],
  "107001": [8,19,9,25,100,0,0,1.399999976158142],
  "107002": [22,13,6,33,119,31,0,1.899999976158142],
  "107003": [15,35,15,44,169,0,7,2.5],
  "107004": [38,22,9,58,164,57,9,3.200000047683716],
  "107005": [24,56,22,75,245,0,18,4],
  "107006": [29,68,26,95,253,0,22,4.900000095367432],
  "107007": [70,41,15,118,203,108,25,5.900000095367432]
};

for (const [id, values] of Object.entries(expected)) {
  const row = troop107xAl(id);
  assert(row, `missing ${id}`);
  assert.deepStrictEqual([row.attack,row.defen,row.health,row.time,row.food,row.wood,row.iron,row.power], values, id);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(row, "free"), false, `${id}: mutable free count leaked into config`);
  assert.strictEqual(row.level, 0);
  assert.strictEqual(row.march, 0);
  assert.strictEqual(row.move, 10);
}

assert.strictEqual(troop107xAl("107999"), null);
assert.strictEqual(troop107xAl(null), null);
assert(Object.isFrozen(TROOP_107X));
assert(Object.values(TROOP_107X).every(Object.isFrozen));

console.log("Last Shelter 107x troop reference regression OK");
