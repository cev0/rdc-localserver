"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  konvoyMutasiyasiniTetbiqEt
} = require("./konvoy_handler");

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    army: {
      troops: {
        fighter_lv1: 100,
        shooter_lv1: 80,
        vehicle_lv1: 20
      }
    },
    heroes: [],
    technology: {
      levels: {}
    }
  };
}

(function troopMutationTesti() {
  const state = stateHazirla();

  const netice = konvoyMutasiyasiniTetbiqEt(
    state,
    "convoy_troops_set_request",
    {
      konvoyId: "KONVOY_1",
      troops: {
        fighter_lv1: 25,
        shooter_lv1: 15
      }
    },
    1000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, true);
  assert.ok(netice.netice);
  assert.deepStrictEqual(
    netice.netice.qosunlar,
    {
      fighter_lv1: 25,
      shooter_lv1: 15
    }
  );

  const konvoy = state.konvoylar.items.find(x => x.konvoyId === "konvoy_1");
  assert.ok(konvoy);
  assert.deepStrictEqual(
    konvoy.qosunlar,
    {
      fighter_lv1: 25,
      shooter_lv1: 15
    }
  );
})();

(function formasiyaMutationTesti() {
  const state = stateHazirla();

  const netice = konvoyMutasiyasiniTetbiqEt(
    state,
    "convoy_formation_set_request",
    {
      konvoyId: "konvoy_1",
      siralar: [
        {
          siraId: "sira_1",
          unitId: "fighter_lv1",
          count: 20
        },
        {
          siraId: "sira_2",
          unitId: "shooter_lv1",
          count: 10
        },
        {
          siraId: "sira_3",
          unitId: "",
          count: 0
        }
      ]
    },
    1000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, true);
  assert.ok(netice.netice);
  assert.strictEqual(netice.netice.konvoyId, "konvoy_1");

  const konvoy = state.konvoylar.items.find(x => x.konvoyId === "konvoy_1");
  assert.ok(konvoy);
  assert.deepStrictEqual(
    konvoy.formasiya.siralar,
    [
      {
        siraId: "sira_1",
        unitId: "fighter_lv1",
        count: 20
      },
      {
        siraId: "sira_2",
        unitId: "shooter_lv1",
        count: 10
      },
      {
        siraId: "sira_3",
        unitId: "",
        count: 0
      }
    ]
  );
})();

(function failedMutationRollbackTesti() {
  const state = stateHazirla();
  const evvelki = JSON.parse(JSON.stringify(state));

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "konvoylar"),
    false
  );

  const netice = konvoyMutasiyasiniTetbiqEt(
    state,
    "convoy_troops_set_request",
    {
      konvoyId: "konvoy_1",
      troops: {
        fighter_lv1: 999999
      }
    },
    1000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.deepStrictEqual(state, evvelki);
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "konvoylar"),
    false,
    "Uğursuz mutation default konvoy state-ni RAM-da saxlamamalıdır."
  );
})();

(function busyKonvoyTesti() {
  const state = stateHazirla();
  state.konvoyEmeliyyatlari = {
    version: 3,
    activeByConvoy: {
      konvoy_1: {
        convoyId: "konvoy_1",
        status: "marching_to_player_base"
      }
    },
    history: []
  };

  const evvelki = JSON.parse(JSON.stringify(state));

  const netice = konvoyMutasiyasiniTetbiqEt(
    state,
    "convoy_troops_set_request",
    {
      konvoyId: "konvoy_1",
      troops: {
        fighter_lv1: 10
      }
    },
    1000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(netice.busyReason, "marching_to_player_base");
  assert.deepStrictEqual(state, evvelki);
})();

(function namelumMesajTesti() {
  const state = stateHazirla();
  const evvelki = JSON.parse(JSON.stringify(state));

  const netice = konvoyMutasiyasiniTetbiqEt(
    state,
    "convoy_unknown_request",
    {
      konvoyId: "konvoy_1"
    },
    1000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.deepStrictEqual(state, evvelki);
})();

(function handlerInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "konvoy_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Konvoy handler PostgreSQL player mutation helper-i istifadə etməlidir."
  );

  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Konvoy mutation handler köhnə ayrıca snapshot-save yolunu istifadə etməməlidir."
  );
})();

console.log("[KONVOY_PG_MUTASIYA_TEST] OK");
