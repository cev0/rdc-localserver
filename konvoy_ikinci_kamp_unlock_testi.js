"use strict";

const assert = require("assert");

const {
  tamamlanmisEsgerKampiSayiniAl,
  ikinciKonvoyUnlockMelumatiniAl,
  aciqKonvoySayiniAl,
  konvoyMelumatiniHazirla
} = require("./konvoy_sistemi");

function stateHazirla(buildings, technologyLevels = {}) {
  return {
    buildings: Array.isArray(buildings) ? buildings : [],
    technology: { levels: { ...technologyLevels } },
    heroes: [],
    konvoylar: { items: [] }
  };
}

let state = stateHazirla([]);
assert.strictEqual(tamamlanmisEsgerKampiSayiniAl(state), 0);
assert.strictEqual(aciqKonvoySayiniAl(state), 1);
assert.strictEqual(ikinciKonvoyUnlockMelumatiniAl(state).unlocked, false);

state = stateHazirla([
  {
    instanceId: "barrack-a",
    buildingId: "barrack_1",
    isCompleted: true,
    level: 1
  }
]);
assert.strictEqual(tamamlanmisEsgerKampiSayiniAl(state), 1);
assert.strictEqual(aciqKonvoySayiniAl(state), 1);

state = stateHazirla([
  {
    instanceId: "barrack-a",
    buildingId: "barrack_1",
    isCompleted: true,
    level: 1
  },
  {
    instanceId: "barrack-b",
    buildingId: "barrack_1",
    isCompleted: false,
    level: 1
  }
]);
assert.strictEqual(tamamlanmisEsgerKampiSayiniAl(state), 1);
assert.strictEqual(aciqKonvoySayiniAl(state), 1);

state = stateHazirla([
  {
    instanceId: "barrack-a",
    buildingId: "barrack_1",
    isCompleted: true,
    level: 1
  },
  {
    instanceId: "barrack-b",
    buildingId: "barrack_1",
    isCompleted: true,
    level: 1
  }
]);
assert.strictEqual(tamamlanmisEsgerKampiSayiniAl(state), 2);
assert.strictEqual(aciqKonvoySayiniAl(state), 2);

const info = konvoyMelumatiniHazirla(state);
assert.strictEqual(info.aciqKonvoySayi, 2);
assert.strictEqual(info.ikinciKonvoyUnlockInfo.rule, "second_completed_barrack");
assert.strictEqual(info.ikinciKonvoyUnlockInfo.requiredCompletedBarracks, 2);
assert.strictEqual(info.ikinciKonvoyUnlockInfo.completedBarracks, 2);
assert.strictEqual(info.ikinciKonvoyUnlockInfo.unlocked, true);
assert.strictEqual(
  info.items.find(x => x.konvoyId === "konvoy_2").aciqdir,
  true
);

// Eyni persistent instance iki dəfə gəlsə iki kamp sayılmamalıdır.
state = stateHazirla([
  {
    instanceId: "same-barrack",
    buildingId: "barrack_1",
    isCompleted: true,
    level: 1
  },
  {
    instanceId: "same-barrack",
    buildingId: "barrack_1",
    isCompleted: true,
    level: 2
  }
]);
assert.strictEqual(tamamlanmisEsgerKampiSayiniAl(state), 1);
assert.strictEqual(aciqKonvoySayiniAl(state), 1);

// Köhnə ikinci_konvoy texnologiyası təkbaşına artıq gameplay unlock mənbəyi deyil.
state = stateHazirla([], { ikinci_konvoy: 1 });
assert.strictEqual(aciqKonvoySayiniAl(state), 1);
assert.strictEqual(ikinciKonvoyUnlockMelumatiniAl(state).unlocked, false);

// Köhnə tier ID-ləri olan snapshot-lar da compatibility üçün sayılır.
state = stateHazirla([
  {
    instanceId: "barrack-a",
    buildingId: "barrack_2",
    isCompleted: true
  },
  {
    instanceId: "barrack-b",
    buildingId: "barrack_3",
    isCompleted: true
  }
]);
assert.strictEqual(tamamlanmisEsgerKampiSayiniAl(state), 2);
assert.strictEqual(aciqKonvoySayiniAl(state), 2);

console.log("konvoy_ikinci_kamp_unlock_testi: OK");
