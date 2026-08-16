"use strict";

const assert = require("assert");
const {
  legacyQosunIdSiniCanonicalEt,
  birQosununGucunuAl,
  qosunSnapshotiniCanonicalEt,
  qosunDoyusStatlariniHesabla,
  qosunGucunuHesabla
} = require("./qosun_doyus_stat_sistemi");

(function canonicalIdTesti() {
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("warrior_t5"), "warrior_t5");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("fighter_lv5"), "warrior_t5");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("shooter_lv10"), "shooter_t10");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("vehicle_lv2"), "vehicle_t2");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("saxta_unit"), "");
})();

(function birVahidGucTesti() {
  assert.strictEqual(birQosununGucunuAl("warrior_t1"), 1);
  assert.strictEqual(birQosununGucunuAl("warrior_t7"), 4.9);
  assert.strictEqual(birQosununGucunuAl("shooter_t10"), 8.2);
  assert.strictEqual(birQosununGucunuAl("vehicle_t10"), 8.2);
  assert.strictEqual(birQosununGucunuAl("fighter_lv7"), 4.9);
})();

(function legacyVeCanonicalBirlesmeTesti() {
  const netice = qosunSnapshotiniCanonicalEt({
    warrior_t2: 10,
    fighter_lv2: 5,
    shooter_t1: 3,
    saxta_unit: 99
  });

  assert.deepStrictEqual(netice.troops, {
    warrior_t2: 15,
    shooter_t1: 3
  });
  assert.deepStrictEqual(netice.unknownUnitIds, ["saxta_unit"]);
})();

(function aggregateStatTesti() {
  const snapshot = {
    warrior_t5: 100,
    shooter_t7: 50,
    vehicle_t4: 20
  };

  const stats = qosunDoyusStatlariniHesabla(snapshot);

  assert.strictEqual(stats.totalTroops, 170);
  assert.strictEqual(stats.totalAttack, 100 * 32 + 50 * 73 + 20 * 31);
  assert.strictEqual(stats.totalDefense, 100 * 33 + 50 * 34 + 20 * 17);
  assert.strictEqual(stats.totalHp, 100 * 10 + 50 * 10 + 20 * 7);
  assert.strictEqual(stats.totalBattlePower, 100 * 3.2 + 50 * 4.9 + 20 * 2.5);
  assert.strictEqual(qosunGucunuHesabla(snapshot), 615);
  assert.strictEqual(stats.classes.warrior.troopCount, 100);
  assert.strictEqual(stats.classes.shooter.troopCount, 50);
  assert.strictEqual(stats.classes.vehicle.troopCount, 20);
})();

(function decimalPowerItmirTesti() {
  assert.strictEqual(qosunGucunuHesabla({ warrior_t2: 1 }), 1.4);
  assert.strictEqual(qosunGucunuHesabla({ shooter_t8: 3 }), 17.7);
})();

console.log("[QOSUN_DOYUS_STAT_SISTEMI_TESTI] OK");
