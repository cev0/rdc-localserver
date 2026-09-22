"use strict";

const assert = require("assert");
const fs = require("fs");
const { troop107xAl } = require("./last_shelter_troop_107x_reference");
const {
  UNITS,
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
      assert.ok(unit.stats.battlePower > 0);
      assert.ok(unit.stats.defense > 0);
      assert.ok(unit.stats.hp > 0);
      assert.ok(unit.stats.marchSpeed > 0);
      assert.ok(unit.stats.loadCapacity > 0);
      assert.ok(unit.costPerUnit.length > 0);
      assert.strictEqual(unit.lastShelterVerified, true);

      const source = troop107xAl(unit.lastShelterArmyId);
      assert.ok(source, `verified source row missing for ${unit.lastShelterArmyId}`);
      assert.strictEqual(unit.baseTrainingSeconds, source.time);
      assert.strictEqual(unit.stats.attack, source.attack);
      assert.strictEqual(unit.stats.attackSpeed, source.attack);
      assert.strictEqual(unit.stats.defense, source.defen);
      assert.strictEqual(unit.stats.hp, source.health);
      assert.strictEqual(unit.stats.battlePower, source.power);
      assert.strictEqual(unit.stats.marchSpeed, source.speed);
      assert.strictEqual(unit.stats.range, source.range);
      assert.strictEqual(unit.stats.loadCapacity, source.load);
      assert.strictEqual(unit.stats.consumption.amount, source.upkeep);
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

  assert.strictEqual(
    qosunKilidiniYoxla(
      {},
      bina("shooter_camp", 1),
      "warrior_t1"
    ).success,
    false,
    "Training-building class compatibility remains enforced."
  );

  const unlockCases = [
    {
      classId: "warrior",
      buildingId: "fighter_camp",
      t9Science: "973400",
      t10Science: "973700",
      t9BuildingToken: "423025",
      t10BuildingToken: "423030"
    },
    {
      classId: "vehicle",
      buildingId: "vehicle_factory",
      t9Science: "971400",
      t10Science: "971700",
      t9BuildingToken: "424025",
      t10BuildingToken: "424030"
    },
    {
      classId: "shooter",
      buildingId: "shooter_camp",
      t9Science: "975400",
      t10Science: "975700",
      t9BuildingToken: "425025",
      t10BuildingToken: "425030"
    }
  ];

  for (const row of unlockCases) {
    const t9 = `${row.classId}_t9`;
    const t10 = `${row.classId}_t10`;
    const t9Unit = qosunMelumatiniAl(t9);
    const t10Unit = qosunMelumatiniAl(t10);

    assert.strictEqual(
      t9Unit.sourceScienceUnlockId,
      row.t9Science
    );
    assert.strictEqual(
      t10Unit.sourceScienceUnlockId,
      row.t10Science
    );
    assert.strictEqual(
      t9Unit.sourceBuildingUnlock.token,
      row.t9BuildingToken
    );
    assert.strictEqual(
      t10Unit.sourceBuildingUnlock.token,
      row.t10BuildingToken
    );

    const lockedT9 =
      qosunKilidiniYoxla(
        {},
        bina(row.buildingId, 25),
        t9
      );
    assert.strictEqual(
      lockedT9.success,
      false
    );
    assert.strictEqual(
      lockedT9.reason,
      "research_required"
    );
    assert.strictEqual(
      lockedT9.requiredScienceId,
      row.t9Science
    );

    const unlockedT9 =
      qosunKilidiniYoxla(
        {
          science: {
            [row.t9Science]: 1
          }
        },
        bina(row.buildingId, 25),
        t9
      );
    assert.strictEqual(
      unlockedT9.success,
      true,
      "Verified T9 science unlock must open the troop."
    );

    const t10Status =
      qosunKilidiniYoxla(
        {
          science: {
            [row.t10Science]: 1
          }
        },
        bina(row.buildingId, 30),
        t10
      );
    assert.strictEqual(
      t10Status.success,
      false
    );
    assert.strictEqual(
      t10Status.reason,
      "science_unlock_unmigrated"
    );
    assert.strictEqual(
      t10Status.requiredScienceId,
      row.t10Science
    );
  }

  const cost = telimXerciniHesabla({}, "warrior_t2", 10);
  assert.deepStrictEqual(cost.baseCost, [
    { type: "food", amount: 1000 }
  ]);
  assert.deepStrictEqual(cost.finalCost, [
    { type: "food", amount: 1000 }
  ]);
  assert.strictEqual(cost.reductionPct, 0);

  const shooterCost = telimXerciniHesabla({}, "shooter_t2", 10);
  assert.strictEqual(shooterCost.reductionPct, 0);
  assert.deepStrictEqual(shooterCost.finalCost, [
    { type: "food", amount: 900 },
    { type: "wood", amount: 100 }
  ]);

  const duration = telimMuddetiniHesabla({}, "vehicle_t1", 100);
  assert.strictEqual(duration.baseDurationMs, 2000000);
  assert.strictEqual(duration.finalDurationMs, 2000000);
  assert.strictEqual(duration.speedPct, 0);

  const catalogSource =
    fs.readFileSync(
      require.resolve(
        "./qosun_kataloqu.js"
      ),
      "utf8"
    );

  for (const forbidden of [
    "BUILDING_LEVEL_BY_TIER",
    "BASE_TRAINING_SECONDS_BY_TIER",
    "WARRIOR_STATS",
    "SHOOTER_STATS",
    "VEHICLE_STATS",
    "WARRIOR_COSTS",
    "SHOOTER_COSTS",
    "VEHICLE_COSTS",
    "requiredResearchId",
    "state.technology"
  ]) {
    assert.strictEqual(
      catalogSource.includes(
        forbidden
      ),
      false,
      `Synthetic troop authority must stay removed: ${forbidden}`
    );
  }

  console.log("[QOSUN_KATALOQU_TESTI] OK");
})();
