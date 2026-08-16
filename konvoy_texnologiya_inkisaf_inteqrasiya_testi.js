"use strict";

const assert = require("assert");
const { KONVOY_TEXNOLOGIYA_BALANSI } = require("./konvoy_qaydalari");
const { researchBaslat } = require("./konvoy_texnologiya_handler");

const balans = KONVOY_TEXNOLOGIYA_BALANSI.IKINCI_QEHRAMAN_YERI;
const nowMs = 1234567890000;
const state = {
  resources: {
    wood: 10000,
    iron: 10000,
    fuel: 10000,
    money: 10000
  },
  technology: {
    levels: {},
    currentResearch: null
  },
  buildings: [
    { instanceId: "hq-1", buildingId: "hq", level: 10, isCompleted: true, hasRoadAccess: true },
    { instanceId: "inst-b", buildingId: "institute", level: 5, isCompleted: true, hasRoadAccess: true },
    { instanceId: "inst-a", buildingId: "institute", level: 5, isCompleted: true, hasRoadAccess: true }
  ],
  qehremanTapshiriqlari: {
    version: 2,
    technology: null,
    resources: [],
    development: []
  },
  heroes: []
};

const netice = researchBaslat(state, balans, nowMs);
assert.strictEqual(netice.ok, true);
assert.strictEqual(netice.research.techId, balans.techId);
assert.strictEqual(netice.research.instituteInstanceId, "inst-a");
assert.strictEqual(netice.research.baseDurationSeconds, balans.researchTimeSeconds);
assert.strictEqual(netice.research.researchSpeedPercent, 0);
assert.strictEqual(netice.research.durationMs, balans.researchTimeSeconds * 1000);
assert.strictEqual(netice.research.endsAtMs, nowMs + balans.researchTimeSeconds * 1000);
assert.strictEqual(netice.developmentModifier.instituteInstanceId, "inst-a");
assert.strictEqual(netice.developmentModifier.researchSpeedPercent, 0);
assert.strictEqual(netice.developmentModifier.effectiveDurationSeconds, balans.researchTimeSeconds);
assert.deepStrictEqual(netice.developmentModifier.effects, []);

assert.strictEqual(state.resources.wood, 10000 - 500);
assert.strictEqual(state.resources.iron, 10000 - 200);
assert.strictEqual(state.resources.money, 10000 - 400);

console.log("Konvoy texnologiyası İnkişaf inteqrasiya testləri uğurla keçdi.");
