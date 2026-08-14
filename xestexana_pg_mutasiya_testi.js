"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  xestexanaSagaltmaMutasiyasiniTetbiqEt
} = require("./xestexana_handler");

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    xestexana: {
      version: 2,
      yaralilar: {
        fighter_lv1: 10
      },
      sagaltmaTarixcesi: []
    },
    resources: {
      food: 100,
      money: 100
    },
    army: {
      troops: {
        fighter_lv1: 5
      }
    }
  };
}

(function ugurluSagaltmaVeReplayTesti() {
  const state = stateHazirla();
  const birlikler = [
    {
      siraId: "sira_1",
      unitId: "FIGHTER_LV1",
      count: 3
    }
  ];

  const ilk = xestexanaSagaltmaMutasiyasiniTetbiqEt(
    state,
    birlikler,
    "REQ-001",
    1000
  );

  assert.strictEqual(ilk.success, true);
  assert.strictEqual(ilk.deyisdi, true);
  assert.strictEqual(ilk.requestId, "req-001");
  assert.strictEqual(ilk.idempotentReplay, false);
  assert.strictEqual(ilk.result.healedCount, 3);

  assert.strictEqual(state.resources.food, 94);
  assert.strictEqual(state.resources.money, 97);
  assert.strictEqual(state.army.troops.fighter_lv1, 8);
  assert.strictEqual(state.xestexana.yaralilar.fighter_lv1, 7);
  assert.strictEqual(state.xestexana.sagaltmaTarixcesi.length, 1);
  assert.strictEqual(state.serverSorquIdempotentliyi.items.length, 1);

  const ugurludanSonra = JSON.parse(JSON.stringify(state));

  const replay = xestexanaSagaltmaMutasiyasiniTetbiqEt(
    state,
    birlikler,
    "req-001",
    2000
  );

  assert.strictEqual(replay.success, true);
  assert.strictEqual(replay.deyisdi, false);
  assert.strictEqual(replay.idempotentReplay, true);
  assert.strictEqual(replay.result.healedCount, 3);
  assert.deepStrictEqual(
    state,
    ugurludanSonra,
    "Idempotent replay ikinci dəfə resurs çıxmamalı və qoşun artırmamalıdır."
  );
})();

(function requestIdConflictTesti() {
  const state = stateHazirla();

  const ilk = xestexanaSagaltmaMutasiyasiniTetbiqEt(
    state,
    [{ unitId: "fighter_lv1", count: 2 }],
    "req-conflict",
    1000
  );

  assert.strictEqual(ilk.success, true);
  const evvelki = JSON.parse(JSON.stringify(state));

  const conflict = xestexanaSagaltmaMutasiyasiniTetbiqEt(
    state,
    [{ unitId: "fighter_lv1", count: 3 }],
    "req-conflict",
    2000
  );

  assert.strictEqual(conflict.success, false);
  assert.strictEqual(conflict.deyisdi, false);
  assert.strictEqual(conflict.idempotentReplay, false);
  assert.ok(conflict.message.includes("requestId"));
  assert.deepStrictEqual(state, evvelki);
})();

(function ugursuzSagaltmaRollbackTesti() {
  const state = stateHazirla();
  state.resources.food = 0;
  state.resources.money = 0;
  const evvelki = JSON.parse(JSON.stringify(state));

  const netice = xestexanaSagaltmaMutasiyasiniTetbiqEt(
    state,
    [{ unitId: "fighter_lv1", count: 4 }],
    "",
    3000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.ok(netice.preview);
  assert.deepStrictEqual(
    state,
    evvelki,
    "Uğursuz healing army/resources/xestexana state-ni dəyişməməlidir."
  );
})();

(function handlerInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "xestexana_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Xəstəxana handler PostgreSQL player mutation helper-i istifadə etməlidir."
  );

  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Xəstəxana healing köhnə ayrıca snapshot-save yolunu istifadə etməməlidir."
  );

  assert.ok(kod.includes("xestexana_info_request"));
  assert.ok(kod.includes("xestexana_sagaltma_preview_request"));
})();

console.log("[XESTEXANA_PG_MUTASIYA_TEST] OK");
