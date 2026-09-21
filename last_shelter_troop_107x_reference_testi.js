"use strict";

const assert = require("assert");
const { TROOP_107X, LAST_SHELTER_SPECIAL_ARMS_CONFIG, troop107xAl, specialArmConfigAl } = require("./last_shelter_troop_107x_reference");

assert.deepStrictEqual(Object.keys(TROOP_107X), ["107000","107001","107002","107003","107004","107005","107006","107007","107019","107119","107219"]);

const expected = {
  "107000": [6,14,8,20,61,0,0,0,1,8,0],
  "107001": [8,19,9,25,100,0,0,0,1.399999976158142,8,0],
  "107002": [22,13,6,33,119,31,0,0,1.899999976158142,9,0],
  "107003": [15,35,15,44,169,0,0,7,2.5,8,0],
  "107004": [38,22,9,58,164,57,0,9,3.200000047683716,9,0],
  "107005": [24,56,22,75,245,0,0,18,4,8,0],
  "107006": [29,68,26,95,253,0,3,22,4.900000095367432,8,0],
  "107007": [70,41,15,118,203,108,4,25,5.900000095367432,9,0],
  "107019": [36,127,44,173,300,0,12,95,9,8,0],
  "107119": [102,53,22,173,0,0,13,160,9,16.100000381469727,0],
  "107219": [72,42,16,173,155,0,19,75,9,8,50]
};

for (const [id, values] of Object.entries(expected)) {
  const row = troop107xAl(id);
  assert(row, `missing ${id}`);
  assert.deepStrictEqual([row.attack,row.defen,row.health,row.time,row.food,row.wood,row.stone,row.iron,row.power,row.speed,row.range], values, id);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(row, "free"), false, `${id}: mutable free count leaked into config`);
  assert.strictEqual(row.level, 0);
  assert.strictEqual(row.march, 0);
  assert.strictEqual(row.move, 10);
}

assert.strictEqual(LAST_SHELTER_SPECIAL_ARMS_CONFIG.k1, "200000");
assert.strictEqual(LAST_SHELTER_SPECIAL_ARMS_CONFIG.k2, "107019,781000|107219,782400|107119,783800|107319,785200");
assert.deepStrictEqual(specialArmConfigAl("107019"), { troopId: "107019", configId: "781000" });
assert.deepStrictEqual(specialArmConfigAl("107219"), { troopId: "107219", configId: "782400" });
assert.deepStrictEqual(specialArmConfigAl("107119"), { troopId: "107119", configId: "783800" });
assert.deepStrictEqual(specialArmConfigAl("107319"), { troopId: "107319", configId: "785200" });
assert.strictEqual(specialArmConfigAl("107999"), null);

// 107319 has stable-looking combat fields but snapshot-varying speed; keep it out
// until the reference static/effect split is proven rather than guessing a base.
assert.strictEqual(troop107xAl("107319"), null);
assert.strictEqual(troop107xAl("107999"), null);
assert.strictEqual(troop107xAl(null), null);
assert(Object.isFrozen(TROOP_107X));
assert(Object.values(TROOP_107X).every(Object.isFrozen));

console.log("Last Shelter 107x troop reference regression OK");
