"use strict";

const assert = require("assert");

const {
  KONVOY_BARRACK_TUTUM_CEDVELI,
  barrackTutumunuAl,
  barrackSiraTutumunuAl
} = require("./konvoy_tutum_qaydalari");
const {
  konvoyTutumHesabiniAl
} = require("./konvoy_tutum_formulu");

assert.strictEqual(KONVOY_BARRACK_TUTUM_CEDVELI.length, 25);
assert.strictEqual(barrackTutumunuAl(1), 1200);
assert.strictEqual(barrackSiraTutumunuAl(1), 400);
assert.strictEqual(barrackTutumunuAl(15), 31500);
assert.strictEqual(barrackTutumunuAl(19), 51000);
assert.strictEqual(barrackTutumunuAl(20), 57000);
assert.strictEqual(barrackTutumunuAl(25), 82500);
assert.strictEqual(barrackSiraTutumunuAl(25), 27500);

const state = {
  buildings: [
    { instanceId: "kamp-1", buildingId: "barrack_1", level: 1, isCompleted: true },
    { instanceId: "kamp-2", buildingId: "barrack_2", level: 2, isCompleted: true },
    { instanceId: "kamp-3", buildingId: "barrack_3", level: 25, isCompleted: false }
  ],
  heroes: [],
  konvoylar: {
    items: [
      { konvoyId: "konvoy_1", qehremanIdleri: [] },
      { konvoyId: "konvoy_2", qehremanIdleri: [] }
    ]
  }
};

const birinci = konvoyTutumHesabiniAl(state, "konvoy_1");
assert.strictEqual(birinci.formulaVersion, 4);
assert.strictEqual(birinci.formulaActive, true);
assert.strictEqual(birinci.source, "barracks_level");
assert.strictEqual(birinci.buildingId, "barrack_1");
assert.strictEqual(birinci.buildingLevel, 1);
assert.strictEqual(birinci.esasBinaTutumu, 1200);
assert.strictEqual(birinci.siraTutumu, 400);
assert.strictEqual(birinci.yekunTutum, 1200);
assert.strictEqual(birinci.qehremanBonuslariAktiv, false);

const ikinci = konvoyTutumHesabiniAl(state, "konvoy_2");
assert.strictEqual(ikinci.formulaActive, true);
assert.strictEqual(ikinci.buildingId, "barrack_2");
assert.strictEqual(ikinci.buildingLevel, 2);
assert.strictEqual(ikinci.yekunTutum, 1350);
assert.strictEqual(ikinci.siraTutumu, 450);

// Tamamlanmamış kamp tutum mənbəyi deyil. Legacy 5000 fallback 3 sıraya
// ceil ilə bölünür ki, 5000-in hamısı istifadə edilə bilsin; ümumi validator
// yenə 5000-dən yuxarı cəmi bloklayır.
const ucuncu = konvoyTutumHesabiniAl(state, "konvoy_3");
assert.strictEqual(ucuncu.formulaActive, false);
assert.strictEqual(ucuncu.source, "legacy_5000_fallback");
assert.strictEqual(ucuncu.yekunTutum, 5000);
assert.strictEqual(ucuncu.siraTutumu, 1667);

// Köhnə snapshot compatibility: eyni barrack ID-li iki persistent instance
// varsa ikinci konvoy ikinci tamamlanmış instance-i götürə bilir.
const legacyState = {
  buildings: [
    { instanceId: "a", buildingId: "barrack_1", level: 3, isCompleted: true },
    { instanceId: "b", buildingId: "barrack_1", level: 4, isCompleted: true }
  ],
  konvoylar: { items: [] }
};
const legacyIkinci = konvoyTutumHesabiniAl(legacyState, "konvoy_2");
assert.strictEqual(legacyIkinci.formulaActive, true);
assert.strictEqual(legacyIkinci.buildingInstanceId, "b");
assert.strictEqual(legacyIkinci.buildingLevel, 4);
assert.strictEqual(legacyIkinci.yekunTutum, 2100);
assert.strictEqual(legacyIkinci.siraTutumu, 700);

console.log("konvoy_tutum_formulu_testi: OK");
