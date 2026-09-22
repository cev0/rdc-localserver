"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_WORLD_CONFIG,
  LAST_SHELTER_BATTLEFIELD_MAPS,
  LAST_SHELTER_NEW_ACCOUNT_WORLD,
  battlefieldMapAl,
  battlefieldQadagalariniAl,
  lastShelterWorldRuntimeDefaultHazirla,
  lastShelterWorldRuntimeTeminEt
} = require("./last_shelter_world_battlefield_reference");

assert.deepStrictEqual(
  LAST_SHELTER_WORLD_CONFIG.world_marchtime,
  { k1:"0.82", k2:"120", k3:"3", k4:"20", k5:"10", k6:"0.2" }
);
assert.deepStrictEqual(
  LAST_SHELTER_WORLD_CONFIG.world_detect,
  { k1:"14", k2:"6", k3:"140" }
);
assert.deepStrictEqual(
  LAST_SHELTER_WORLD_CONFIG.worldmap_pvenum,
  { k1:"100", k2:"200", k3:"300", k4:"500", k5:"1000" }
);
assert.strictEqual(LAST_SHELTER_WORLD_CONFIG.recourse_refresh_num, 30);

assert.strictEqual(LAST_SHELTER_BATTLEFIELD_MAPS.length, 3);
assert.deepStrictEqual(
  LAST_SHELTER_BATTLEFIELD_MAPS.map(x => x.id),
  ["220100","220101","220102"]
);

const rules = battlefieldQadagalariniAl("220100");
assert.deepStrictEqual(
  rules.bannedMissileIds,
  ["53303","53309","53310","53311","53312","53314"]
);
assert.ok(rules.bannedGoodIds.includes("208017"));
assert.ok(rules.bannedSkillIds.includes("650004"));
assert.ok(rules.bannedSkillIds.includes("690005"));

const second = battlefieldMapAl("220101");
assert.strictEqual(second.sever_id, "46");
assert.strictEqual(second.type, "2");
assert.strictEqual(second.element, "220300;220301;220302;220303;220304");

const third = battlefieldMapAl("220102");
assert.strictEqual(third.limit_speedup, "999999");
assert.strictEqual(third.limit_move, "3");
assert.strictEqual(third.range, "4");

assert.deepStrictEqual(
  LAST_SHELTER_NEW_ACCOUNT_WORLD,
  {
    maxstamina:100,
    stamina:100,
    lyt:0,
    cityDefValue:500,
    ft:0,
    userActMarchCntPerDay:0,
    autoIncrDefLimitValue:0,
    sheildCdTime:0,
    gridType:2,
    lastStaminaTimeSentinel:"9223372036854775807"
  }
);

const world = lastShelterWorldRuntimeDefaultHazirla();
assert.strictEqual(world.point, null);
assert.strictEqual(world.lastCityDefTime, 0);
assert.deepStrictEqual(world.enemy, []);
assert.deepStrictEqual(world.marches, []);

const state = {};
const ensured = lastShelterWorldRuntimeTeminEt(state);
ensured.stamina = 77;
assert.strictEqual(lastShelterWorldRuntimeTeminEt(state).stamina, 77);

assert.strictEqual(battlefieldMapAl("unknown"), null);

console.log("PASS: verified Last Shelter world and battlefield contracts are preserved.");
