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

  assert.strictEqual(savasci.version, 3);
  assert.strictEqual(nisanci.version, 3);
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

(function unitDayaniqliliqRiskiQorunur() {
  assert.ok(siraRiskModifieriniHesabla("warrior_t1") < siraRiskModifieriniHesabla("shooter_t1"));
})();

(function onSiraDahaCoxEkspozisiyaAlir() {
  const result = itkiPlaniniHazirla([
    { siraId: "sira_1", unitId: "warrior_t3", count: 100 },
    { siraId: "sira_2", unitId: "warrior_t3", count: 100 },
    { siraId: "sira_3", unitId: "warrior_t3", count: 100 }
  ], 570, 570, true);

  const front = result.siralar.find(x => x.siraId === "sira_1");
  const middle = result.siralar.find(x => x.siraId === "sira_2");
  const rear = result.siralar.find(x => x.siraId === "sira_3");

  assert.ok(front.itki > middle.itki);
  assert.ok(middle.itki > rear.itki);
  assert.strictEqual(front.initialExposure, 1);
  assert.strictEqual(middle.initialExposure, 0.65);
  assert.strictEqual(rear.initialExposure, 0.4);
})();

(function qabaqdakiSiraBosalandaNovbetiOnXetteKecir() {
  const result = itkiPlaniniHazirla([
    { siraId: "sira_1", unitId: "warrior_t1", count: 2 },
    { siraId: "sira_2", unitId: "warrior_t1", count: 50 },
    { siraId: "sira_3", unitId: "warrior_t1", count: 50 }
  ], 10, 1000, false);

  const sequence = result.formationResolution.frontlineSequence.map(x => x.siraId);
  const middle = result.siralar.find(x => x.siraId === "sira_2");

  assert.strictEqual(sequence[0], "sira_1");
  assert.ok(sequence.includes("sira_2"));
  assert.strictEqual(middle.becameFrontline, true);
  assert.strictEqual(middle.maxExposure, 1);
})();

(function sinifRoluMelumatdirBonusDeyil() {
  const result = itkiPlaniniHazirla([
    { siraId: "sira_1", unitId: "warrior_t1", count: 10 },
    { siraId: "sira_2", unitId: "shooter_t1", count: 10 },
    { siraId: "sira_3", unitId: "vehicle_t1", count: 10 }
  ], 30, 30, true);

  assert.strictEqual(result.formulaBreakdown.classRoleBonusEnabled, false);
  assert.strictEqual(result.formulaBreakdown.classRolePenaltyEnabled, false);
  assert.strictEqual(result.siralar.find(x => x.siraId === "sira_1").classRoleId, "frontline_infantry");
  assert.strictEqual(result.siralar.find(x => x.siraId === "sira_2").classRoleId, "ranged_support");
  assert.strictEqual(result.siralar.find(x => x.siraId === "sira_3").classRoleId, "armored_assault");
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

console.log("Doyus itki/formasiya stat v3 testleri: OK");
