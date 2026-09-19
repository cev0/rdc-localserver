"use strict";

const assert =
  require("assert");

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub,
  oyuncuStateBerpasiniKohneIsarele
} = require("./oyun_state_daimilik_korpu");

function stateKopyala(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

(async () => {
  const states =
    new Map([
      [
        "p1",
        {
          playerId: "p1",
          marker: "ram",
          resources: {
            money: 1
          }
        }
      ]
    ]);

  let snapshot = {
    playerId: "p1",
    marker: "db-v1",
    resources: {
      money: 10
    }
  };

  let transactionCalls =
    0;

  const context = {
    getOrCreatePlayerState(
      playerId
    ) {
      if (
        !states.has(
          playerId
        )
      ) {
        states.set(
          playerId,
          {
            playerId
          }
        );
      }

      return states.get(
        playerId
      );
    },

    updateServerTime(
      state
    ) {
      state.serverTimeUnixMs =
        123;
    }
  };

  const fakeTransaction =
    async (
      playerId,
      liveState,
      operation
    ) => {
      transactionCalls += 1;

      const latest =
        stateKopyala(
          snapshot
        );

      await operation(
        latest,
        {
          playerId,
          sonSnapshotVar: true
        }
      );

      for (
        const key of
        Object.keys(
          liveState
        )
      ) {
        delete liveState[key];
      }

      Object.assign(
        liveState,
        latest
      );
    };

  assert.strictEqual(
    await oyunStateIniBerpaEt(
      context,
      "p1",
      {
        transactionExecutor:
          fakeTransaction
      }
    ),
    true
  );

  assert.strictEqual(
    states.get("p1").marker,
    "db-v1"
  );

  assert.strictEqual(
    states.get("p1")
      .serverTimeUnixMs,
    123
  );

  assert.strictEqual(
    oyuncuStateBerpaOlunub(
      "p1"
    ),
    true
  );

  assert.strictEqual(
    transactionCalls,
    1
  );

  await oyunStateIniBerpaEt(
    context,
    "p1",
    {
      transactionExecutor:
        fakeTransaction
    }
  );

  assert.strictEqual(
    transactionCalls,
    1,
    "Fresh player state lazımsız yerə yenidən PostgreSQL-dən oxunmamalıdır."
  );

  snapshot = {
    playerId: "p1",
    marker: "db-v2",
    resources: {
      money: 20
    }
  };

  oyuncuStateBerpasiniKohneIsarele(
    "p1"
  );

  assert.strictEqual(
    oyuncuStateBerpaOlunub(
      "p1"
    ),
    false
  );

  await oyunStateIniBerpaEt(
    context,
    "p1",
    {
      transactionExecutor:
        fakeTransaction
    }
  );

  assert.strictEqual(
    transactionCalls,
    2
  );

  assert.strictEqual(
    states.get("p1").marker,
    "db-v2"
  );

  snapshot = {
    playerId: "p1",
    marker: "db-v3",
    resources: {
      money: 30
    }
  };

  await oyunStateIniBerpaEt(
    context,
    "p1",
    {
      force: true,
      transactionExecutor:
        fakeTransaction
    }
  );

  assert.strictEqual(
    transactionCalls,
    3
  );

  assert.strictEqual(
    states.get("p1").marker,
    "db-v3"
  );

  {
    states.set(
      "new-player",
      {
        playerId:
          "new-player",
        marker:
          "local-default",
        worldPlacement: {
          stateId: 1,
          baseX: 10,
          baseZ: 10
        }
      }
    );

    let placementCalls = 0;
    let written = false;

    const newPlayerTransaction =
      async (
        playerId,
        liveState,
        operation
      ) => {
        const lockedState =
          stateKopyala(
            liveState
          );

        const result =
          await operation(
            lockedState,
            {
              playerId,
              sonSnapshotVar:
                false,
              client: {
                async query() {
                  throw new Error(
                    "Injected placement fn olduğuna görə query çağırılmamalıdır."
                  );
                }
              }
            }
          );

        written =
          !!(
            result &&
            result.deyisdi ===
              true
          );

        for (
          const key of
          Object.keys(
            liveState
          )
        ) {
          delete liveState[key];
        }

        Object.assign(
          liveState,
          lockedState
        );

        return result;
      };

    await oyunStateIniBerpaEt(
      context,
      "new-player",
      {
        transactionExecutor:
          newPlayerTransaction,
        worldPlacementEnsureFn:
          async (
            _client,
            lockedState,
            playerId,
            nowMs,
            options
          ) => {
            placementCalls += 1;

            assert.strictEqual(
              playerId,
              "new-player"
            );

            assert.strictEqual(
              options.force,
              true
            );

            assert.ok(
              Number(nowMs) > 0
            );

            lockedState
              .worldPlacement = {
                stateId: 4,
                baseX: 700,
                baseZ: 701,
                assignmentAuthority:
                  "postgres_v1"
              };

            return {
              success: true,
              deyisdi: true,
              stateId: 4
            };
          }
      }
    );

    assert.strictEqual(
      placementCalls,
      1,
      "Snapshot olmayan oyunçunun local provisional placement-i PostgreSQL-authoritative allocator ilə əvəz edilməlidir."
    );

    assert.strictEqual(
      written,
      true,
      "Authoritative placement restore transaction-da snapshot write tələb etməlidir."
    );

    assert.strictEqual(
      states.get(
        "new-player"
      ).worldPlacement.stateId,
      4
    );

    assert.strictEqual(
      states.get(
        "new-player"
      ).worldPlacement
        .assignmentAuthority,
      "postgres_v1"
    );
  }

  console.log(
    "PASS: gameplay state restore is PostgreSQL-authoritative, cacheable and force-refreshable."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
