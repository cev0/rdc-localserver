"use strict";

const assert = require("assert");

const {
  melumatiHazirla,
  baslat
} = require("./konvoy_tutum_texnologiya_handler");

const state = {
  resources: {
    wood: 999999,
    iron: 999999,
    fuel: 999999,
    money: 999999
  },
  technology: {
    levels: {
      konvoy_qosun_tutumu: 0
    },
    currentResearch: null
  },
  buildings: [
    { buildingId: "hq", level: 25, isCompleted: true },
    { buildingId: "institute", level: 25, isCompleted: true, hasRoadAccess: true }
  ]
};

const evvelki = JSON.parse(JSON.stringify(state));
const info = melumatiHazirla(state);

assert.strictEqual(info.legacyDisabled, true);
assert.strictEqual(info.canResearch, false);
assert.strictEqual(info.gameplaySource, "convoy_building_hero_level_skill1_skill6");
assert.strictEqual(info.currentCapacityIsLegacyOnly, true);

const netice = baslat(state, 1700000000000);

assert.strictEqual(netice.ok, false);
assert.strictEqual(netice.legacyDisabled, true);
assert.strictEqual(netice.info.canResearch, false);
assert.deepStrictEqual(state, evvelki);

// Köhnə snapshot-da level olsa belə bu yalnız legacy metadata-dır və yeni
// research start route-u yenə bağlı qalmalıdır.
state.technology.levels.konvoy_qosun_tutumu = 4;
const maxInfo = melumatiHazirla(state);
assert.strictEqual(maxInfo.currentLevel, 4);
assert.strictEqual(maxInfo.legacyDisabled, true);
assert.strictEqual(maxInfo.canResearch, false);
assert.strictEqual(baslat(state).ok, false);

console.log("konvoy_tutum_texnologiya_disabled_testi: OK");
