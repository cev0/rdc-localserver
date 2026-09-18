"use strict";

const assert = require("assert");
const {
  worldStateOyuncuMutasiyasiniPostgresIleIcraEt
} = require("./world_state_mutasiya_postgres");

function hovuzYarat(log) {
  return {
    async connect() {
      return {
        async query(sql) {
          log.push(String(sql).replace(/\s+/g, " ").trim());
          return { rows: [] };
        },
        release() {
          log.push("RELEASE");
        }
      };
    }
  };
}

(async () => {
  const log = [];
  const liveState = {
    playerId: "p1",
    marker: "ram-stale",
    worldPlacement: {
      stateId: 7,
      baseX: 10,
      baseZ: 20
    }
  };

  let databaseState = {
    playerId: "p1",
    marker: "db-latest",
    worldPlacement: {
      stateId: 7,
      baseX: 11,
      baseZ: 21
    }
  };

  const result =
    await worldStateOyuncuMutasiyasiniPostgresIleIcraEt(
      "p1",
      liveState,
      async (lockedState, transactionContext) => {
        assert.strictEqual(lockedState.marker, "db-latest");
        assert.strictEqual(transactionContext.stateId, 7);
        assert.strictEqual(transactionContext.worldStateLockHeld, true);

        lockedState.worldPlacement.baseX = 100;

        return {
          deyisdi: true,
          ok: true
        };
      },
      {
        hovuz: hovuzYarat(log),

        worldStateLockFn: async (_client, stateId) => {
          log.push("STATE_LOCK:" + stateId);
        },

        playerLockFn: async (_client, playerId) => {
          log.push("PLAYER_LOCK:" + playerId);
        },

        snapshotReadFn: async (_client, playerId) => {
          log.push("SNAPSHOT_READ:" + playerId);
          return JSON.parse(JSON.stringify(databaseState));
        },

        snapshotWriteFn: async (_client, playerId, state) => {
          log.push("SNAPSHOT_WRITE:" + playerId);
          databaseState = JSON.parse(JSON.stringify(state));
        }
      }
    );

  assert.deepStrictEqual(result, {
    deyisdi: true,
    ok: true
  });

  assert.strictEqual(liveState.marker, "db-latest");
  assert.strictEqual(liveState.worldPlacement.baseX, 100);
  assert.strictEqual(databaseState.worldPlacement.baseX, 100);

  assert.deepStrictEqual(
    log.slice(0, 6),
    [
      "BEGIN",
      "STATE_LOCK:7",
      "PLAYER_LOCK:p1",
      "SNAPSHOT_READ:p1",
      "SNAPSHOT_WRITE:p1",
      "COMMIT"
    ],
    "Shared-world transaction əvvəl Dövlət, sonra oyunçu lock-u almalıdır."
  );

  const retryLog = [];
  const retryLiveState = {
    playerId: "p2",
    worldPlacement: {
      stateId: 7,
      baseX: 1,
      baseZ: 1
    }
  };

  const authoritativeMovedState = {
    playerId: "p2",
    worldPlacement: {
      stateId: 9,
      baseX: 2,
      baseZ: 2
    }
  };

  let operationCount = 0;

  await worldStateOyuncuMutasiyasiniPostgresIleIcraEt(
    "p2",
    retryLiveState,
    async (lockedState, transactionContext) => {
      operationCount += 1;
      assert.strictEqual(lockedState.worldPlacement.stateId, 9);
      assert.strictEqual(transactionContext.stateId, 9);
      return { deyisdi: false };
    },
    {
      hovuz: hovuzYarat(retryLog),

      worldStateLockFn: async (_client, stateId) => {
        retryLog.push("STATE_LOCK:" + stateId);
      },

      playerLockFn: async (_client, playerId) => {
        retryLog.push("PLAYER_LOCK:" + playerId);
      },

      snapshotReadFn: async () =>
        JSON.parse(JSON.stringify(authoritativeMovedState)),

      snapshotWriteFn: async () => {
        throw new Error("unchanged mutation snapshot yazmamalıdır");
      }
    }
  );

  assert.strictEqual(
    operationCount,
    1,
    "RAM stateId köhnədirsə business əməliyyatı yalnız düzgün Dövlət lock-u altında icra olunmalıdır."
  );

  assert.deepStrictEqual(
    retryLog.filter(item => item.startsWith("STATE_LOCK:")),
    [
      "STATE_LOCK:7",
      "STATE_LOCK:9"
    ]
  );

  assert.ok(
    retryLog.includes("ROLLBACK"),
    "Köhnə stateId lock-u rollback edilməlidir."
  );

  assert.strictEqual(
    retryLiveState.worldPlacement.stateId,
    9,
    "Commit-dən sonra live RAM authoritative stateId ilə sinxronlaşmalıdır."
  );

  console.log(
    "PASS: shared-world PostgreSQL mutation uses state-first lock order and retries stale RAM stateId safely."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
