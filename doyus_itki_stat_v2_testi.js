"use strict";

const assert = require("assert");
const {
  ITKI_POLICY,
  itkiPlaniniHazirla,
  siraRiskModifieriniHesabla
} = require("./doyus_itki_sistemi");

function plan(unitId, count, playerPower, enemyPower, victory, options) {
  return itkiPlaniniHazirla(
    [{ siraId: "sira_1", unitId, count }],
    playerPower,
    enemyPower,
    victory,
    options
  );
}

(function eyniGucdeMudafieHpFerqiIsleyir() {
  const savasci = plan("warrior_t1", 100, 100, 100, true);
  const nisanci = plan("shooter_t1", 100, 100, 100, true);

  assert.strictEqual(savasci.version, 2);
  assert.strictEqual(nisanci.version, 2);
  assert.ok(savasci.formulaBreakdown.totalDefense > nisanci.formulaBreakdown.totalDefense);
  assert.ok(savasci.formulaBreakdown.defenseHpModifier < nisanci.formulaBreakdown.defenseHpModifier);
  assert.ok(savasci.totalLoss < nisanci.totalLoss);
})();

(function gucFerqiItkiniAzaldir() {
  const beraber = plan("shooter_t5", 100, 320, 320, true);
  const dordQat = plan("shooter_t5", 100, 1280, 320, true);

  assert.ok(dordQat.lossPercent < beraber.lossPercent);
  assert.ok(dordQat.totalLoss < beraber.totalLoss);
})();

(function siraRiskiStatlaraGoreBolunur() {
  const planMix = itkiPlaniniHazirla([
    { siraId: "sira_1", unitId: "warrior_t1", count: 100 },
    { siraId: "sira_2", unitId: "shooter_t1", count: 100 }
  ], 200, 200, true);

  const warrior = planMix.siralar.find(x => x.unitId === "warrior_t1");
  const shooter = planMix.siralar.find(x => x.unitId === "shooter_t1");

  assert.ok(siraRiskModifieriniHesabla("warrior_t1") < siraRiskModifieriniHesabla("shooter_t1"));
  assert.ok(shooter.itki >= warrior.itki);
})();

(function normalDoyusYaraliVeOluBolur() {
  const result = plan("warrior_t3", 100, 190, 190, true);
  const row = result.siralar[0];

  assert.strictEqual(row.itki, row.agirYaraliNamized + row.yungulYarali + row.birbasaOlu);
  assert.ok(row.agirYaraliNamized > 0);
  assert.ok(row.birbasaOlu > 0);
})();

(function deathZoneButunItkiniOlumeCevirir() {
  const result = plan(
    "warrior_t3",
    100,
    190,
    190,
    true,
    { policyId: ITKI_POLICY.DEATH_ZONE }
  );
  const row = result.siralar[0];

  assert.strictEqual(result.policyId, "death_zone");
  assert.strictEqual(row.agirYaraliNamized, 0);
  assert.strictEqual(row.yungulYarali, 0);
  assert.strictEqual(row.birbasaOlu, row.itki);
})();

console.log("Doyus itki stat v2 testleri: OK");
