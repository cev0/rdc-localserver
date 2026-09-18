"use strict";

const assert = require("assert");
const {
  RuntimeCommandRouter
} = require("./runtime_command_router");
const {
  coreReadCommandleriniQeydEt
} = require("./runtime_core_read_commands");

(async () => {
  const router =
    new RuntimeCommandRouter({
      name: "test",
      logger: {
        error() {}
      }
    });

  const sent = [];
  const states = new Map();

  function getOrCreatePlayerState(playerId) {
    if (!states.has(playerId)) {
      states.set(playerId, {
        playerId,
        serverTimeUnixMs: 0,
        worldPlacement: {
          stateId: 7
        }
      });
    }

    return states.get(playerId);
  }

  function updateServerTime(state) {
    state.serverTimeUnixMs = 12345;
  }

  coreReadCommandleriniQeydEt(
    router,
    {
      getOrCreatePlayerState,
      updateServerTime,
      makeClientState: state => ({
        playerId: state.playerId,
        serverTimeUnixMs:
          state.serverTimeUnixMs
      }),
      buildStateLocalMapPayload:
        (stateId, playerId) => ({
          stateId,
          playerId
        }),
      buildWorldMapPayloadForClient:
        () => ({
          states: [1, 2, 3]
        })
    }
  );

  assert.deepStrictEqual(
    router.listRoutes(),
    [
      "get_state",
      "get_state_local_map",
      "get_world_map",
      "hello",
      "ping"
    ]
  );

  const ws = {
    _authedPlayerId: "p1"
  };

  const send = (_ws, payload) => {
    sent.push(payload);
  };

  assert.strictEqual(
    await router.dispatch({
      type: "unknown",
      msg: {
        type: "unknown"
      },
      ws,
      send,
      nowMs: () => 100
    }),
    false
  );

  assert.strictEqual(
    await router.dispatch({
      type: "ping",
      msg: {
        type: "ping"
      },
      ws,
      send,
      nowMs: () => 100
    }),
    true
  );

  assert.deepStrictEqual(
    sent.pop(),
    {
      type: "pong",
      serverTimeUnixMs: 100
    }
  );

  await router.dispatch({
    type: "get_state",
    msg: {
      type: "get_state"
    },
    ws,
    send,
    nowMs: () => 200
  });

  const stateResult = sent.pop();

  assert.strictEqual(
    stateResult.type,
    "state"
  );

  assert.strictEqual(
    stateResult.playerId,
    "p1"
  );

  assert.deepStrictEqual(
    JSON.parse(
      stateResult.payloadJson
    ),
    {
      playerId: "p1",
      serverTimeUnixMs: 12345
    }
  );

  await router.dispatch({
    type: "get_state_local_map",
    msg: {
      type: "get_state_local_map",
      playerId: "p2"
    },
    ws,
    send,
    nowMs: () => 300
  });

  const mismatch = sent.pop();

  assert.strictEqual(
    mismatch.code,
    "PLAYER_ID_MISMATCH"
  );

  const unauthWs = {
    _authedPlayerId: null
  };

  await router.dispatch({
    type: "get_world_map",
    msg: {
      type: "get_world_map"
    },
    ws: unauthWs,
    send,
    nowMs: () => 400
  });

  const unauth = sent.pop();

  assert.strictEqual(
    unauth.code,
    "NOT_AUTHED"
  );

  const metrics =
    router.getMetrics();

  assert.strictEqual(
    metrics.ping.received,
    1
  );

  assert.strictEqual(
    metrics.get_state.succeeded,
    1
  );

  const executorCalls = [];

  const mutationRouter =
    new RuntimeCommandRouter({
      name: "mutation-test",
      logger: {
        error() {}
      },
      mutationExecutor:
        async (
          playerId,
          action
        ) => {
          executorCalls.push(
            "normal:" + playerId
          );

          return await action();
        },
      authoritativeMutationExecutor:
        async (
          playerId,
          action,
          metadata
        ) => {
          executorCalls.push(
            "pg:" +
            playerId +
            ":" +
            metadata.type
          );

          return await action({
            send
          });
        }
    });

  mutationRouter.register(
    "normal_mutation",
    async () => {},
    {
      authRequired: true,
      mutation: true
    }
  );

  mutationRouter.register(
    "pg_mutation",
    async () => {},
    {
      authRequired: true,
      mutation: true,
      postgresAuthoritative: true
    }
  );

  await mutationRouter.dispatch({
    type: "normal_mutation",
    msg: {
      type: "normal_mutation"
    },
    ws,
    send
  });

  await mutationRouter.dispatch({
    type: "pg_mutation",
    msg: {
      type: "pg_mutation"
    },
    ws,
    send
  });

  assert.deepStrictEqual(
    executorCalls,
    [
      "normal:p1",
      "pg:p1:pg_mutation"
    ]
  );

  console.log(
    "PASS: command router dispatch, auth guard, metrics, core reads and PostgreSQL authoritative route selection."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
