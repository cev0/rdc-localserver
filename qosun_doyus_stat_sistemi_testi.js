"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_ID_TO_CANONICAL,
  legacyQosunIdSiniCanonicalEt,
  qosunDoyusMelumatiniAl,
  birQosununGucunuAl,
  qosunSnapshotiniCanonicalEt,
  qosunDoyusStatlariniHesabla,
  qosunGucunuHesabla
} = require("./qosun_doyus_stat_sistemi");

(function canonicalIdTesti() {
  assert.strictEqual(LAST_SHELTER_ID_TO_CANONICAL.size, 30);
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("warrior_t5"), "warrior_t5");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("fighter_lv5"), "warrior_t5");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("shooter_lv10"), "shooter_t10");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("vehicle_lv2"), "vehicle_t2");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("107000"), "warrior_t1");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("107009"), "warrior_t10");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("107100"), "vehicle_t1");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("107109"), "vehicle_t10");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("107200"), "shooter_t1");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("107209"), "shooter_t10");
  assert.strictEqual(legacyQosunIdSiniCanonicalEt("saxta_unit"), "");
})();

(function allPrimary107xIdsBattleCanonical() {
  for (const prefix of ["1070","1071","1072"]) {
    for (let index = 0; index < 10; index++) {
      const rawId = prefix + String(index).padStart(2, "0");
      const expectedClass =
        prefix === "1070"
          ? "warrior"
          : prefix === "1071"
            ? "vehicle"
            : "shooter";
      const expectedCanonical =
        expectedClass + "_t" + (index + 1);

      assert.strictEqual(
        legacyQosunIdSiniCanonicalEt(rawId),
        expectedCanonical,
        rawId
      );

      const row = qosunDoyusMelumatiniAl(rawId);
      assert.ok(row, rawId);
      assert.strictEqual(row.lastShelterArmyId, rawId);
      assert.ok(row.attackSpeed > 0, rawId);
      assert.ok(row.defense > 0, rawId);
      assert.ok(row.hp > 0, rawId);
      assert.ok(row.battlePower > 0, rawId);
    }
  }
})();

(function birVahidGucTesti() {
  assert.strictEqual(birQosununGucunuAl("warrior_t1"), 1);
  assert.strictEqual(birQosununGucunuAl("warrior_t7"), 4.9);
  assert.strictEqual(birQosununGucunuAl("shooter_t10"), 8.2);
  assert.strictEqual(birQosununGucunuAl("vehicle_t10"), 8.2);
  assert.strictEqual(birQosununGucunuAl("fighter_lv7"), 4.9);
  assert.strictEqual(birQosununGucunuAl("107006"), 4.9);
  assert.strictEqual(qosunDoyusMelumatiniAl("107209").lastShelterArmyId, "107209");
})();

(function legacyVeCanonicalBirlesmeTesti() {
  const netice = qosunSnapshotiniCanonicalEt({
    warrior_t2: 10,
    fighter_lv2: 5,
    "107001": 7,
    shooter_t1: 3,
    "107200": 4,
    saxta_unit: 99
  });

  assert.deepStrictEqual(netice.troops, {
    warrior_t2: 22,
    shooter_t1: 7
  });
  assert.deepStrictEqual(netice.unknownUnitIds, ["saxta_unit"]);
})();

(function aggregateStatTesti() {
  const snapshot = {
    warrior_t5: 100,
    "107206": 50,
    vehicle_t4: 20
  };

  const stats = qosunDoyusStatlariniHesabla(snapshot);

  assert.strictEqual(stats.totalTroops, 170);
  assert.strictEqual(stats.totalAttack, 100 * 38 + 50 * 68 + 20 * 32);
  assert.strictEqual(stats.totalDefense, 100 * 22 + 50 * 34 + 20 * 17);
  assert.strictEqual(stats.totalHp, 100 * 9 + 50 * 10 + 20 * 7);
  assert.strictEqual(stats.totalBattlePower, 100 * 3.2 + 50 * 4.9 + 20 * 2.5);
  assert.strictEqual(qosunGucunuHesabla(snapshot), 615);
  assert.strictEqual(stats.classes.warrior.troopCount, 100);
  assert.strictEqual(stats.classes.shooter.troopCount, 50);
  assert.strictEqual(stats.classes.vehicle.troopCount, 20);
  assert.strictEqual(stats.perUnit.find(x => x.unitId === "shooter_t7").lastShelterArmyId, "107206");
})();

(function decimalPowerItmirTesti() {
  assert.strictEqual(qosunGucunuHesabla({ warrior_t2: 1 }), 1.4);
  assert.strictEqual(qosunGucunuHesabla({ shooter_t8: 3 }), 17.7);
  assert.strictEqual(qosunGucunuHesabla({ "107207": 3 }), 17.7);
})();

console.log("[QOSUN_DOYUS_STAT_SISTEMI_TESTI] OK");
