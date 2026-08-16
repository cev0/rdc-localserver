"use strict";

const assert = require("assert");
const {
  merheleliDoyusuHesabla,
  qarsiZerbeHesabla
} = require("./doyus_merheleli_resolver");

(function qalibiyyetHeddiDeyismir() {
  const formation = [
    { siraId: "sira_1", unitId: "warrior_t1", count: 50 },
    { siraId: "sira_2", unitId: "shooter_t1", count: 30 },
    { siraId: "sira_3", unitId: "vehicle_t1", count: 20 }
  ];

  const result = merheleliDoyusuHesabla(formation, 100, 100);
  assert.strictEqual(result.version, 2);
  assert.strictEqual(result.resolverId, "staged_front_to_back_exchange_v2");
  assert.strictEqual(result.mode, "three_row_staged");
  assert.strictEqual(result.balanceRule, "victory_threshold_unchanged");
  assert.strictEqual(result.playerPower, 100);
  assert.strictEqual(result.victory, true);
})();

(function siralarOnDenArxayaIsleyirVeQarsiZerbeAlir() {
  const result = merheleliDoyusuHesabla([
    { siraId: "sira_3", unitId: "vehicle_t1", count: 40 },
    { siraId: "sira_1", unitId: "warrior_t1", count: 30 },
    { siraId: "sira_2", unitId: "shooter_t1", count: 30 }
  ], 70, 100);

  assert.deepStrictEqual(result.frontlineSequence, ["sira_1", "sira_2", "sira_3"]);
  assert.strictEqual(result.decisiveRowId, "sira_3");
  assert.strictEqual(result.engagements[0].enemyPowerBefore, 70);
  assert.strictEqual(result.engagements[0].enemyPowerAfter, 40);
  assert.strictEqual(result.engagements[0].enemyCounterPressure, 30);
  assert.strictEqual(result.engagements[0].counterPressureRatio, 1);
  assert.strictEqual(result.engagements[0].estimatedRemainingCount, 0);
  assert.strictEqual(result.engagements[0].frontlineDepleted, true);
  assert.strictEqual(result.engagements[1].enemyPowerAfter, 10);
  assert.strictEqual(result.engagements[2].enemyPowerAfter, 0);
})();

(function gucluOnSiraDahaAzQarsiTezyiqPayiAlir() {
  const exchange = qarsiZerbeHesabla({ count: 100, battlePower: 200 }, 50);
  assert.strictEqual(exchange.enemyCounterPressure, 50);
  assert.strictEqual(exchange.pressureRatio, 0.25);
  assert.strictEqual(exchange.estimatedRemainingCount, 75);
  assert.strictEqual(exchange.estimatedLostCount, 25);
  assert.strictEqual(exchange.frontlineDepleted, false);
})();

(function erkendenQelebeOlarsaArxaSiraDoyuseGirmir() {
  const result = merheleliDoyusuHesabla([
    { siraId: "sira_1", unitId: "warrior_t10", count: 10 },
    { siraId: "sira_2", unitId: "shooter_t10", count: 10 },
    { siraId: "sira_3", unitId: "vehicle_t10", count: 10 }
  ], 50, 234);

  assert.strictEqual(result.victory, true);
  assert.strictEqual(result.decisiveRowId, "sira_1");
  assert.deepStrictEqual(result.frontlineSequence, ["sira_1"]);
  assert.ok(result.engagements[0].estimatedRemainingCount > 0);
})();

(function meglubiyyetdeButunSiralarIsleyir() {
  const result = merheleliDoyusuHesabla([
    { siraId: "sira_1", unitId: "warrior_t1", count: 10 },
    { siraId: "sira_2", unitId: "shooter_t1", count: 10 },
    { siraId: "sira_3", unitId: "vehicle_t1", count: 10 }
  ], 100, 30);

  assert.strictEqual(result.victory, false);
  assert.deepStrictEqual(result.frontlineSequence, ["sira_1", "sira_2", "sira_3"]);
  assert.strictEqual(result.decisiveRowId, "");
  assert.strictEqual(result.enemyPowerRemaining, 70);
  assert.ok(result.engagements.every(x => x.frontlineDepleted === true));
})();

(function legacyBosFormasiyaFallbackEdilir() {
  const result = merheleliDoyusuHesabla([], 80, 90);
  assert.strictEqual(result.mode, "aggregate_fallback");
  assert.strictEqual(result.damageExchangeMode, "aggregate_no_row_exchange");
  assert.strictEqual(result.victory, true);
  assert.strictEqual(result.playerPower, 90);
})();

console.log("Mərhələli döyüş və qarşılıqlı zərər testləri: OK");
