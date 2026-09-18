"use strict";

const assert = require("assert");

const {
  obyektiYerindeEvezEt,
  postgresAuthoritativeMutationExecutorYarat
} = require("./runtime_pg_authoritative_mutation");

(async () => {
  const liveState = {
    playerId: "p1",
    resources: {
      wood: 100
    },
    marker: "stale-ram"
  };

  let databaseState = {
    playerId: "p1",
    resources: {
      wood: 75
    },
    marker: "db-latest",
    dueProcessed: false
  };

  const sent = [];
  let prepareCount = 0;
  let afterCommitCount = 0;
  let sawDeferredBeforeCommit = false;

  const fakeTransaction =
    async (
      _playerId,
      currentState,
      operation
    ) => {
      const locked =
        JSON.parse(
          JSON.stringify(
            databaseState
          )
        );

      const result =
        await operation(
          locked
        );

      sawDeferredBeforeCommit =
        sent.length === 0;

      if (
        result &&
        result.deyisdi === true
      ) {
        databaseState =
          JSON.parse(
            JSON.stringify(
              locked
            )
          );
      }

      obyektiYerindeEvezEt(
        currentState,
        locked
      );

      return result;
    };

  const executor =
    postgresAuthoritativeMutationExecutorYarat({
      getOrCreatePlayerState:
        () => liveState,

      transactionExecutor:
        fakeTransaction,

      prepareLockedState:
        async (state) => {
          prepareCount += 1;
          state.dueProcessed = true;
        },

      afterCommit:
        async () => {
          afterCommitCount += 1;
        }
    });

  const ws = {
    id: "ws-1"
  };

  const result =
    await executor(
      "p1",
      async ({ send }) => {
        assert.strictEqual(
          liveState.marker,
          "db-latest",
          "handler stale RAM deyil, PostgreSQL snapshot ile baslamalidir."
        );

        assert.strictEqual(
          liveState.resources.wood,
          75
        );

        liveState.resources.wood -= 25;

        send(ws, {
          type: "upgrade_started",
          remainingWood:
            liveState.resources.wood
        });

        assert.strictEqual(
          sent.length,
          0,
          "client cavabi COMMIT-den evvel gonderilmemelidir."
        );

        return {
          ok: true
        };
      },
      {
        type: "upgrade_request",
        send:
          (_ws, payload) => {
            sent.push(payload);
          }
      }
    );

  assert.deepStrictEqual(
    result,
    {
      ok: true
    }
  );

  assert.strictEqual(
    sawDeferredBeforeCommit,
    true
  );

  assert.strictEqual(
    prepareCount,
    1
  );

  assert.strictEqual(
    afterCommitCount,
    1
  );

  assert.strictEqual(
    databaseState.resources.wood,
    50
  );

  assert.strictEqual(
    databaseState.dueProcessed,
    true
  );

  assert.strictEqual(
    liveState.resources.wood,
    50
  );

  assert.deepStrictEqual(
    sent,
    [
      {
        type: "upgrade_started",
        remainingWood: 50
      }
    ]
  );

  // Rollback senarisi: RAM ve response queue commit olmadan geri qayitmalidir.
  const rollbackLive = {
    playerId: "p2",
    resources: {
      food: 90
    }
  };

  const rollbackSent = [];

  const rollbackExecutor =
    postgresAuthoritativeMutationExecutorYarat({
      getOrCreatePlayerState:
        () => rollbackLive,

      transactionExecutor:
        async (
          _playerId,
          _currentState,
          operation
        ) => {
          const locked = {
            playerId: "p2",
            resources: {
              food: 80
            }
          };

          await operation(locked);

          throw new Error(
            "simulated_commit_failure"
          );
        }
    });

  await assert.rejects(
    () =>
      rollbackExecutor(
        "p2",
        async ({ send }) => {
          rollbackLive.resources.food =
            10;

          send(ws, {
            type: "build_placed"
          });
        },
        {
          send:
            (_ws, payload) => {
              rollbackSent.push(
                payload
              );
            }
        }
      ),
    /simulated_commit_failure/
  );

  assert.strictEqual(
    rollbackLive.resources.food,
    90,
    "rollback RAM state-i request-den evvelki veziyyete qaytarmalidir."
  );

  assert.deepStrictEqual(
    rollbackSent,
    [],
    "rollback olmus mutation client-e success gondermemelidir."
  );

  console.log(
    "PASS: PostgreSQL authoritative mutation uses latest snapshot, defers responses and restores RAM on rollback."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
