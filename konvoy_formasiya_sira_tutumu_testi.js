"use strict";

const assert = require("assert");
const {
  formasiyaMelumatiniHazirla,
  formasiyaTeyinEt
} = require("./konvoy_formasiya_sistemi");

function stateHazirla() {
  return {
    buildings: [
      {
        instanceId: "barrack-1-instance",
        buildingId: "barrack_1",
        level: 1,
        isCompleted: true
      }
    ],
    technology: { levels: {} },
    heroes: [],
    army: {
      troops: {
        fighter_lv1: 1200
      }
    },
    konvoylar: { items: [] }
  };
}

let state = stateHazirla();
let info = formasiyaMelumatiniHazirla(state);
const item = info.items.find(x => x.konvoyId === "konvoy_1");
assert.ok(item);
assert.strictEqual(info.rowCount, 3);
assert.strictEqual(info.siraTutumu, 400);
assert.strictEqual(item.tutum, 1200);
assert.strictEqual(item.siraTutumu, 400);

// Lv1 kampda bir sıra maksimum 400-dür; ümumi tutum 1200 olsa belə
// client bir sıraya 401 yığa bilməz.
let netice = formasiyaTeyinEt(state, "konvoy_1", [
  { siraId: "sira_1", unitId: "fighter_lv1", count: 401 },
  { siraId: "sira_2", unitId: "", count: 0 },
  { siraId: "sira_3", unitId: "", count: 0 }
]);
assert.strictEqual(netice.success, false);
assert.strictEqual(netice.siraId, "sira_1");
assert.strictEqual(netice.siraTutumu, 400);

// Üç sıranın hər biri 400 olduqda 1200 tam istifadə oluna bilir.
state = stateHazirla();
netice = formasiyaTeyinEt(state, "konvoy_1", [
  { siraId: "sira_1", unitId: "fighter_lv1", count: 400 },
  { siraId: "sira_2", unitId: "fighter_lv1", count: 400 },
  { siraId: "sira_3", unitId: "fighter_lv1", count: 400 }
]);
assert.strictEqual(netice.success, true);
assert.strictEqual(netice.tutum, 1200);
assert.strictEqual(netice.siraTutumu, 400);
assert.strictEqual(netice.istifadeOlunanTutum, 1200);

console.log("konvoy_formasiya_sira_tutumu_testi: OK");
