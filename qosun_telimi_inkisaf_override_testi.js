"use strict";

const assert = require("assert");
const qosunTelimi = require("./qosun_telimi_sistemi");
const {
  telimMuddetiniInkIsaflaHesabla,
  binaUcunTelimInkIsafiniAl
} = require("./qosun_telimi_inkisaf_override");

let muddet = telimMuddetiniInkIsaflaHesabla(100000, 40, 60);
assert.strictEqual(muddet.baseDurationMs, 100000);
assert.strictEqual(muddet.technologySpeedPct, 40);
assert.strictEqual(muddet.developmentSpeedPct, 60);
assert.strictEqual(muddet.totalSpeedPct, 100);
assert.strictEqual(muddet.effectiveDurationMs, 50000);

muddet = telimMuddetiniInkIsaflaHesabla(100000, -5, Number.NaN);
assert.strictEqual(muddet.totalSpeedPct, 0);
assert.strictEqual(muddet.effectiveDurationMs, 100000);

muddet = telimMuddetiniInkIsaflaHesabla(500, 1000, 1000);
assert.strictEqual(muddet.effectiveDurationMs, 1000);

const state = {
  resources: { food: 999999, wood: 999999, iron: 999999, fuel: 999999, money: 999999 },
  buildings: [
    {
      instanceId: "camp-1",
      buildingId: "fighter_camp",
      level: 1,
      isCompleted: true,
      hasRoadAccess: true
    }
  ],
  technology: { levels: {}, stats: { trainingSpeedPct: 0 } },
  heroes: [],
  qehremanTapshiriqlari: { version: 2, technology: null, resources: [], development: [] }
};

const inkisaf = binaUcunTelimInkIsafiniAl(state, "camp-1");
assert.strictEqual(inkisaf.developmentSpeedPct, 0);
assert.deepStrictEqual(inkisaf.effects, []);

const preview = qosunTelimi.qosunTelimOnBaxisiniHazirla(state, "camp-1", "warrior_t1", 1);
assert.strictEqual(preview.success, true);
assert.strictEqual(preview.timeInfo.developmentSpeedPct, 0);
assert.strictEqual(preview.timeInfo.totalSpeedPct, preview.timeInfo.speedPct);
assert.deepStrictEqual(preview.timeInfo.developmentEffects, []);

console.log("Qoşun təlimi İnkişaf körpüsü testləri uğurla keçdi.");
