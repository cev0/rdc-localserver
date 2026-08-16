"use strict";

const assert = require("assert");
const {
  tutumaGoreResursBol,
  pvpResursTalaniTetbiqEt
} = require("./pvp_resurs_talani_sistemi");

function baseState(playerId, troopCount = 100) {
  return {
    playerId,
    resources: {
      food: 1000,
      water: 1000,
      wood: 1000,
      iron: 1000,
      fuel: 1000,
      electricity: 1000,
      money: 9999
    },
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          qehremanIdleri: [],
          formasiya: {
            siralar: troopCount > 0
              ? [{ siraId: "sira_1", unitId: "piyada", count: troopCount }]
              : []
          }
        }
      ]
    },
    konvoyEmeliyyatlari: {
      activeByConvoy: {
        konvoy_1: {
          operationId: `pvp:${playerId}:konvoy_1:1`,
          convoyId: "konvoy_1"
        }
      }
    }
  };
}

(function bolguTesti() {
  const got = tutumaGoreResursBol(
    { food: 100, wood: 300 },
    200,
    ["food", "wood"]
  );
  assert.strictEqual(got.food + got.wood, 200);
  assert.strictEqual(got.food, 50);
  assert.strictEqual(got.wood, 150);
})();

(function atomikCreditVeQorumaTesti() {
  const oldProtection = process.env.PVP_RESOURCE_PROTECTION_JSON;
  const oldIds = process.env.PVP_PLUNDER_RESOURCE_IDS;
  process.env.PVP_RESOURCE_PROTECTION_JSON = JSON.stringify({ food: 900, wood: 500 });
  process.env.PVP_PLUNDER_RESOURCE_IDS = "food,wood";

  try {
    const attacker = baseState("attacker", 100);
    attacker.resources.food = 10;
    attacker.resources.wood = 20;
    const defender = baseState("defender", 100);
    defender.resources.food = 1000;
    defender.resources.wood = 1000;

    const result = pvpResursTalaniTetbiqEt(attacker, defender, "konvoy_1", 123);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.protectionConfigured, true);
    assert.strictEqual(result.protectedByResource.food, 900);
    assert.strictEqual(result.protectedByResource.wood, 500);
    assert.strictEqual(result.unprotectedByResource.food, 100);
    assert.strictEqual(result.unprotectedByResource.wood, 500);
    assert.strictEqual(result.stolenTotal, 600);
    assert.strictEqual(defender.resources.food, 900);
    assert.strictEqual(defender.resources.wood, 500);
    assert.strictEqual(attacker.resources.food, 110);
    assert.strictEqual(attacker.resources.wood, 520);
    assert.strictEqual(attacker.resources.money, 9999);
    assert.strictEqual(attacker.konvoyEmeliyyatlari.activeByConvoy.konvoy_1.resourcesCreditedAtSettlement, true);
  }
  finally {
    if (oldProtection == null) delete process.env.PVP_RESOURCE_PROTECTION_JSON;
    else process.env.PVP_RESOURCE_PROTECTION_JSON = oldProtection;
    if (oldIds == null) delete process.env.PVP_PLUNDER_RESOURCE_IDS;
    else process.env.PVP_PLUNDER_RESOURCE_IDS = oldIds;
  }
})();

(function sagQalanQosunYoxdursaTalanYoxdurTesti() {
  const oldIds = process.env.PVP_PLUNDER_RESOURCE_IDS;
  process.env.PVP_PLUNDER_RESOURCE_IDS = "food,wood";
  try {
    const attacker = baseState("attacker", 0);
    attacker.resources.food = 0;
    attacker.resources.wood = 0;
    const defender = baseState("defender", 100);
    defender.resources.food = 1000;
    defender.resources.wood = 1000;

    const result = pvpResursTalaniTetbiqEt(attacker, defender, "konvoy_1", 123);
    assert.strictEqual(result.survivingTroopCount, 0);
    assert.strictEqual(result.carryingCapacity, 0);
    assert.strictEqual(result.stolenTotal, 0);
    assert.strictEqual(defender.resources.food, 1000);
    assert.strictEqual(attacker.resources.food, 0);
  }
  finally {
    if (oldIds == null) delete process.env.PVP_PLUNDER_RESOURCE_IDS;
    else process.env.PVP_PLUNDER_RESOURCE_IDS = oldIds;
  }
})();

console.log("PvP resurs talanı testləri uğurla keçdi.");
