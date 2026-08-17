"use strict";

const assert = require("assert");

const {
  unityFormasiyasiniSiralarArrayinaCevir,
  siralarArrayiniUnityFormasiyasinaCevir,
  formationInfoUnityUcunUyğunlaşdır,
  konvoyMutasiyasiniTetbiqEt
} = require("./konvoy_handler");

const unityFormasiya = {
  sira_1: { unitId: "fighter_lv1", count: 43 },
  sira_2: { unitId: "shooter_lv1", count: 7 },
  sira_3: { unitId: "", count: 0 }
};

const siralar = unityFormasiyasiniSiralarArrayinaCevir(unityFormasiya);

assert.deepStrictEqual(siralar, [
  { siraId: "sira_1", unitId: "fighter_lv1", count: 43 },
  { siraId: "sira_2", unitId: "shooter_lv1", count: 7 },
  { siraId: "sira_3", unitId: "", count: 0 }
]);

assert.deepStrictEqual(
  siralarArrayiniUnityFormasiyasinaCevir(siralar),
  unityFormasiya
);

const formationInfo = formationInfoUnityUcunUyğunlaşdır(
  {
    version: 1,
    rowCount: 3,
    rowsAlwaysOpen: true,
    items: [
      {
        konvoyId: "konvoy_1",
        aciqdir: true,
        siralar,
        qosunlar: {
          fighter_lv1: 43,
          shooter_lv1: 7
        }
      }
    ]
  },
  {
    tutumLevel: 0,
    tutum: 5000,
    items: [
      {
        konvoyId: "konvoy_1",
        aciqdir: true,
        tutum: 5000,
        istifadeOlunanTutum: 50,
        qosunlar: {
          fighter_lv1: 43,
          shooter_lv1: 7
        }
      }
    ]
  }
);

assert.strictEqual(formationInfo.tutumLevel, 0);
assert.strictEqual(formationInfo.tutum, 5000);
assert.strictEqual(formationInfo.items.length, 1);
assert.strictEqual(formationInfo.items[0].tutum, 5000);
assert.strictEqual(formationInfo.items[0].istifadeOlunanTutum, 50);
assert.deepStrictEqual(formationInfo.items[0].formation, unityFormasiya);

const state = {
  technology: { levels: {} },
  heroes: [],
  army: {
    troops: {
      fighter_lv1: 43,
      shooter_lv1: 7
    }
  },
  konvoylar: {
    items: [
      {
        konvoyId: "konvoy_1",
        qehremanIdleri: [],
        qosunlar: {}
      }
    ]
  }
};

const mutasiya = konvoyMutasiyasiniTetbiqEt(
  state,
  "convoy_formation_set_request",
  {
    konvoyId: "konvoy_1",
    formation: unityFormasiya
  },
  1700000000000
);

assert.strictEqual(mutasiya.success, true);
assert.strictEqual(mutasiya.netice.konvoyId, "konvoy_1");
assert.strictEqual(mutasiya.netice.tutum, 5000);
assert.strictEqual(mutasiya.netice.istifadeOlunanTutum, 50);
assert.deepStrictEqual(mutasiya.netice.formation, unityFormasiya);
assert.strictEqual(mutasiya.netice.formationInfo.tutum, 5000);
assert.strictEqual(mutasiya.netice.formationInfo.items[0].tutum, 5000);

const canonicalMutasiya = konvoyMutasiyasiniTetbiqEt(
  state,
  "convoy_formation_set_request",
  {
    konvoyId: "konvoy_1",
    siralar
  },
  1700000000001
);

assert.strictEqual(canonicalMutasiya.success, true);
assert.deepStrictEqual(canonicalMutasiya.netice.formation, unityFormasiya);

console.log("konvoy_unity_contract_testi: OK");
