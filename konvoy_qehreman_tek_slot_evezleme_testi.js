"use strict";

const assert = require("assert");

const {
  qehremaniKonvoyaYerlesdir,
  konvoyMelumatiniHazirla
} = require("./konvoy_sistemi");

function stateHazirla() {
  return {
    playerId: "test-player",
    buildings: [],
    technology: { levels: {} },
    heroes: [
      { heroId: "war_master", level: 1, exp: 0, duplicateCopies: 0 },
      { heroId: "feroman", level: 1, exp: 0, duplicateCopies: 0 }
    ],
    konvoylar: { items: [] }
  };
}

const state = stateHazirla();

const birinci = qehremaniKonvoyaYerlesdir(
  state,
  "konvoy_1",
  "war_master"
);

assert.strictEqual(birinci.success, true);
assert.deepStrictEqual(
  konvoyMelumatiniHazirla(state)
    .items.find(x => x.konvoyId === "konvoy_1")
    .qehremanIdleri,
  ["war_master"]
);

const ikinci = qehremaniKonvoyaYerlesdir(
  state,
  "konvoy_1",
  "feroman"
);

assert.strictEqual(ikinci.success, true);
assert.strictEqual(ikinci.replacedHeroId, "war_master");
assert.deepStrictEqual(
  konvoyMelumatiniHazirla(state)
    .items.find(x => x.konvoyId === "konvoy_1")
    .qehremanIdleri,
  ["feroman"]
);

// Eyni qəhrəmanı yenidən atmaq da "yer yoxdur" xətası verməməlidir.
const tekrar = qehremaniKonvoyaYerlesdir(
  state,
  "konvoy_1",
  "feroman"
);

assert.strictEqual(tekrar.success, true);
assert.deepStrictEqual(
  konvoyMelumatiniHazirla(state)
    .items.find(x => x.konvoyId === "konvoy_1")
    .qehremanIdleri,
  ["feroman"]
);

console.log("konvoy_qehreman_tek_slot_evezleme_testi: OK");
