"use strict";

const assert = require("assert");
const {
  pvpHucumEmeliyyatQaydasiniHazirla,
  pvpHucumEmeliyyatiniHazirla,
  pvpHucumCatmaVeziyyetiniHazirla
} = require("./pvp_hucum_emeliyyat_sistemi");

function hucumcuStateHazirla() {
  return {
    playerId: "oyuncu_a",
    worldPlacement: {
      stateId: 1,
      baseX: 10,
      baseZ: 20
    },
    army: {
      troops: {
        fighter_lv1: 100
      }
    },
    heroes: [
      { heroId: "hero_1" }
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
        }
      ]
    }
  };
}

function hedefBazaHazirla(x = 13, z = 24) {
  return {
    playerId: "oyuncu_b",
    stateId: 1,
    x,
    z,
    hqLevel: 7
  };
}

(function hucumEmeliyyatiTesti() {
  const state = hucumcuStateHazirla();
  const hedef = hedefBazaHazirla();
  const netice = pvpHucumEmeliyyatiniHazirla(
    state,
    "oyuncu_a",
    "konvoy_1",
    hedef,
    100000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.operation.targetType, "player_base");
  assert.strictEqual(netice.operation.targetPlayerId, "oyuncu_b");
  assert.strictEqual(netice.operation.targetX, 13);
  assert.strictEqual(netice.operation.targetZ, 24);
  assert.strictEqual(netice.operation.status, "marching_to_player_base");
  assert.strictEqual(netice.operation.attackerCombatSnapshot.troopCount, 30);
  assert.strictEqual(netice.operation.attackerCombatSnapshot.troopPower, 150);
  assert.strictEqual(netice.operation.targetSnapshot.coordinatesLocked, true);
  assert.strictEqual(netice.operation.targetSnapshot.targetPlayerId, "oyuncu_b");
  assert.ok(netice.operation.travelDurationMs > 0);
  assert.strictEqual(
    netice.operation.arrivalAtMs,
    100000 + netice.operation.travelDurationMs
  );
})();

(function ozBazasinaHucumBlokTesti() {
  const state = hucumcuStateHazirla();
  const hedef = {
    ...hedefBazaHazirla(),
    playerId: "oyuncu_a"
  };

  const netice = pvpHucumEmeliyyatiniHazirla(
    state,
    "oyuncu_a",
    "konvoy_1",
    hedef,
    100000
  );

  assert.strictEqual(netice.success, false);
})();

(function ferqliDovletBlokTesti() {
  const state = hucumcuStateHazirla();
  const hedef = {
    ...hedefBazaHazirla(),
    stateId: 2
  };

  const netice = pvpHucumEmeliyyatiniHazirla(
    state,
    "oyuncu_a",
    "konvoy_1",
    hedef,
    100000
  );

  assert.strictEqual(netice.success, false);
})();

(function catmamisHucumTesti() {
  const state = hucumcuStateHazirla();
  const hedef = hedefBazaHazirla();
  const baslangic = pvpHucumEmeliyyatiniHazirla(
    state,
    "oyuncu_a",
    "konvoy_1",
    hedef,
    100000
  );

  const netice = pvpHucumCatmaVeziyyetiniHazirla(
    baslangic.operation,
    hedef,
    baslangic.operation.arrivalAtMs - 1
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.arrived, false);
  assert.strictEqual(netice.nextStatus, "marching_to_player_base");
  assert.strictEqual(netice.battleAllowed, false);
})();

(function hedefYerindedirTesti() {
  const state = hucumcuStateHazirla();
  const hedef = hedefBazaHazirla();
  const baslangic = pvpHucumEmeliyyatiniHazirla(
    state,
    "oyuncu_a",
    "konvoy_1",
    hedef,
    100000
  );

  const netice = pvpHucumCatmaVeziyyetiniHazirla(
    baslangic.operation,
    hedef,
    baslangic.operation.arrivalAtMs
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.arrived, true);
  assert.strictEqual(netice.nextStatus, "ready_for_pvp_battle");
  assert.strictEqual(netice.battleAllowed, true);
  assert.strictEqual(netice.campRequired, false);
  assert.strictEqual(netice.targetStillPresent, true);
})();

(function hedefTeleportEdibTesti() {
  const state = hucumcuStateHazirla();
  const hedef = hedefBazaHazirla();
  const baslangic = pvpHucumEmeliyyatiniHazirla(
    state,
    "oyuncu_a",
    "konvoy_1",
    hedef,
    100000
  );

  const kocmusHedef = hedefBazaHazirla(50, 60);
  const netice = pvpHucumCatmaVeziyyetiniHazirla(
    baslangic.operation,
    kocmusHedef,
    baslangic.operation.arrivalAtMs
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.arrived, true);
  assert.strictEqual(netice.nextStatus, "camping_at_abandoned_target");
  assert.strictEqual(netice.battleAllowed, false);
  assert.strictEqual(netice.campRequired, true);
  assert.strictEqual(netice.campX, 13);
  assert.strictEqual(netice.campZ, 24);
  assert.strictEqual(netice.followsRelocatedBase, false);
})();

(function hedefYoxdurTesti() {
  const state = hucumcuStateHazirla();
  const hedef = hedefBazaHazirla();
  const baslangic = pvpHucumEmeliyyatiniHazirla(
    state,
    "oyuncu_a",
    "konvoy_1",
    hedef,
    100000
  );

  const netice = pvpHucumCatmaVeziyyetiniHazirla(
    baslangic.operation,
    null,
    baslangic.operation.arrivalAtMs
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.nextStatus, "camping_at_abandoned_target");
  assert.strictEqual(netice.reason, "target_base_not_present");
})();

(function qaydaTesti() {
  const qayda = pvpHucumEmeliyyatQaydasiniHazirla();

  assert.strictEqual(qayda.endpointEnabled, false);
  assert.strictEqual(qayda.combatResolverEnabled, false);
  assert.strictEqual(qayda.targetCoordinatesLockedAtAttackStart, true);
  assert.strictEqual(qayda.followsRelocatedBase, false);
})();

console.log("[PVP_HUCUM_EMELIYYAT_TEST] OK");
