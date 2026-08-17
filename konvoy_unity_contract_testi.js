"use strict";

const assert = require("assert");

const {
  unityFormasiyasiniSiralarArrayinaCevir,
  siralarArrayiniUnityFormasiyasinaCevir,
  formationInfoUnityUcunUyğunlaşdır,
  konvoyMutasiyasiniTetbiqEt
} = require("./konvoy_handler");

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

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

(function legacyTroopRequestFormasiyaniSinxronlayirTesti() {
  const legacyState = {
    technology: { levels: {} },
    buildings: [
      {
        instanceId: "legacy_barrack_1",
        buildingId: "barrack_1",
        level: 1,
        isCompleted: true
      }
    ],
    heroes: [],
    army: {
      troops: {
        fighter_lv1: 1000
      }
    },
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          qehremanIdleri: [],
          qosunlar: {},
          formasiya: { version: 2, siralar: [] }
        }
      ]
    }
  };

  const netice = konvoyMutasiyasiniTetbiqEt(
    legacyState,
    "convoy_troops_set_request",
    {
      konvoyId: "konvoy_1",
      troops: { fighter_lv1: 1000 }
    },
    1700000000100
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.netice.legacyFormationSynced, true);
  assert.strictEqual(netice.netice.tutum, 1200);
  assert.strictEqual(netice.netice.siraTutumu, 400);
  assert.strictEqual(netice.netice.istifadeOlunanTutum, 1000);
  assert.deepStrictEqual(netice.netice.qosunlar, { fighter_lv1: 1000 });
  assert.deepStrictEqual(
    netice.netice.siralar.map(x => x.count),
    [400, 400, 200]
  );
  assert.deepStrictEqual(
    legacyState.konvoylar.items[0].formasiya.siralar.map(x => x.count),
    [400, 400, 200]
  );
  assert.ok(netice.netice.info);
  assert.ok(netice.netice.formationInfo);
})();

(function legacyTroopRequestUcSirayaSigmayanKompozisiyaniBloklayirTesti() {
  const legacyState = {
    technology: { levels: {} },
    buildings: [
      {
        instanceId: "legacy_barrack_1",
        buildingId: "barrack_1",
        level: 1,
        isCompleted: true
      }
    ],
    heroes: [],
    army: {
      troops: {
        fighter_lv1: 500,
        shooter_lv1: 700
      }
    },
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          qehremanIdleri: [],
          qosunlar: { fighter_lv1: 30 },
          formasiya: {
            version: 2,
            siralar: [
              { siraId: "sira_1", unitId: "fighter_lv1", count: 30 },
              { siraId: "sira_2", unitId: "", count: 0 },
              { siraId: "sira_3", unitId: "", count: 0 }
            ]
          }
        }
      ]
    }
  };

  const evvelki = kopyala(legacyState.konvoylar);
  const netice = konvoyMutasiyasiniTetbiqEt(
    legacyState,
    "convoy_troops_set_request",
    {
      konvoyId: "konvoy_1",
      troops: {
        fighter_lv1: 500,
        shooter_lv1: 700
      }
    },
    1700000000200
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.legacyFormationSyncRequired, true);
  assert.deepStrictEqual(legacyState.konvoylar, evvelki);
})();

console.log("konvoy_unity_contract_testi: OK");
