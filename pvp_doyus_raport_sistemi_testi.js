"use strict";

const assert = require("assert");
const {
  pvpIkiTerefRaportlariniYarat
} = require("./pvp_doyus_raport_sistemi");

function casualty(unitId, sent, heavy, light, dead) {
  const survived = Math.max(0, sent - heavy - light - dead);
  return {
    success: true,
    sentCount: sent,
    totalLoss: heavy + light + dead,
    sentFormation: [{ siraId: "sira_1", unitId, count: sent }],
    heavyWoundedFormation: heavy > 0 ? [{ siraId: "sira_1", unitId, count: heavy }] : [],
    lightWoundedFormation: light > 0 ? [{ siraId: "sira_1", unitId, count: light }] : [],
    directDeadFormation: dead > 0 ? [{ siraId: "sira_1", unitId, count: dead }] : [],
    hospitalOverflowDeadFormation: [],
    deadFormation: dead > 0 ? [{ siraId: "sira_1", unitId, count: dead }] : [],
    survivedFormation: survived > 0 ? [{ siraId: "sira_1", unitId, count: survived }] : [],
    returnedFormation: survived > 0 ? [{ siraId: "sira_1", unitId, count: survived }] : [],
    hospital: { accepted: heavy }
  };
}

function testleriIcraEt() {
  const attacker = { playerId: "attacker_1" };
  const defender = { playerId: "defender_1" };
  const operation = {
    operationId: "pvp_operation_001",
    convoyId: "konvoy_1",
    stateId: 1,
    targetSnapshot: { stateId: 1, targetX: 44, targetZ: 55 },
    result: { defenderConvoyIds: ["konvoy_1", "konvoy_2"] }
  };

  const settlement = {
    success: true,
    alreadyResolved: false,
    operation,
    combat: {
      resolverId: "pvp_server_resolver_v1",
      attackerVictory: true,
      defenderVictory: false,
      attackerPower: 1200,
      defenderPower: 900
    },
    attackerCasualty: casualty("warrior_t1", 100, 8, 6, 4),
    defenderApplications: [
      { convoyId: "konvoy_1", casualty: casualty("shooter_t1", 60, 10, 5, 5) },
      { convoyId: "konvoy_2", casualty: casualty("vehicle_t1", 40, 6, 4, 4) }
    ]
  };

  const first = pvpIkiTerefRaportlariniYarat(attacker, defender, settlement, 1000000);
  assert.strictEqual(first.success, true);
  assert.strictEqual(first.created, true);
  assert.strictEqual(attacker.doyusRaportlari.items.length, 1);
  assert.strictEqual(defender.doyusRaportlari.items.length, 1);

  const ar = attacker.doyusRaportlari.items[0];
  const dr = defender.doyusRaportlari.items[0];
  assert.strictEqual(ar.battleType, "pvp");
  assert.strictEqual(ar.pvpRole, "attacker");
  assert.strictEqual(ar.victory, true);
  assert.strictEqual(ar.opponentPlayerId, "defender_1");
  assert.strictEqual(ar.casualtySummary.sent, 100);
  assert.strictEqual(ar.casualtySummary.heavyWounded, 8);
  assert.strictEqual(ar.casualtySummary.lightWounded, 6);
  assert.strictEqual(ar.casualtySummary.deadTotal, 4);
  assert.strictEqual(ar.lightWoundedRecoveryPending, true);

  assert.strictEqual(dr.battleType, "pvp");
  assert.strictEqual(dr.pvpRole, "defender");
  assert.strictEqual(dr.victory, false);
  assert.strictEqual(dr.opponentPlayerId, "attacker_1");
  assert.strictEqual(dr.casualtySummary.sent, 100);
  assert.strictEqual(dr.casualtySummary.heavyWounded, 16);
  assert.strictEqual(dr.casualtySummary.lightWounded, 9);
  assert.strictEqual(dr.casualtySummary.deadTotal, 9);
  assert.strictEqual(dr.lightWoundedRecoveryPending, false);
  assert.deepStrictEqual(dr.ownConvoyIds, ["konvoy_1", "konvoy_2"]);

  assert.strictEqual(operation.result.attackerReportId, ar.reportId);
  assert.strictEqual(operation.result.defenderReportId, dr.reportId);

  const second = pvpIkiTerefRaportlariniYarat(attacker, defender, settlement, 1000001);
  assert.strictEqual(second.success, true);
  assert.strictEqual(attacker.doyusRaportlari.items.length, 1);
  assert.strictEqual(defender.doyusRaportlari.items.length, 1);

  console.log("PvP iki tərəf battle report testləri: OK");
}

try {
  testleriIcraEt();
}
catch (xeta) {
  console.error("[PVP_DOYUS_RAPORT_TEST] XETA", xeta);
  process.exit(1);
}
