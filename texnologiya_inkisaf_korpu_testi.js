"use strict";

const assert = require("assert");
const {
  esasInstituteTap,
  suretFaiziniMuddetSaniyesineTetbiqEt,
  texnologiyaInkIsafModifikatorunuHesabla
} = require("./texnologiya_inkisaf_korpu");

assert.strictEqual(suretFaiziniMuddetSaniyesineTetbiqEt(100, 0), 100);
assert.strictEqual(suretFaiziniMuddetSaniyesineTetbiqEt(100, 100), 50);
assert.strictEqual(suretFaiziniMuddetSaniyesineTetbiqEt(100, 25), 80);

const state = {
  buildings: [
    { instanceId: "inst-b", buildingId: "institute", level: 10, isCompleted: true, hasRoadAccess: true },
    { instanceId: "inst-a", buildingId: "institute", level: 10, isCompleted: true, hasRoadAccess: true },
    { instanceId: "inst-z", buildingId: "institute", level: 20, isCompleted: false, hasRoadAccess: true }
  ],
  qehremanTapshiriqlari: { version: 2, technology: null, resources: [], development: [] },
  heroes: []
};

assert.strictEqual(esasInstituteTap(state).instanceId, "inst-a");
const result = texnologiyaInkIsafModifikatorunuHesabla(state, 3600);
assert.strictEqual(result.instituteInstanceId, "inst-a");
assert.strictEqual(result.tedqiqatSuretiFaiz, 0);
assert.strictEqual(result.effektivMuddetSaniye, 3600);
assert.deepStrictEqual(result.effects, []);

console.log("Texnologiya İnkişaf körpüsü testləri uğurla keçdi.");
