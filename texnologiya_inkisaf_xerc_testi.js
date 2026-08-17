"use strict";
const assert = require("assert");
const { xercEndiriminiTetbiqEt, texnologiyaInkIsafModifikatorunuHesabla } = require("./texnologiya_inkisaf_korpu");

assert.deepStrictEqual(
  xercEndiriminiTetbiqEt([{ type: "wood", amount: 101 }, { type: "money", amount: 50 }], 20),
  [{ type: "wood", amount: 81 }, { type: "money", amount: 40 }]
);
assert.deepStrictEqual(
  xercEndiriminiTetbiqEt([{ type: "wood", amount: 100 }], -20),
  [{ type: "wood", amount: 100 }]
);
assert.deepStrictEqual(xercEndiriminiTetbiqEt([{ type: "wood", amount: 100 }], 150), []);

const state = {
  buildings: [{ instanceId: "inst-1", buildingId: "institute", level: 2, isCompleted: true, hasRoadAccess: true }],
  heroes: [],
  qehremanTapshiriqlari: { development: [] }
};
const netice = texnologiyaInkIsafModifikatorunuHesabla(state, 100, [{ type: "wood", amount: 100 }]);
assert.strictEqual(netice.tedqiqatXerciEndirimFaiz, 0);
assert.deepStrictEqual(netice.effektivXerc, [{ type: "wood", amount: 100 }]);
console.log("Texnologiya İnkişaf xərc testləri uğurla keçdi.");
