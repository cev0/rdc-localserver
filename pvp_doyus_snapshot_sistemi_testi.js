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
const {
  konvoyMudafieMelumatiniHazirla,
  konvoyMudafiesiniTeyinEt
} = require("./konvoy_mudafie_sistemi");

function testStateHazirla() {
  return {
    playerId: "oyuncu_mudafie",
    technology: { levels: { ikinci_konvoy: 1 } },
    buildings: [
      {
        instanceId: "barrack_defense_1",
        buildingId: "barrack_1",
        level: 1,
        isCompleted: true
      },
      {
        instanceId: "barrack_defense_2",
        buildingId: "barrack_2",
        level: 1,
        isCompleted: true
      }
    ],
    army: {
      troops: {
        fighter_lv1: 100,
        shooter_lv1: 50,
        vehicle_lv1: 10
      }
    },
    heroes: [
      { heroId: "doyuscu" },
      { heroId: "war_master" },
      { heroId: "iron_maiden" }
    ],
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          aciqdir: true,
          qosunlar: { fighter_lv1: 30 },
          qehremanIdleri: ["doyuscu"],
          formasiya: {
            siralar: [
              { siraId: "sira_1", unitId: "fighter_lv1", count: 30 }
            ]
          }
        },
        {
          konvoyId: "konvoy_2",
          aciqdir: true,
          qosunlar: { shooter_lv1: 20 },
          qehremanIdleri: ["war_master"],
          formasiya: {
            siralar: [
              { siraId: "sira_1", unitId: "shooter_lv1", count: 20 }
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
  assert.deepStrictEqual(Array.from(aktiv).sort(), ["konvoy_1"]);
  assert.deepStrictEqual(aktivKonvoyQosunlariniAl(state), { fighter_lv1: 30 });
})();

(function legacyMudafieDefaultuVeMissiyaIstisnasiTesti() {
  const state = testStateHazirla();
  const info = konvoyMudafieMelumatiniHazirla(state, 1000);
  const bir = info.items.find(x => x.konvoyId === "konvoy_1");
  const iki = info.items.find(x => x.konvoyId === "konvoy_2");
  assert.strictEqual(bir.defenseEnabled, true);
  assert.strictEqual(bir.participatesNow, false);
  assert.strictEqual(iki.defenseEnabled, true);
  assert.strictEqual(iki.participatesNow, true);
  assert.strictEqual(info.freeTroopsAutoDefend, false);
})();

(function bazaMudafieYalnizSecilmisBosKonvoyTesti() {
  const state = testStateHazirla();
  assert.deepStrictEqual(mudafieQosunlariniHazirla(state, 1000), { shooter_lv1: 20 });
  assert.deepStrictEqual(mudafieQehremanIdleriniHazirla(state, 1000), ["war_master"]);
})();

(function deaktivKonvoyMudafiedeIstirakEtmirTesti() {
  const state = testStateHazirla();
  const netice = konvoyMudafiesiniTeyinEt(state, "konvoy_2", false, 1000);
  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.defenseEnabled, false);
  assert.deepStrictEqual(mudafieQosunlariniHazirla(state, 1000), {});
  assert.deepStrictEqual(mudafieQehremanIdleriniHazirla(state, 1000), []);
})();

(function mesgulKonvoyToggleBloklanirTesti() {
  const state = testStateHazirla();
  const netice = konvoyMudafiesiniTeyinEt(state, "konvoy_1", false, 1000);
  assert.strictEqual(netice.success, false);
  assert.ok(netice.busyReason);
})();

(function hucumcuSnapshotTesti() {
  const state = testStateHazirla();
  const netice = pvpHucumcuSnapshotiniHazirla(state, "konvoy_1", 123456);
  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.snapshot.convoyId, "konvoy_1");
  assert.strictEqual(netice.snapshot.troopCount, 30);
  assert.strictEqual(netice.snapshot.troopPower, 30);
  assert.deepStrictEqual(netice.snapshot.heroIds, ["doyuscu"]);
  assert.strictEqual(netice.snapshot.locked, true);
})();

(function mudafieciSnapshotTesti() {
  const state = testStateHazirla();
  const netice = pvpMudafieciSnapshotiniHazirla(state, "oyuncu_mudafie", 654321);
  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.snapshot.playerId, "oyuncu_mudafie");
  assert.strictEqual(netice.snapshot.troopCount, 20);
  assert.strictEqual(netice.snapshot.troopPower, 20);
  assert.deepStrictEqual(netice.snapshot.defenseConvoyIds, ["konvoy_2"]);
  assert.deepStrictEqual(netice.snapshot.activeConvoyIds, ["konvoy_1"]);
  assert.deepStrictEqual(netice.snapshot.heroIds, ["war_master"]);
  assert.strictEqual(netice.snapshot.freeTroopsAutoDefend, false);
  assert.strictEqual(netice.snapshot.locked, true);
})();

(function snapshotQaydasiTesti() {
  const qayda = pvpDoyusSnapshotQaydasiniHazirla();
  assert.strictEqual(qayda.attackerSnapshotLockedAtAttackStart, true);
  assert.strictEqual(qayda.defenderSnapshotLockedAtArrival, true);
  assert.strictEqual(qayda.defenseDisabledConvoyExcluded, true);
  assert.strictEqual(qayda.activeMissionConvoyExcluded, true);
  assert.strictEqual(qayda.freeTroopsAutoDefend, false);
  assert.strictEqual(qayda.combatResolverEnabled, true);
})();

console.log("[PVP_DOYUS_SNAPSHOT_TEST] OK");
