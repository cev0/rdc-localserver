"use strict";

const assert = require("assert");

process.env.XESTEXANA_BINASI_IDLERI = "xestexana";
process.env.XESTEXANA_TUTUM_CEDVELI = JSON.stringify([1000, 1500]);
process.env.XESTEXANA_SAGALTMA_XERC_BIR_ESGER = JSON.stringify({ food: 2, money: 1 });

const xestexana = require("./xestexana_sistemi");
const {
  faizAzalmasiniTetbiqEt,
  xestexanaInkIsafModifikatorlariniAl
} = require("./xestexana_inkisaf_override");

assert.strictEqual(faizAzalmasiniTetbiqEt(100, 0), 100);
assert.strictEqual(faizAzalmasiniTetbiqEt(100, 25), 75);
assert.strictEqual(faizAzalmasiniTetbiqEt(101, 25), 76);
assert.strictEqual(faizAzalmasiniTetbiqEt(100, 999), 0);
assert.strictEqual(faizAzalmasiniTetbiqEt(100, -50), 100);

const state = {
  resources: { food: 10000, money: 10000 },
  buildings: [
    { buildingId: "xestexana", instanceId: "hospital-1", level: 1, isCompleted: true }
  ],
  heroes: [],
  qehremanTapshiriqlari: { version: 2, development: [] },
  xestexana: {
    version: 2,
    yaralilar: { piyada: 20 },
    sagaltmaTarixcesi: []
  }
};

const modifier = xestexanaInkIsafModifikatorlariniAl(state, "hospital-1");
assert.strictEqual(modifier.healingSpeedPct, 0);
assert.strictEqual(modifier.healingCostReductionPct, 0);
assert.strictEqual(modifier.hospitalCapacityBonus, 0);
assert.deepStrictEqual(modifier.effects, []);

const tutum = xestexana.xestexanaTutumHesabiniAl(state);
assert.strictEqual(tutum.formulaVersion, 3);
assert.strictEqual(tutum.baseCapacity, 1000);
assert.strictEqual(tutum.developmentCapacityBonus, 0);
assert.strictEqual(tutum.tutum, 1000);
assert.strictEqual(tutum.bosTutum, 980);

const preview = xestexana.sagaltmaPreviewHazirla(state, [{ unitId: "piyada", count: 10 }]);
assert.strictEqual(preview.success, true);
assert.strictEqual(preview.umumiSay, 10);
assert.deepStrictEqual(preview.xerc, { food: 20, money: 10 });
assert.strictEqual(preview.resursYetir, true);
assert.strictEqual(preview.developmentModifier.healingCostReductionPct, 0);
assert.strictEqual(preview.healingSpeedApplied, false);
assert.strictEqual(preview.healingSpeedNote, "");

console.log("Xəstəxana İnkişaf körpüsü testləri uğurla keçdi.");
