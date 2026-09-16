"use strict";

// PvP raportunda real komandir adının saxlandığını və siyahıya çıxdığını yoxlayır.
const assert = require("assert");
require("./pvp_raport_oyuncu_adi_override");
const { pvpIkiTerefRaportlariniYarat } = require("./pvp_doyus_raport_sistemi");
const { raportSiyahisiniHazirla } = require("./doyus_raport_sistemi");

const attackerState = {
  playerId: "attacker_1",
  oyuncuAdi: "Cavidan",
  doyusRaportlari: { version: 3, items: [] }
};
const defenderState = {
  playerId: "defender_1",
  oyuncuAdi: "MEmu Komandir",
  doyusRaportlari: { version: 3, items: [] }
};

const settlement = {
  success: true,
  alreadyResolved: false,
  operation: {
    operationId: "pvp:attacker_1:convoy_1:1",
    convoyId: "convoy_1",
    stateId: 1,
    fromX: 265,
    fromZ: 840,
    targetX: 300,
    targetZ: 820,
    targetSnapshot: { targetX: 300, targetZ: 820, stateId: 1 },
    result: { defenderConvoyIds: [] }
  },
  combat: {
    attackerVictory: true,
    defenderVictory: false,
    attackerPower: 100,
    defenderPower: 50,
    resolverId: "test"
  },
  attackerCasualty: {
    sentFormation: [],
    sentCount: 0,
    totalLoss: 0,
    heavyWoundedFormation: [],
    lightWoundedFormation: [],
    directDeadFormation: [],
    hospitalOverflowDeadFormation: [],
    deadFormation: [],
    survivedFormation: [],
    returnedFormation: []
  },
  defenderApplications: []
};

const result = pvpIkiTerefRaportlariniYarat(attackerState, defenderState, settlement, 123456);
assert.strictEqual(result.success, true);
assert.strictEqual(result.attackerReport.opponentCommanderName, "MEmu Komandir");
assert.strictEqual(result.defenderReport.opponentCommanderName, "Cavidan");

const defenderList = raportSiyahisiniHazirla(defenderState);
assert.strictEqual(defenderList.length, 1);
assert.strictEqual(defenderList[0].opponentCommanderName, "Cavidan");
assert.ok(defenderList[0].enemyType.includes("Hücumçu: Cavidan"));
assert.ok(defenderList[0].enemyType.includes("X:265 Y:840"));

console.log("PvP raport komandir adı testi keçdi.");
