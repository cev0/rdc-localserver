"use strict";

const assert = require("assert");
const {
  CURRENT_UNLOCK_NUM_RAW,
  NEXT_UNLOCK_NUM_RAW,
  LAST_SHELTER_STARTER_BUILDINGS,
  LAST_SHELTER_BUILD_LIST_CONFIG,
  unlockNumParseEt,
  starterCityRuntimeHazirla,
  lastShelterCityRuntimeTeminEt
} = require("./last_shelter_starter_city_reference");

assert.strictEqual(LAST_SHELTER_STARTER_BUILDINGS.length, 2);

const auxiliary = LAST_SHELTER_STARTER_BUILDINGS[0];
assert.deepStrictEqual(
  { itemId:auxiliary.itemId, level:auxiliary.level, x:auxiliary.x, y:auxiliary.y, power:auxiliary.power, building:auxiliary.building, time:auxiliary.time },
  { itemId:"443000", level:1, x:33, y:29, power:50, building:"400000;2", time:1 }
);

const hq = LAST_SHELTER_STARTER_BUILDINGS[1];
assert.strictEqual(hq.itemId, "400000");
assert.strictEqual(hq.level, 1);
assert.strictEqual(hq.x, 32);
assert.strictEqual(hq.y, 32);
assert.strictEqual(hq.power, 2323);
assert.strictEqual(hq.building, "460000;1|433000;1");
assert.strictEqual(hq.population, "0");
assert.strictEqual(hq.next_population, "180");

assert.strictEqual(LAST_SHELTER_BUILD_LIST_CONFIG.length, 10);
assert.deepStrictEqual(
  LAST_SHELTER_BUILD_LIST_CONFIG,
  [
    { para1:212004, para2:600, id:600000 },
    { para1:212004, para2:200, id:600001 },
    { para1:212004, para2:10, id:600002 },
    { para1:212004, para2:10, id:600003 },
    { para1:212004, para2:300, id:600004 },
    { para1:212004, para2:80, id:600005 },
    { para1:212102, para2:300, id:600006 },
    { para1:212101, para2:100, id:600007 },
    { para1:212004, para2:300, id:600008 },
    { para1:212004, para2:300, id:600009 }
  ]
);

const current = unlockNumParseEt(CURRENT_UNLOCK_NUM_RAW);
const next = unlockNumParseEt(NEXT_UNLOCK_NUM_RAW);
assert.deepStrictEqual(current.malformed, ["600003;0600004;0"]);
assert.deepStrictEqual(next.malformed, ["600003;0600004;0"]);

function count(parsed, id) {
  const hit = parsed.entries.find(x => x.buildingTypeId === id);
  return hit ? hit.count : null;
}

assert.strictEqual(count(current,"415000"),1);
assert.strictEqual(count(current,"432000"),1);
assert.strictEqual(count(current,"433000"),1);
assert.strictEqual(count(current,"443000"),1);
assert.strictEqual(count(current,"460000"),1);

for (const pair of [
  ["413000",2],["415000",2],["431000",1],["447000",1],
  ["444000",1],["480000",1],["481000",1],["482000",1],
  ["445000",1],["448000",1],["418000",1],["411000",1],["423000",1]
]) {
  assert.strictEqual(count(next,pair[0]),pair[1],pair[0]);
}

let n = 0;
const runtime = starterCityRuntimeHazirla(() => "uuid-" + (++n));
assert.strictEqual(runtime.buildings[0].uuid, "uuid-1");
assert.strictEqual(runtime.buildings[1].uuid, "uuid-2");
assert.strictEqual(Object.prototype.hasOwnProperty.call(LAST_SHELTER_STARTER_BUILDINGS[0],"uuid"),false);

runtime.buildings[0].power = 999;
assert.strictEqual(LAST_SHELTER_STARTER_BUILDINGS[0].power, 50);

const state = {};
const first = lastShelterCityRuntimeTeminEt(state, () => "stable-a");
const second = lastShelterCityRuntimeTeminEt(state, () => "stable-b");
assert.strictEqual(first, second);
assert.strictEqual(first.buildings[0].uuid, "stable-a");

console.log("PASS: verified Last Shelter fresh-account city/building snapshot and unlock contract are preserved.");
