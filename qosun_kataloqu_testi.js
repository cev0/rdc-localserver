"use strict";

const assert = require("assert");
const {
  UNITS,
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

  const warrior1 = qosunMelumatiniAl("warrior_t1");
  assert.ok(warrior1);
  assert.strictEqual(warrior1.displayNameAz, "Əsgər");
  assert.strictEqual(warrior1.requiredBuildingLevel, 1);
  assert.deepStrictEqual(warrior1.costPerUnit, [{ type: "food", amount: 14 }]);
  assert.strictEqual(warrior1.baseTrainingSeconds, 5);

  const shooter2 = qosunMelumatiniAl("shooter_t2");
  assert.ok(shooter2);
  assert.deepStrictEqual(shooter2.costPerUnit, [
    { type: "food", amount: 32 },
    { type: "iron", amount: 11 }
  ]);
  assert.strictEqual(shooter2.baseTrainingSeconds, 6);

  const vehicle2 = qosunMelumatiniAl("vehicle_t2");
  assert.ok(vehicle2);
  assert.deepStrictEqual(vehicle2.costPerUnit, [
    { type: "fuel", amount: 23 },
    { type: "iron", amount: 12 }
  ]);

  assert.strictEqual(
    qosunKilidiniYoxla({}, bina("fighter_camp", 4), "warrior_t3").success,
    false,
    "Tier 3 bina Lv5-dən əvvəl açılmamalıdır"
  );

  assert.strictEqual(
    qosunKilidiniYoxla({}, bina("fighter_camp", 5), "warrior_t3").success,
    true,
    "Tier 3 bina Lv5-də açılmalıdır"
  );

  assert.strictEqual(
    qosunKilidiniYoxla({}, bina("shooter_camp", 25), "shooter_t9").success,
    false,
    "Tier 9 araşdırmasız açılmamalıdır"
  );

  const t9State = {
    technology: {
      levels: {
        unlock_shooter_t9: 1
      }
    }
  };

  assert.strictEqual(
    qosunKilidiniYoxla(t9State, bina("shooter_camp", 25), "shooter_t9").success,
    true,
    "Tier 9 uyğun araşdırma ilə açılmalıdır"
  );

  const wrongTechState = {
    technology: {
      levels: {
        unlock_vehicle_t10: 1
      }
    }
  };

  assert.strictEqual(
    qosunKilidiniYoxla(wrongTechState, bina("fighter_camp", 25), "warrior_t10").success,
    false,
    "Başqa sinfin texnologiyası Savaşçı T10-u açmamalıdır"
  );

  const costState = {
    technology: {
      stats: {
        trainingCostReductionPct: 10
      }
    }
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

  const timeState = {
    technology: {
      stats: {
        trainingSpeedPct: 20
      }
    }
  };

  const duration = telimMuddetiniHesabla(timeState, "vehicle_t1", 100);
  assert.strictEqual(duration.baseDurationMs, 500000);
  assert.strictEqual(duration.finalDurationMs, 416667);

  console.log("[QOSUN_KATALOQU_TESTI] OK");
})();
