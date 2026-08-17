"use strict";

const assert = require("assert");
const {
  ticaretBinasininInkIsafModifikatorlariniHesabla,
  ticaretYukTutumunuHesabla
} = require("./ticaret_inkisaf_korpu");

(function bonusOlmadanSifirQalir() {
  const state = {
    buildings: [
      {
        instanceId: "trade-1",
        buildingId: "trade_building",
        isCompleted: true
      }
    ],
    heroes: [],
    qehremanTapshiriqlari: { development: [] }
  };

  const result = ticaretBinasininInkIsafModifikatorlariniHesabla(state, "trade-1");
  assert.strictEqual(result.cargoCapacityPercent, 0);
  assert.strictEqual(result.tradePricePercent, 0);
  assert.deepStrictEqual(result.effects, []);
})();

(function yukTutumuFaizleArtir() {
  assert.strictEqual(ticaretYukTutumunuHesabla(1000, 25), 1250);
  assert.strictEqual(ticaretYukTutumunuHesabla(1000, 0), 1000);
  assert.strictEqual(ticaretYukTutumunuHesabla(1000, -30), 1000);
})();

(function etibarsizDeyerlerTehlukesizdir() {
  assert.strictEqual(ticaretYukTutumunuHesabla("500", "10"), 550);
  assert.strictEqual(ticaretYukTutumunuHesabla("x", 20), 0);
  assert.strictEqual(ticaretYukTutumunuHesabla(500, "x"), 500);
})();

console.log("Ticarət İnkişaf körpüsü testləri uğurla keçdi.");
