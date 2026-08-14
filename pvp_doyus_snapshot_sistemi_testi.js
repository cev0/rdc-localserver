"use strict";

const assert = require("assert");
const {
  aktivKonvoyIdSetiniAl,
  aktivKonvoyQosunlariniAl,
  mudafieQosunlariniHazirla,
  mudafieQehremanIdleriniHazirla,
  pvpDoyusSnapshotQaydasiniHazirla,
  pvpHucumcuSnapshotiniHazirla,
  pvpMudafieciSnapshotiniHazirla
} = require("./pvp_doyus_snapshot_sistemi");

function testStateHazirla() {
  return {
    playerId: "oyuncu_mudafie",
    army: {
      troops: {
        fighter_lv1: 100,
        shooter_lv1: 50,
        vehicle_lv1: 10
      }
    },
    heroes: [
      { heroId: "hero_1" },
      { heroId: "hero_2" },
      { heroId: "hero_3" }
    ],
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          aciqdir: true,
          qosunlar: {
            fighter_lv1: 30
          },
          qehremanIdleri: ["hero_1"],
          formasiya: {
            siralar: [
              {
                siraId: "sira_1",
                unitId: "fighter_lv1",
                count: 30
              }
            ]
          }
        },
        {
          konvoyId: "konvoy_2",
          aciqdir: true,
          qosunlar: {
            shooter_lv1: 20
          },
          qehremanIdleri: ["hero_2"],
          formasiya: {
            siralar: [
              {
                siraId: "sira_1",
                unitId: "shooter_lv1",
                count: 20
              }
            ]
          }
        }
      ]
    },
    konvoyEmeliyyatlari: {
      activeByConvoy: {
        konvoy_1: {
          convoyId: "konvoy_1",
          status: "marching",
          targetType: "enemy"
        }
      }
    }
  };
}

(function aktivKonvoyTesti() {
  const state = testStateHazirla();
  const aktiv = aktivKonvoyIdSetiniAl(state);

  assert.deepStrictEqual(
    Array.from(aktiv).sort(),
    ["konvoy_1"]
  );

  assert.deepStrictEqual(
    aktivKonvoyQosunlariniAl(state),
    { fighter_lv1: 30 }
  );
})();

(function bazaMudafieQosunTesti() {
  const state = testStateHazirla();

  assert.deepStrictEqual(
    mudafieQosunlariniHazirla(state),
    {
      fighter_lv1: 70,
      shooter_lv1: 50,
      vehicle_lv1: 10
    }
  );
})();

(function bazaMudafieQehremanTesti() {
  const state = testStateHazirla();

  assert.deepStrictEqual(
    mudafieQehremanIdleriniHazirla(state),
    ["hero_2", "hero_3"]
  );
})();

(function hucumcuSnapshotTesti() {
  const state = testStateHazirla();
  const netice = pvpHucumcuSnapshotiniHazirla(
    state,
    "konvoy_1",
    123456
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.snapshot.convoyId, "konvoy_1");
  assert.strictEqual(netice.snapshot.troopCount, 30);
  assert.strictEqual(netice.snapshot.troopPower, 150);
  assert.deepStrictEqual(netice.snapshot.heroIds, ["hero_1"]);
  assert.strictEqual(netice.snapshot.locked, true);
  assert.strictEqual(netice.snapshot.snapshottedAtMs, 123456);
})();

(function mudafieciSnapshotTesti() {
  const state = testStateHazirla();
  const netice = pvpMudafieciSnapshotiniHazirla(
    state,
    "oyuncu_mudafie",
    654321
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.snapshot.playerId, "oyuncu_mudafie");
  assert.strictEqual(netice.snapshot.troopCount, 130);
  assert.strictEqual(netice.snapshot.troopPower, 850);
  assert.deepStrictEqual(
    netice.snapshot.activeConvoyIds,
    ["konvoy_1"]
  );
  assert.deepStrictEqual(
    netice.snapshot.heroIds,
    ["hero_2", "hero_3"]
  );
  assert.strictEqual(netice.snapshot.locked, true);
  assert.strictEqual(netice.snapshot.snapshottedAtMs, 654321);
})();

(function snapshotQaydasiTesti() {
  const qayda = pvpDoyusSnapshotQaydasiniHazirla();

  assert.strictEqual(qayda.attackerSnapshotLockedAtAttackStart, true);
  assert.strictEqual(qayda.defenderSnapshotLockedAtArrival, true);
  assert.strictEqual(qayda.activeConvoyTroopsExcludedFromBaseDefense, true);
  assert.strictEqual(qayda.idleConvoyAssignmentsRemainAtBase, true);
  assert.strictEqual(qayda.combatResolverEnabled, false);
})();

console.log("[PVP_DOYUS_SNAPSHOT_TEST] OK");
