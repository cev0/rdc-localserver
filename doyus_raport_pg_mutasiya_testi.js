"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  doyusRaportMutasiyasiniTetbiqEt
} = require("./doyus_raport_handler");

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function raportHazirla(overrides = null) {
  return {
    reportVersion: 3,
    reportId: "battle_1",
    category: "battle",
    battleType: "pve",
    victory: true,
    invalidated: false,
    reward: {
      food: 20
    },
    resourceRewardClaimed: false,
    resourceRewardClaimPending: true,
    resourceRewardAvailableAtMs: 0,
    resourceRewardClaimedAtMs: 0,
    resourceRewardsClaimed: [],
    resourceRewardLastError: "",
    lootAlreadyApplied: false,
    createdAtMs: 1000,
    isRead: false,
    isSaved: false,
    readAtMs: 0,
    savedAtMs: 0,
    heroExp: 0,
    heroExpDistributionPending: false,
    casualtySummary: {},
    lossCalculationPending: false,
    hospitalResolutionPending: false,
    lightWoundedRecoveryPending: false,
    ...((overrides && typeof overrides === "object") ? overrides : {})
  };
}

function stateHazirla(report = null) {
  return {
    playerId: "oyuncu_a",
    resources: {
      food: 10
    },
    resourceCaps: {
      food: 100
    },
    doyusRaportlari: {
      version: 3,
      items: [report || raportHazirla()]
    },
    konvoyEmeliyyatlari: {
      activeByConvoy: {}
    }
  };
}

(function markReadSuccessTesti() {
  const state = stateHazirla();

  const netice = doyusRaportMutasiyasiniTetbiqEt(
    state,
    "battle_report_mark_read_request",
    { reportId: "BATTLE_1" },
    5000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, true);
  assert.strictEqual(state.doyusRaportlari.items[0].isRead, true);
  assert.strictEqual(state.doyusRaportlari.items[0].readAtMs, 5000);
})();

(function saveAndDeleteTesti() {
  const state = stateHazirla(
    raportHazirla({
      resourceRewardClaimed: true,
      resourceRewardClaimPending: false,
      lootAlreadyApplied: true
    })
  );

  const saxla = doyusRaportMutasiyasiniTetbiqEt(
    state,
    "battle_report_save_request",
    { reportId: "battle_1", isSaved: true },
    6000
  );

  assert.strictEqual(saxla.success, true);
  assert.strictEqual(saxla.deyisdi, true);
  assert.strictEqual(state.doyusRaportlari.items[0].isSaved, true);
  assert.strictEqual(state.doyusRaportlari.items[0].savedAtMs, 6000);

  const sil = doyusRaportMutasiyasiniTetbiqEt(
    state,
    "battle_report_delete_request",
    { reportId: "battle_1" },
    7000
  );

  assert.strictEqual(sil.success, true);
  assert.strictEqual(sil.deyisdi, true);
  assert.strictEqual(state.doyusRaportlari.items.length, 0);
})();

(function rewardClaimSuccessTesti() {
  const state = stateHazirla();

  const netice = doyusRaportMutasiyasiniTetbiqEt(
    state,
    "battle_report_claim_reward_request",
    { reportId: "battle_1" },
    8000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, true);
  assert.strictEqual(state.resources.food, 30);
  assert.strictEqual(state.doyusRaportlari.items[0].resourceRewardClaimed, true);
  assert.strictEqual(state.doyusRaportlari.items[0].resourceRewardClaimPending, false);
  assert.strictEqual(state.doyusRaportlari.items[0].lootAlreadyApplied, true);
})();

(function rewardCapacityFailureRollbackTesti() {
  const state = stateHazirla();
  state.resources.food = 90;
  state.resourceCaps.food = 100;
  const evvelki = kopyala(state);

  const netice = doyusRaportMutasiyasiniTetbiqEt(
    state,
    "battle_report_claim_reward_request",
    { reportId: "battle_1" },
    8000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.ok(netice.message.includes("anbarda"));
  assert.deepStrictEqual(
    state,
    evvelki,
    "Capacity failure report/resources state-ni dəyişməməlidir."
  );
})();

(function pendingRewardDeleteFailureRollbackTesti() {
  const state = stateHazirla();
  const evvelki = kopyala(state);

  const netice = doyusRaportMutasiyasiniTetbiqEt(
    state,
    "battle_report_delete_request",
    { reportId: "battle_1" },
    9000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.ok(netice.message.includes("Alınmamış"));
  assert.deepStrictEqual(state, evvelki);
})();

(function absentStateFailureExactRollbackTesti() {
  const state = {
    playerId: "oyuncu_a"
  };
  const evvelki = kopyala(state);

  const netice = doyusRaportMutasiyasiniTetbiqEt(
    state,
    "battle_report_mark_read_request",
    { reportId: "olmayan_report" },
    10000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.deepStrictEqual(state, evvelki);
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "doyusRaportlari"),
    false
  );
})();

(function sourceInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "doyus_raport_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Battle report mutation-ları PostgreSQL player lock istifadə etməlidir."
  );
  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Battle report handler köhnə full-state save yolunu istifadə etməməlidir."
  );
  assert.ok(
    kod.includes("readStateKopyasi(state)"),
    "Battle report read-ləri authoritative state əvəzinə clone istifadə etməlidir."
  );
  assert.ok(
    kod.includes('type === "battle_report_reward_preview_request"'),
    "Reward preview read contract saxlanmalıdır."
  );
})();

console.log("[DOYUS_RAPORT_PG_MUTASIYA_TEST] OK");
