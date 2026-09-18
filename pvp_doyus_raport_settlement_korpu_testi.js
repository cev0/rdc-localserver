"use strict";

const assert = require("assert");
const {
  settlementdenEvvelHedefiYoxla,
  pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt
} = require("./pvp_doyus_raport_settlement_korpu");

function operationHazirla() {
  return {
    version: 1,
    operationId:
      "pvp:oyuncu_a:konvoy_1:1000",
    playerId:
      "oyuncu_a",
    convoyId:
      "konvoy_1",
    targetType:
      "player_base",
    targetId:
      "oyuncu_b",
    targetPlayerId:
      "oyuncu_b",
    stateId:
      1,
    targetX:
      5,
    targetZ:
      5,
    targetSnapshot: {
      version: 1,
      targetPlayerId:
        "oyuncu_b",
      stateId:
        1,
      targetX:
        5,
      targetZ:
        5,
      coordinatesLocked:
        true
    },
    status:
      "ready_for_pvp_battle",
    battleAllowed:
      true,
    battleResolved:
      false,
    abandonedTarget:
      false,
    result:
      null
  };
}

function attackerStateHazirla() {
  return {
    playerId:
      "oyuncu_a",
    worldPlacement: {
      stateId: 1,
      baseX: 1,
      baseZ: 1
    },
    konvoyEmeliyyatlari: {
      version: 3,
      history: [],
      activeByConvoy: {
        konvoy_1:
          operationHazirla()
      }
    }
  };
}

function defenderStateHazirla(
  x,
  z
) {
  return {
    playerId:
      "oyuncu_b",
    worldPlacement: {
      stateId: 1,
      baseX: x,
      baseZ: z
    }
  };
}

(async () => {
  {
    const attacker =
      attackerStateHazirla();

    const defender =
      defenderStateHazirla(
        5,
        5
      );

    const check =
      settlementdenEvvelHedefiYoxla(
        attacker,
        defender,
        "konvoy_1",
        "oyuncu_b",
        "pvp:oyuncu_a:konvoy_1:1000"
      );

    assert.strictEqual(
      check.yoxlanmalidir,
      true
    );

    assert.strictEqual(
      check.present,
      true
    );
  }

  {
    const attackerState =
      attackerStateHazirla();

    const defenderState =
      defenderStateHazirla(
        9,
        9
      );

    let runnerCagirildi =
      0;

    const result =
      await pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt(
        {
          playerId:
            "oyuncu_a",
          cariState:
            attackerState
        },
        {
          playerId:
            "oyuncu_b",
          cariState:
            defenderState
        },
        "konvoy_1",
        "pvp:oyuncu_a:konvoy_1:1000",
        6000,
        {
          ikiOyuncuMutasiya:
            async (
              attacker,
              defender,
              action
            ) => {
              runnerCagirildi +=
                1;

              return await action(
                {
                  oyuncu_a:
                    attacker.cariState,
                  oyuncu_b:
                    defender.cariState
                },
                {
                  client: {
                    async query() {
                      return {
                        rows: []
                      };
                    }
                  },
                  worldStateLockHeld:
                    true,
                  worldStateId:
                    1
                }
              );
            },

          postCommitRecallFn:
            async () => {
              throw new Error(
                "zeroing recall işləməməlidir"
              );
            }
        }
      );

    assert.strictEqual(
      runnerCagirildi,
      1
    );

    assert.strictEqual(
      result.success,
      true
    );

    assert.strictEqual(
      result.deyisdi,
      true
    );

    assert.strictEqual(
      result.battleSkipped,
      true
    );

    assert.strictEqual(
      result.reason,
      "target_relocated_before_settlement"
    );

    assert.deepStrictEqual(
      result.deyisenPlayerIdleri,
      [
        "oyuncu_a"
      ]
    );

    const operation =
      attackerState
        .konvoyEmeliyyatlari
        .activeByConvoy
        .konvoy_1;

    assert.strictEqual(
      operation.status,
      "camping_at_abandoned_target"
    );

    assert.strictEqual(
      operation.battleAllowed,
      false
    );

    assert.strictEqual(
      operation.abandonedTarget,
      true
    );

    assert.strictEqual(
      operation.battleResolved,
      false
    );

    assert.strictEqual(
      operation.targetStillPresentAtSettlement,
      false
    );

    assert.strictEqual(
      operation.result.type,
      "pvp_arrival"
    );

    assert.strictEqual(
      operation.result.outcome,
      "camp"
    );

    assert.strictEqual(
      operation.result.revalidatedAtSettlement,
      true
    );

    assert.strictEqual(
      defenderState.worldPlacement.baseX,
      9
    );

    assert.strictEqual(
      defenderState.worldPlacement.baseZ,
      9
    );
  }

  {
    const attacker =
      attackerStateHazirla();

    const defender =
      defenderStateHazirla(
        9,
        9
      );

    const check =
      settlementdenEvvelHedefiYoxla(
        attacker,
        defender,
        "konvoy_1",
        "oyuncu_b",
        "pvp:basqa-operation"
      );

    assert.strictEqual(
      check.yoxlanmalidir,
      false,
      "Yanlış operationId relocation branch-i ilə cari əməliyyatı dəyişməməlidir."
    );
  }

  console.log(
    "PASS: PvP settlement defender mövqeyini State lock altında yenidən yoxlayır və relocated target-i döyüşə izləmir."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
