"use strict";

const assert = require("assert");
const {
  tutorialDoyusunaBasla,
  tutorialDoyusunuNeticelendir,
  qosunSnapshotGucunuHesabla
} = require("./doyus_sistemi");

function stateHazirla(troops) {
  return {
    army: { troops: { ...troops } },
    heroes: [{ heroId: "hero_test_1" }],
    dusmenMovqeleri: {
      tutorial: {
        status: "askarlandi",
        targetId: "tutorial_enemy_outpost_001"
      }
    }
  };
}

(function canonicalDoyusGucuTesti() {
  const state = stateHazirla({ warrior_t2: 4 });
  const start = tutorialDoyusunaBasla(state, 1000);

  assert.strictEqual(start.success, true);
  assert.deepStrictEqual(state.doyus.tutorial.troopSnapshot, { warrior_t2: 4 });
  assert.strictEqual(state.doyus.tutorial.combatStatSource, "qosun_kataloqu_v1");
  assert.strictEqual(state.doyus.tutorial.troopStats.totalBattlePower, 5.6);
  assert.strictEqual(state.doyus.tutorial.troopStats.totalAttack, 52);
  assert.strictEqual(state.doyus.tutorial.troopStats.totalDefense, 60);
  assert.strictEqual(state.doyus.tutorial.troopStats.totalHp, 20);

  const result = tutorialDoyusunuNeticelendir(state, 6000);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.victory, true);
  assert.strictEqual(result.info.playerPower, 5.6);
  assert.strictEqual(result.info.enemyPower, 5);
})();

(function legacyIdYeniKataloqaMapOlunurTesti() {
  const state = stateHazirla({ fighter_lv1: 1 });
  const start = tutorialDoyusunaBasla(state, 1000);

  assert.strictEqual(start.success, true);
  assert.deepStrictEqual(state.doyus.tutorial.troopSnapshot, { warrior_t1: 1 });

  const result = tutorialDoyusunuNeticelendir(state, 6000);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.victory, false);
  assert.strictEqual(result.info.playerPower, 1);
})();

(function namelumUnitRejectTesti() {
  const state = stateHazirla({ saxta_unit: 100 });
  const start = tutorialDoyusunaBasla(state, 1000);
  assert.strictEqual(start.success, false);
  assert.ok(start.message.includes("tanınan") || start.message.includes("olmayan"));
})();

(function aggregatePowerDecimalTesti() {
  assert.strictEqual(
    qosunSnapshotGucunuHesabla({
      warrior_t7: 10,
      shooter_t8: 2,
      vehicle_t4: 3
    }),
    68.3
  );
})();

console.log("[DOYUS_QOSUN_STAT_INTEQRASIYA_TESTI] OK");
