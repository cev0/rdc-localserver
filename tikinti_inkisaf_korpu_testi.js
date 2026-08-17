"use strict";

const assert = require("assert");
const {
  tikintiInkIsafEffektleriniHesabla,
  tikintiMuddetiniHesabla,
  stateUcunTikintiMuddetiniHesabla
} = require("./tikinti_inkisaf_korpu");

let result = tikintiMuddetiniHesabla(100000, 25, 0);
assert.strictEqual(result.effectiveDurationMs, 80000);
assert.strictEqual(result.totalSpeedPct, 25);

result = tikintiMuddetiniHesabla(100000, 25, 25);
assert.strictEqual(result.effectiveDurationMs, 66667);
assert.strictEqual(result.totalSpeedPct, 50);

result = tikintiMuddetiniHesabla(0, 25, 25);
assert.strictEqual(result.effectiveDurationMs, 0);

result = tikintiMuddetiniHesabla(100000, -10, -20);
assert.strictEqual(result.effectiveDurationMs, 100000);
assert.strictEqual(result.totalSpeedPct, 0);

const state = {
  heroes: [],
  buildings: [],
  qehremanTapshiriqlari: { version: 2, development: [] }
};

const effects = tikintiInkIsafEffektleriniHesabla(state);
assert.strictEqual(effects.tikintiSuretiFaiz, 0);
assert.deepStrictEqual(effects.effects, []);

const stateResult = stateUcunTikintiMuddetiniHesabla(state, 120000, 20);
assert.strictEqual(stateResult.developmentSpeedPct, 0);
assert.strictEqual(stateResult.effectiveDurationMs, 100000);
assert.deepStrictEqual(stateResult.developmentEffects, []);

console.log("Tikinti İnkişaf körpüsü testləri uğurla keçdi.");
