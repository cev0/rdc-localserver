"use strict";

const assert = require("assert");
const { TROOP_107X, LAST_SHELTER_SPECIAL_ARMS_CONFIG, troop107xAl, specialArmConfigAl } = require("./last_shelter_troop_107x_reference");

assert.deepStrictEqual(Object.keys(TROOP_107X), ["107000","107001","107002","107003","107004","107005","107006","107007","107008","107009","107019","107100","107101","107102","107103","107104","107105","107106","107107","107108","107109","107119","107200","107201","107202","107203","107204","107205","107206","107207","107208","107209","107219"]);

const expected = {
  "107000": [6,14,8,20,61,0,0,0,1,8,0],
  "107001": [8,19,9,25,100,0,0,0,1.399999976158142,8,0],
  "107002": [22,13,6,33,119,31,0,0,1.899999976158142,9,0],
  "107003": [15,35,15,44,169,0,0,7,2.5,8,0],
  "107004": [38,22,9,58,164,57,0,9,3.200000047683716,9,0],
  "107005": [24,56,22,75,245,0,0,18,4,8,0],
  "107006": [29,68,26,95,253,0,3,22,4.900000095367432,8,0],
  "107007": [70,41,15,118,203,108,4,25,5.900000095367432,9,0],
  "107008": [84,49,18,144,206,133,6,30,7,9,0],
  "107009": [49,114,42,173,323,0,9,39,8.199999809265137,8,0],
  "107100": [11,8,4,20,57,0,0,0,1,16.100000381469727,0],
  "107101": [15,11,4,25,100,0,0,0,1.399999976158142,16.100000381469727,0],
  "107102": [20,15,6,33,155,0,0,0,1.899999976158142,16.100000381469727,0],
  "107103": [32,17,7,44,175,20,0,2,2.5,14.949999809265137,40],
  "107104": [41,22,9,58,228,27,0,5,3.200000047683716,14.949999809265137,40],
  "107105": [44,32,11,75,271,0,0,15,4,16.100000381469727,0],
  "107106": [63,34,13,95,269,56,3,9,4.900000095367432,14.949999809265137,40],
  "107107": [64,47,15,118,253,0,5,27,5.900000095367432,16.100000381469727,0],
  "107108": [91,49,18,144,276,104,8,15,7,14.949999809265137,40],
  "107109": [90,65,21,173,189,0,11,52,8.199999809265137,16.100000381469727,0],
  "107200": [8,6,3,20,57,0,0,0,1,8,50],
  "107201": [11,8,3,25,90,10,0,0,1.399999976158142,8,50],
  "107202": [26,13,4,33,130,14,0,0,1.899999976158142,8,80],
  "107203": [35,17,5,44,185,20,0,2,2.5,8,80],
  "107204": [25,19,6,58,241,27,0,3,3.200000047683716,8,50],
  "107205": [32,24,8,75,296,35,0,4,4,8,50],
  "107206": [68,34,10,95,254,46,5,5,4.900000095367432,8,80],
  "107207": [47,35,11,118,217,53,9,7,5.900000095367432,8,50],
  "107208": [98,49,13,144,181,68,15,10,7,8,80],
  "107209": [65,49,15,173,155,77,19,13,8.199999809265137,8,50],
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
