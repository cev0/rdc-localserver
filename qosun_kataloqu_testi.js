"use strict";

const assert = require("assert");
const {
  UNITS,
  BUILDING_LEVEL_BY_TIER,
  BASE_TRAINING_SECONDS_BY_TIER,
  qosunMelumatiniAl,
  qosunKilidiniYoxla,
  telimXerciniHesabla,
  telimMuddetiniHesabla,
  kataloquClientUcunHazirla
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
    1: 20, 2: 25, 3: 33, 4: 44, 5: 58,
    6: 75, 7: 95, 8: 118, 9: 144, 10: 173
  });

  for (const classId of ["warrior", "shooter", "vehicle"]) {
    const units = UNITS.filter(x => x.classId === classId);
    assert.strictEqual(units.length, 10, `${classId} üçün 10 tier olmalıdır`);
    for (let tier = 1; tier <= 10; tier++) {
      const unit = qosunMelumatiniAl(`${classId}_t${tier}`);
      assert.ok(unit, `${classId}_t${tier} kataloqda olmalıdır`);
      assert.strictEqual(unit.tier, tier);
      const expectedPrefix = classId === "warrior" ? "1070" : classId === "vehicle" ? "1071" : "1072";
      assert.strictEqual(unit.lastShelterArmyFamily, expectedPrefix);
      assert.strictEqual(unit.lastShelterArmyId, `${expectedPrefix}${String(tier - 1).padStart(2, "0")}`);
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

  const clientCatalog = kataloquClientUcunHazirla();
  assert.strictEqual(clientCatalog.length, 30);
  assert.strictEqual(clientCatalog[0].unitId, "warrior_t1");
  assert.strictEqual(clientCatalog[0].lastShelterArmyId, "107000");
  assert.strictEqual(clientCatalog[10].lastShelterArmyId, "107200");
  assert.strictEqual(clientCatalog[20].lastShelterArmyId, "107100");
  assert.ok(clientCatalog[0].stats.consumption);

  const warrior1 = qosunMelumatiniAl("warrior_t1");
  assert.strictEqual(warrior1.displayNameAz, "Əsgər");
  assert.deepStrictEqual(warrior1.costPerUnit, [{ type: "food", amount: 61 }]);
  assert.strictEqual(warrior1.stats.attackSpeed, 6);
  assert.strictEqual(warrior1.stats.defense, 14);
  assert.strictEqual(warrior1.stats.hp, 8);
  assert.strictEqual(warrior1.stats.marchSpeed, 8);
  assert.strictEqual(warrior1.stats.loadCapacity, 8);
  assert.strictEqual(warrior1.stats.consumption.resourceId, "food");
  assert.strictEqual(warrior1.stats.consumption.amount, 0.2083333283662796);

  const shooter2 = qosunMelumatiniAl("shooter_t2");
  assert.strictEqual(shooter2.stats.attackSpeed, 11);
  assert.strictEqual(shooter2.stats.defense, 8);
  assert.strictEqual(shooter2.stats.hp, 3);

  const vehicle2 = qosunMelumatiniAl("vehicle_t2");
  assert.strictEqual(vehicle2.stats.attackSpeed, 15);
  assert.strictEqual(vehicle2.stats.defense, 11);
  assert.strictEqual(vehicle2.stats.hp, 4);
  assert.strictEqual(vehicle2.stats.marchSpeed, 16.100000381469727);
  assert.strictEqual(vehicle2.stats.loadCapacity, 6);
  assert.strictEqual(vehicle2.stats.consumption.resourceId, "food");


  assert.deepStrictEqual(
    qosunMelumatiniAl("warrior_t6").costPerUnit,
    [
      { type: "food", amount: 245 },
      { type: "iron", amount: 18 }
    ]
  );

  assert.deepStrictEqual(
    qosunMelumatiniAl("warrior_t10").costPerUnit,
    [
      { type: "food", amount: 323 },
      { type: "stone", amount: 9 },
      { type: "iron", amount: 39 }
    ]
  );

  assert.deepStrictEqual(
    qosunMelumatiniAl("vehicle_t1").costPerUnit,
    [
      { type: "food", amount: 57 }
    ]
  );

  const shooter10 = qosunMelumatiniAl("shooter_t10");
  assert.strictEqual(shooter10.stats.attackSpeed, 65);
  assert.strictEqual(shooter10.stats.defense, 49);
  assert.strictEqual(shooter10.stats.hp, 15);
  assert.strictEqual(shooter10.stats.marchSpeed, 8);
  assert.strictEqual(shooter10.stats.loadCapacity, 12);

  assert.strictEqual(qosunKilidiniYoxla({}, bina("fighter_camp", 4), "warrior_t3").success, false);
  assert.strictEqual(qosunKilidiniYoxla({}, bina("fighter_camp", 5), "warrior_t3").success, true);

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

  const wrongTechState = { technology: { levels: { unlock_vehicle_t10: 1 } } };
  assert.strictEqual(
    qosunKilidiniYoxla(wrongTechState, bina("fighter_camp", 25), "warrior_t10").success,
    false
  );

  const costState = { technology: { stats: { trainingCostReductionPct: 10 } } };
  const cost = telimXerciniHesabla(costState, "warrior_t2", 10);
  assert.deepStrictEqual(cost.baseCost, [
    { type: "food", amount: 1000 }
  ]);
  assert.deepStrictEqual(cost.finalCost, [
    { type: "food", amount: 900 }
  ]);

  const classCostState = { technology: { stats: { shooterTrainingCostReductionPct: 20 } } };
  const shooterCost = telimXerciniHesabla(classCostState, "shooter_t2", 10);
  assert.strictEqual(shooterCost.reductionPct, 20);
  assert.deepStrictEqual(shooterCost.finalCost, [
    { type: "food", amount: 720 },
    { type: "wood", amount: 80 }
  ]);

  const timeState = { technology: { stats: { trainingSpeedPct: 20 } } };
  const duration = telimMuddetiniHesabla(timeState, "vehicle_t1", 100);
  assert.strictEqual(duration.baseDurationMs, 2000000);
  assert.strictEqual(duration.finalDurationMs, 1666667);

  console.log("[QOSUN_KATALOQU_TESTI] OK");
})();
