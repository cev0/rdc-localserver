"use strict";

const assert = require("assert");
const {
  pvpBazaHucumCatmaMutasiyasiniIcraEt
} = require("./pvp_baza_hucum_catma_xidmeti");

function operationHazirla(status = "marching_to_player_base") {
  return {
    version: 1,
    operationId: "pvp:oyuncu_a:konvoy_1:1000",
    playerId: "oyuncu_a",
    convoyId: "konvoy_1",
    targetType: "player_base",
    targetId: "oyuncu_b",
    targetPlayerId: "oyuncu_b",
    stateId: 1,
    fromX: 0,
    fromZ: 0,
    targetX: 3,
    targetZ: 4,
    targetSnapshot: {
      version: 1,
      targetPlayerId: "oyuncu_b",
      stateId: 1,
      targetX: 3,
      targetZ: 4,
      targetHqLevel: 2,
      snappedAtMs: 1000,
      coordinatesLocked: true
    },
    attackerCombatSnapshot: {
      version: 1,
      side: "attacker",
      convoyId: "konvoy_1",
      troops: { fighter_lv1: 10 },
      formation: [
        { siraId: "sira_1", unitId: "fighter_lv1", count: 10 }
      ],
      heroIds: ["hero_1"],
      troopCount: 10,
      troopPower: 50,
      heroPowerApplied: false,
      snapshottedAtMs: 1000,
      locked: true
    },
    startedAtMs: 1000,
    arrivalAtMs: 5000,
    travelDurationMs: 4000,
    status,
    battleAllowed: false,
    battleResolved: false,
    abandonedTarget: false,
    campReason: "",
    returnStartedAtMs: 0,
    returnEndsAtMs: 0,
    result: null
  };
}

function stateHazirla(operation = operationHazirla()) {
  return {
    playerId: "oyuncu_a",
    worldPlacement: {
      stateId: 1,
      baseX: 0,
      baseZ: 0
    },
    konvoyEmeliyyatlari: {
      version: 3,
      activeByConvoy: {
        konvoy_1: operation
      },
      history: []
    }
  };
}

function hedefBazaHazirla(x = 3, z = 4) {
  return {
    playerId: "oyuncu_b",
    stateId: 1,
    x,
    z,
    baseX: x,
    baseZ: z,
    hqLevel: 2
  };
}

const fakeClient = {
  async query() {
    throw new Error("Bu testdə injected asılılıqlar istifadə olunmalıdır.");
  }
};

(async function testleriIcraEt() {
  {
    const state = stateHazirla();
    const cagirilar = [];

    const netice = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
      state,
      "oyuncu_a",
      {
        convoyId: "konvoy_1",
        operationId: "pvp:oyuncu_a:konvoy_1:1000"
      },
      fakeClient,
      4000,
      {
        dovletKilidiAl: async () => cagirilar.push("lock"),
        hedefBazaAl: async () => {
          cagirilar.push("target");
          return hedefBazaHazirla();
        }
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, false);
    assert.strictEqual(netice.arrival.arrived, false);
    assert.strictEqual(netice.arrival.remainingMs, 1000);
    assert.deepStrictEqual(cagirilar, []);
    assert.strictEqual(
      state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1.status,
      "marching_to_player_base"
    );
  }

  {
    const state = stateHazirla();
    const cagirilar = [];

    const netice = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
      state,
      "oyuncu_a",
      {
        convoyId: "konvoy_1",
        operationId: "pvp:oyuncu_a:konvoy_1:1000"
      },
      fakeClient,
      5000,
      {
        dovletKilidiAl: async (client, stateId) => {
          assert.strictEqual(client, fakeClient);
          assert.strictEqual(stateId, 1);
          cagirilar.push("lock");
        },
        hedefBazaAl: async (client, stateId, targetPlayerId) => {
          assert.strictEqual(client, fakeClient);
          assert.strictEqual(stateId, 1);
          assert.strictEqual(targetPlayerId, "oyuncu_b");
          cagirilar.push("target");
          return hedefBazaHazirla();
        }
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, true);
    assert.deepStrictEqual(cagirilar, ["lock", "target"]);
    assert.strictEqual(netice.operation.status, "ready_for_pvp_battle");
    assert.strictEqual(netice.operation.battleAllowed, true);
    assert.strictEqual(netice.operation.abandonedTarget, false);
    assert.strictEqual(netice.operation.arrivalResolvedAtMs, 5000);
    assert.strictEqual(netice.operation.targetStillPresentAtArrival, true);
    assert.strictEqual(netice.operation.defenderEscapedByRelocation, false);
    assert.strictEqual(netice.operation.result, null);

    cagirilar.length = 0;
    const replay = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
      state,
      "oyuncu_a",
      {
        convoyId: "konvoy_1",
        operationId: "pvp:oyuncu_a:konvoy_1:1000"
      },
      fakeClient,
      6000,
      {
        dovletKilidiAl: async () => cagirilar.push("lock"),
        hedefBazaAl: async () => {
          cagirilar.push("target");
          return hedefBazaHazirla();
        }
      }
    );

    assert.strictEqual(replay.success, true);
    assert.strictEqual(replay.deyisdi, false);
    assert.strictEqual(replay.alreadyResolved, true);
    assert.strictEqual(replay.operation.status, "ready_for_pvp_battle");
    assert.deepStrictEqual(cagirilar, []);
  }

  {
    const state = stateHazirla();
    const cagirilar = [];

    const netice = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
      state,
      "oyuncu_a",
      { convoyId: "konvoy_1" },
      fakeClient,
      5000,
      {
        dovletKilidiAl: async () => cagirilar.push("lock"),
        hedefBazaAl: async () => {
          cagirilar.push("target");
          return hedefBazaHazirla(30, 40);
        }
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, true);
    assert.deepStrictEqual(cagirilar, ["lock", "target"]);
    assert.strictEqual(netice.operation.status, "camping_at_abandoned_target");
    assert.strictEqual(netice.operation.battleAllowed, false);
    assert.strictEqual(netice.operation.abandonedTarget, true);
    assert.strictEqual(netice.operation.campReason, "target_relocated");
    assert.strictEqual(netice.operation.targetStillPresentAtArrival, false);
    assert.strictEqual(netice.operation.defenderEscapedByRelocation, true);
    assert.strictEqual(netice.operation.result.type, "pvp_arrival");
    assert.strictEqual(netice.operation.result.outcome, "camp");
    assert.strictEqual(netice.operation.result.reason, "target_relocated");
  }

  {
    const state = stateHazirla();

    const netice = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
      state,
      "oyuncu_a",
      { convoyId: "konvoy_1" },
      fakeClient,
      5000,
      {
        dovletKilidiAl: async () => {},
        hedefBazaAl: async () => null
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, true);
    assert.strictEqual(netice.operation.status, "camping_at_abandoned_target");
    assert.strictEqual(netice.operation.campReason, "target_base_not_present");
  }

  {
    const state = stateHazirla();
    const cagirilar = [];

    const netice = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
      state,
      "oyuncu_a",
      {
        convoyId: "konvoy_1",
        operationId: "pvp:basqa-emeliyyat"
      },
      fakeClient,
      5000,
      {
        dovletKilidiAl: async () => cagirilar.push("lock"),
        hedefBazaAl: async () => cagirilar.push("target")
      }
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.deyisdi, false);
    assert.strictEqual(netice.blocker, "operation_mismatch");
    assert.deepStrictEqual(cagirilar, []);
  }

  {
    const state = stateHazirla(operationHazirla("returning"));
    const cagirilar = [];

    const netice = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
      state,
      "oyuncu_a",
      { convoyId: "konvoy_1" },
      fakeClient,
      5000,
      {
        dovletKilidiAl: async () => cagirilar.push("lock"),
        hedefBazaAl: async () => cagirilar.push("target")
      }
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.deyisdi, false);
    assert.deepStrictEqual(cagirilar, []);
  }

  {
    const state = stateHazirla();
    delete state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1;

    const netice = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
      state,
      "oyuncu_a",
      { convoyId: "konvoy_1" },
      fakeClient,
      5000
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.deyisdi, false);
    assert.ok(netice.message.includes("Aktiv PvP"));
  }

  console.log("[PVP_BAZA_HUCUM_CATMA_XIDMETI_TEST] OK");
})().catch(xeta => {
  console.error("[PVP_BAZA_HUCUM_CATMA_XIDMETI_TEST] XETA", xeta);
  process.exitCode = 1;
});
