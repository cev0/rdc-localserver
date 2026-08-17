"use strict";

const assert = require("assert");
const { inkisafTapshiriqlariniBarisdir } = require("./qehreman_tapshiriq_saglamliq");
const { tapshiriqMelumatiniHazirla } = require("./qehreman_tapshiriq_sistemi");

const state = {
  heroes: [{ heroId: "feroman", level: 50 }],
  buildings: [
    { instanceId: "bina_1", buildingId: "institute", isCompleted: true },
    { instanceId: "bina_2", buildingId: "hospital", isCompleted: false }
  ],
  konvoylar: { items: [] },
  qehremanTapshiriqlari: {
    version: 2,
    technology: null,
    resources: [],
    development: [
      { heroId: "namelum_qehreman", buildingInstanceId: "bina_1", buildingId: "institute", field: "texnologiya" },
      { heroId: "feroman", buildingInstanceId: "yox_bina", buildingId: "hospital", field: "xestexana" },
      { heroId: "", buildingInstanceId: "bina_1" }
    ]
  }
};

const netice = inkisafTapshiriqlariniBarisdir(state, state.qehremanTapshiriqlari);
assert.strictEqual(netice.deyisdi, true);
assert.strictEqual(netice.development.length, 0);
assert.strictEqual(netice.silinenler.length, 3);
assert.strictEqual(state.qehremanTapshiriqlari.development.length, 0);

const info = tapshiriqMelumatiniHazirla(state);
assert.strictEqual(Array.isArray(info.development), true);
assert.strictEqual(info.development.length, 0);
assert.strictEqual(info.policies.staleDevelopmentAssignmentsAreRemoved, true);
assert.strictEqual(info.reconciliation.removedCount, 0);

const temizState = {
  heroes: [],
  buildings: [],
  qehremanTapshiriqlari: { version: 2, technology: null, resources: [], development: [] }
};
const temizNetice = inkisafTapshiriqlariniBarisdir(temizState, temizState.qehremanTapshiriqlari);
assert.strictEqual(temizNetice.deyisdi, false);
assert.deepStrictEqual(temizNetice.silinenler, []);

console.log("Qəhrəman İnkişaf təyinat sağlamlıq testləri uğurla keçdi.");
