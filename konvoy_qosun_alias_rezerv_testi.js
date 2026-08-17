"use strict";

const assert = require("assert");

const {
  canonicalQosunSnapshotiniAl,
  orduQosunlariniCanonicalAl,
  digerKonvoylardaIstifadeOlunanlariAl,
  konvoyQosunMelumatiniHazirla,
  konvoyQosunlariniTeyinEt
} = require("./konvoy_qosun_sistemi");

function ikiKamp() {
  return [
    { instanceId: "barrack-a", buildingId: "barrack_1", isCompleted: true, level: 1 },
    { instanceId: "barrack-b", buildingId: "barrack_1", isCompleted: true, level: 1 }
  ];
}

function stateHazirla(troops, buildings = []) {
  return {
    buildings,
    technology: { levels: {}, currentResearch: null },
    heroes: [],
    army: { troops: { ...(troops || {}) } },
    konvoylar: { items: [] }
  };
}

let state = stateHazirla({ warrior_t1: 43, shooter_t1: 7 });
let netice = konvoyQosunlariniTeyinEt(state, "konvoy_1", { fighter_lv1: 43 });
assert.strictEqual(netice.success, true);
assert.strictEqual(netice.tutum, 5000);
assert.strictEqual(netice.istifadeOlunanTutum, 43);
assert.deepStrictEqual(netice.qosunlar, { fighter_lv1: 43 });
assert.deepStrictEqual(netice.qosunlarCanonical, { warrior_t1: 43 });
assert.deepStrictEqual(state.konvoylar.items[0].qosunlar, { fighter_lv1: 43 });

state = stateHazirla({ fighter_lv1: 5, warrior_t1: 10 });
assert.deepStrictEqual(orduQosunlariniCanonicalAl(state).qosunlar, { warrior_t1: 15 });
netice = konvoyQosunlariniTeyinEt(state, "konvoy_1", { fighter_lv1: 15 });
assert.strictEqual(netice.success, true);
assert.strictEqual(netice.istifadeOlunanTutum, 15);

state = stateHazirla({ warrior_t1: 43 }, ikiKamp());
let birinci = konvoyQosunlariniTeyinEt(state, "konvoy_1", { fighter_lv1: 30 });
assert.strictEqual(birinci.success, true);
let rezerv = digerKonvoylardaIstifadeOlunanlariAl(state, "konvoy_2");
assert.strictEqual(rezerv.warrior_t1, 30);

let ikinci = konvoyQosunlariniTeyinEt(state, "konvoy_2", { warrior_t1: 14 });
assert.strictEqual(ikinci.success, false);
assert.strictEqual(ikinci.canonicalUnitId, "warrior_t1");
assert.strictEqual(ikinci.available, 13);
assert.strictEqual(ikinci.reservedInOtherConvoys, 30);

ikinci = konvoyQosunlariniTeyinEt(state, "konvoy_2", { warrior_t1: 13 });
assert.strictEqual(ikinci.success, true);
assert.strictEqual(ikinci.istifadeOlunanTutum, 13);

state = stateHazirla({ warrior_t1: 10 });
netice = konvoyQosunlariniTeyinEt(
  state,
  "konvoy_1",
  { fighter_lv1: 6, warrior_t1: 5 }
);
assert.strictEqual(netice.success, false);
assert.strictEqual(netice.canonicalUnitId, "warrior_t1");
assert.strictEqual(netice.owned, 10);

state = stateHazirla({ fake_unit: 999 });
netice = konvoyQosunlariniTeyinEt(state, "konvoy_1", { fake_unit: 1 });
assert.strictEqual(netice.success, false);
assert.deepStrictEqual(netice.unknownUnitIds, ["fake_unit"]);

state = stateHazirla({ fighter_lv1: 2, warrior_t1: 3 });
netice = konvoyQosunlariniTeyinEt(state, "konvoy_1", { fighter_lv1: 5 });
assert.strictEqual(netice.success, true);
const info = konvoyQosunMelumatiniHazirla(state);
assert.strictEqual(info.ordu.fighter_lv1, 2);
assert.strictEqual(info.ordu.warrior_t1, 3);
assert.strictEqual(info.orduCanonical.warrior_t1, 5);
assert.strictEqual(info.items[0].qosunlar.fighter_lv1, 5);
assert.strictEqual(info.items[0].qosunlarCanonical.warrior_t1, 5);

assert.deepStrictEqual(
  canonicalQosunSnapshotiniAl({ shooter_lv2: 4, shooter_t2: 6 }).qosunlar,
  { shooter_t2: 10 }
);

console.log("konvoy_qosun_alias_rezerv_testi: OK");
