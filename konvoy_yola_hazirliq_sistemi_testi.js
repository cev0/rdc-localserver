"use strict";

const assert = require("assert");
const {
  konvoyYolaHazirliginiYoxla
} = require("./konvoy_yola_hazirliq_sistemi");
const {
  formasiyaQosunlariniTopla
} = require("./konvoy_formasiya_sistemi");

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    technology: { levels: {} },
    buildings: [
      {
        instanceId: "kamp_1",
        buildingId: "barrack_1",
        level: 1,
        isCompleted: true
      }
    ],
    army: {
      troops: {
        fighter_lv1: 1200,
        shooter_lv1: 1200
      }
    },
    heroes: [
      { heroId: "doyuscu" }
    ],
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          qehremanIdleri: ["doyuscu"],
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
}

(function validEnemyDispatchTesti() {
  const state = stateHazirla();
  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "enemy");
  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.ready, true);
  assert.strictEqual(netice.tutum, 1200);
  assert.strictEqual(netice.siraTutumu, 400);
  assert.strictEqual(netice.troopCount, 30);
  assert.deepStrictEqual(netice.heroIds, ["doyuscu"]);
})();

(function bagliKonvoyBloklanirTesti() {
  const state = stateHazirla();
  state.konvoylar.items.push({
    konvoyId: "konvoy_2",
    qehremanIdleri: [],
    qosunlar: { fighter_lv1: 10 }
  });
  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_2", "resource");
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.code, "convoy_not_open");
})();

(function bosQosunBloklanirTesti() {
  const state = stateHazirla();
  state.konvoylar.items[0].qosunlar = {};
  state.konvoylar.items[0].formasiya.siralar = [];
  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.code, "convoy_has_no_troops");
})();

(function siraTutumuBloklanirTesti() {
  const state = stateHazirla();
  state.konvoylar.items[0].qosunlar = { fighter_lv1: 401 };
  state.konvoylar.items[0].formasiya.siralar = [
    { siraId: "sira_1", unitId: "fighter_lv1", count: 401 }
  ];
  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.code, "formation_row_capacity_exceeded");
  assert.strictEqual(netice.siraTutumu, 400);
})();

(function formasiyaQosunMismatchBloklanirTesti() {
  const state = stateHazirla();
  state.konvoylar.items[0].formasiya.siralar = [
    { siraId: "sira_1", unitId: "shooter_lv1", count: 30 }
  ];
  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.code, "formation_troop_mismatch");
})();

(function realOrduYoxlamasiTesti() {
  const state = stateHazirla();
  state.army.troops.fighter_lv1 = 20;
  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.code, "troop_reservation_or_capacity_invalid");
})();

(function enemyHeroTelebiDispatchdaTesti() {
  const state = stateHazirla();
  state.heroes = [];
  state.konvoylar.items[0].qehremanIdleri = [];

  const enemy = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "enemy");
  assert.strictEqual(enemy.success, false);
  assert.strictEqual(enemy.code, "enemy_convoy_has_no_combat_hero");

  const resource = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(resource.success, true);
})();

(function legacyBirUnitUcSiraMigrationTesti() {
  const state = stateHazirla();
  state.konvoylar.items[0].qosunlar = { fighter_lv1: 1000 };
  delete state.konvoylar.items[0].formasiya;

  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(netice.success, true);
  assert.deepStrictEqual(
    state.konvoylar.items[0].formasiya.siralar.map(x => x.count),
    [400, 400, 200]
  );
  assert.deepStrictEqual(
    formasiyaQosunlariniTopla(state.konvoylar.items[0].formasiya.siralar),
    { fighter_lv1: 1000 }
  );
})();

(function legacyUcSirayaSigmayanKompozisiyaBloklanirTesti() {
  const state = stateHazirla();
  state.konvoylar.items[0].qosunlar = {
    fighter_lv1: 500,
    shooter_lv1: 700
  };
  delete state.konvoylar.items[0].formasiya;

  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.code, "formation_troop_mismatch");
})();

(function legacy5000FallbackTamIstifadeOlunaBilirTesti() {
  const state = stateHazirla();
  state.buildings = [];
  state.army.troops.fighter_lv1 = 5000;
  state.konvoylar.items[0].qosunlar = { fighter_lv1: 5000 };
  delete state.konvoylar.items[0].formasiya;

  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.tutum, 5000);
  assert.strictEqual(netice.siraTutumu, 1667);
  assert.deepStrictEqual(
    state.konvoylar.items[0].formasiya.siralar.map(x => x.count),
    [1667, 1667, 1666]
  );
})();

(function legacyFallbackUmumiTutumAsimiBloklanirTesti() {
  const state = stateHazirla();
  state.buildings = [];
  state.army.troops.fighter_lv1 = 5001;
  state.konvoylar.items[0].qosunlar = { fighter_lv1: 5001 };
  state.konvoylar.items[0].formasiya = {
    version: 2,
    siralar: [
      { siraId: "sira_1", unitId: "fighter_lv1", count: 1667 },
      { siraId: "sira_2", unitId: "fighter_lv1", count: 1667 },
      { siraId: "sira_3", unitId: "fighter_lv1", count: 1667 }
    ]
  };

  const netice = konvoyYolaHazirliginiYoxla(state, "konvoy_1", "resource");
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.code, "troop_reservation_or_capacity_invalid");
})();

console.log("[KONVOY_YOLA_HAZIRLIQ_TEST] OK");
