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

  console.log(
    "PASS: gameplay state restore is PostgreSQL-authoritative, cacheable and force-refreshable."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
