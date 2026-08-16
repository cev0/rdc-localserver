"use strict";

const assert = require("assert");
const {
  UNITS,
  BUILDING_LEVEL_BY_TIER,
  BASE_TRAINING_SECONDS_BY_TIER,
  qosunMelumatiniAl,
  qosunKilidiniYoxla,
  telimXerciniHesabla,
  telimMuddetiniHesabla
} = require("./qosun_kataloqu");

function bina(buildingId, level) {
  return {
    instanceId: `${buildingId}_test`,
    buildingId,
    level,
    isCompleted: true
  };
}

(function run() {
  assert.strictEqual(UNITS.length, 30, "3 sinif x 10 tier = 30 qoşun olmalıdır");
  assert.strictEqual(new Set(UNITS.map(x => x.unitId)).size, 30, "Bütün unitId-lər unikal olmalıdır");

  assert.deepStrictEqual(BUILDING_LEVEL_BY_TIER, {
    1: 1, 2: 2, 3: 5, 4: 10, 5: 13,
    6: 16, 7: 19, 8: 22, 9: 25, 10: 25
  });

  assert.deepStrictEqual(BASE_TRAINING_SECONDS_BY_TIER, {
    1: 5, 2: 6, 3: 8, 4: 10, 5: 13,
    6: 16, 7: 20, 8: 25, 9: 31, 10: 38
  });

  for (const classId of ["warrior", "shooter", "vehicle"]) {
    const units = UNITS.filter(x => x.classId === classId);
    assert.strictEqual(units.length, 10, `${classId} üçün 10 tier olmalıdır`);
    for (let tier = 1; tier <= 10; tier++) {
      const unit = qosunMelumatiniAl(`${classId}_t${tier}`);
      assert.ok(unit, `${classId}_t${tier} kataloqda olmalıdır`);
      assert.strictEqual(unit.tier, tier);
      assert.strictEqual(unit.requiredBuildingLevel, BUILDING_LEVEL_BY_TIER[tier]);
      assert.strictEqual(unit.baseTrainingSeconds, BASE_TRAINING_SECONDS_BY_TIER[tier]);
      assert.ok(unit.stats.battlePower > 0);
      assert.ok(unit.stats.defense > 0);
      assert.ok(unit.stats.hp > 0);
      assert.ok(unit.stats.marchSpeed > 0);
      assert.ok(unit.stats.loadCapacity > 0);
      assert.ok(unit.costPerUnit.length > 0);
    }
  }

  const warrior1 = qosunMelumatiniAl("warrior_t1");
  assert.strictEqual(warrior1.displayNameAz, "Əsgər");
  assert.deepStrictEqual(warrior1.costPerUnit, [{ type: "food", amount: 14 }]);

  const shooter2 = qosunMelumatiniAl("shooter_t2");
  assert.deepStrictEqual(shooter2.costPerUnit, [
    { type: "food", amount: 32 },
    { type: "iron", amount: 11 }
  ]);

  const vehicle2 = qosunMelumatiniAl("vehicle_t2");
  assert.deepStrictEqual(vehicle2.costPerUnit, [
    { type: "fuel", amount: 23 },
    { type: "iron", amount: 12 }
  ]);

  assert.strictEqual(
    qosunKilidiniYoxla({}, bina("fighter_camp", 4), "warrior_t3").success,
    false
  );
  assert.strictEqual(
    qosunKilidiniYoxla({}, bina("fighter_camp", 5), "warrior_t3").success,
    true
  );

  for (const [classId, buildingId] of [
    ["warrior", "fighter_camp"],
    ["shooter", "shooter_camp"],
    ["vehicle", "vehicle_factory"]
  ]) {
    const t9 = `${classId}_t9`;
    const t10 = `${classId}_t10`;
    const t9Tech = `unlock_${classId}_t9`;
    const t10Tech = `unlock_${classId}_t10`;

    assert.strictEqual(qosunMelumatiniAl(t9).requiredResearchId, t9Tech);
    assert.strictEqual(qosunMelumatiniAl(t10).requiredResearchId, t10Tech);
    assert.strictEqual(qosunKilidiniYoxla({}, bina(buildingId, 25), t9).success, false);
    assert.strictEqual(qosunKilidiniYoxla({}, bina(buildingId, 25), t10).success, false);

    const state9 = { technology: { levels: { [t9Tech]: 1 } } };
    assert.strictEqual(qosunKilidiniYoxla(state9, bina(buildingId, 25), t9).success, true);
    assert.strictEqual(qosunKilidiniYoxla(state9, bina(buildingId, 25), t10).success, false);

    const state10 = { technology: { levels: { [t10Tech]: 1 } } };
    assert.strictEqual(qosunKilidiniYoxla(state10, bina(buildingId, 25), t10).success, true);
  }

  const wrongTechState = {
    technology: { levels: { unlock_vehicle_t10: 1 } }
  };
  assert.strictEqual(
    qosunKilidiniYoxla(wrongTechState, bina("fighter_camp", 25), "warrior_t10").success,
    false
  );

  const costState = {
    technology: { stats: { trainingCostReductionPct: 10 } }
  };
  const cost = telimXerciniHesabla(costState, "warrior_t2", 10);
  assert.deepStrictEqual(cost.baseCost, [
    { type: "food", amount: 350 },
    { type: "wood", amount: 80 }
  ]);
  assert.deepStrictEqual(cost.finalCost, [
    { type: "food", amount: 315 },
    { type: "wood", amount: 72 }
  ]);

  const classCostState = {
    technology: { stats: { shooterTrainingCostReductionPct: 20 } }
  };
  const shooterCost = telimXerciniHesabla(classCostState, "shooter_t2", 10);
  assert.strictEqual(shooterCost.reductionPct, 20);
  assert.deepStrictEqual(shooterCost.finalCost, [
    { type: "food", amount: 256 },
    { type: "iron", amount: 88 }
  ]);

  const timeState = {
    technology: { stats: { trainingSpeedPct: 20 } }
  };
  const duration = telimMuddetiniHesabla(timeState, "vehicle_t1", 100);
  assert.strictEqual(duration.baseDurationMs, 500000);
  assert.strictEqual(duration.finalDurationMs, 416667);

  console.log("[QOSUN_KATALOQU_TESTI] OK");
})();
