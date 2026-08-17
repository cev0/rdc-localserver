"use strict";

const assert = require("assert");
const {
  binaUcunResursInkIsafiniAl,
  istehsalMiqdariniHesabla,
  stateUcunBinaIstehsaliniHesabla
} = require("./resurs_inkisaf_korpu");

let hesab = istehsalMiqdariniHesabla(100, 20, 30);
assert.strictEqual(hesab.baseAmount, 100);
assert.strictEqual(hesab.technologyProductionPct, 20);
assert.strictEqual(hesab.developmentProductionPct, 30);
assert.strictEqual(hesab.totalProductionPct, 50);
assert.strictEqual(hesab.finalAmount, 150);

hesab = istehsalMiqdariniHesabla(101, 0, 25);
assert.strictEqual(hesab.finalAmount, 126);

hesab = istehsalMiqdariniHesabla(100, -5, Number.NaN);
assert.strictEqual(hesab.totalProductionPct, 0);
assert.strictEqual(hesab.finalAmount, 100);

const state = {
  buildings: [
    { instanceId: "farm-1", buildingId: "farm", level: 1, isCompleted: true, hasRoadAccess: true }
  ],
  heroes: [],
  qehremanTapshiriqlari: { version: 2, technology: null, resources: [], development: [] }
};

const modifier = binaUcunResursInkIsafiniAl(state, "farm-1");
assert.strictEqual(modifier.developmentProductionPct, 0);
assert.deepStrictEqual(modifier.effects, []);

const result = stateUcunBinaIstehsaliniHesabla(state, "farm-1", 100, 20);
assert.strictEqual(result.developmentProductionPct, 0);
assert.strictEqual(result.totalProductionPct, 20);
assert.strictEqual(result.finalAmount, 120);
assert.deepStrictEqual(result.developmentEffects, []);

console.log("Resurs istehsalı İnkişaf körpüsü testləri uğurla keçdi.");
