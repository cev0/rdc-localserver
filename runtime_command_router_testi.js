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
  const localMapReads = [];

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
      buildStateLocalMapPayloadAuthoritative:
        async (stateId, playerId) => {
          localMapReads.push({
            stateId,
            playerId
          });

          return {
            stateId,
            playerId,
            authority: "postgres_snapshot"
          };
        },
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
      playerId: "p1",
      stateId: 7
    },
    ws,
    send,
    nowMs: () => 250
  });

  const localMapResult = sent.pop();

  assert.strictEqual(
    localMapResult.type,
    "state_local_map"
  );

  assert.deepStrictEqual(
    localMapReads,
    [
      {
        stateId: 7,
        playerId: "p1"
      }
    ]
  );

  assert.deepStrictEqual(
    JSON.parse(
      localMapResult.payloadJson
    ),
    {
      stateId: 7,
      playerId: "p1",
      authority: "postgres_snapshot"
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
        },
      worldStateAuthoritativeMutationExecutor:
        async (
          playerId,
          action,
          metadata
        ) => {
          executorCalls.push(
            "world:" +
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

  mutationRouter.register(
    "world_mutation",
    async () => {},
    {
      authRequired: true,
      mutation: true,
      worldStateAuthoritative: true
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

  await mutationRouter.dispatch({
    type: "world_mutation",
    msg: {
      type: "world_mutation"
    },
    ws,
    send
  });

  assert.deepStrictEqual(
    executorCalls,
    [
      "normal:p1",
      "pg:p1:pg_mutation",
      "world:p1:world_mutation"
    ]
  );

  const guardSent = [];
  let guardedHandlerCalls = 0;

  const worldMissingRouter =
    new RuntimeCommandRouter({
      name:
        "world-missing",
      logger: {
        error() {}
      },
      mutationExecutor:
        async (
          _playerId,
          action
        ) =>
          await action(),
      authoritativeMutationExecutor:
        async (
          _playerId,
          action
        ) =>
          await action()
    });

  worldMissingRouter.register(
    "world_guarded",
    async () => {
      guardedHandlerCalls += 1;
    },
    {
      authRequired: true,
      mutation: true,
      worldStateAuthoritative: true
    }
  );

  await worldMissingRouter.dispatch({
    type:
      "world_guarded",
    msg: {
      type:
        "world_guarded"
    },
    ws,
    send:
      (_ws, payload) =>
        guardSent.push(
          payload
        )
  });

  assert.strictEqual(
    guardedHandlerCalls,
    0,
    "World-state executor yoxdursa handler RAM fallback ilə işləməməlidir."
  );

  assert.strictEqual(
    guardSent.pop().code,
    "COMMAND_HANDLER_FAILED"
  );

  assert.strictEqual(
    worldMissingRouter
      .getMetrics()
      .world_guarded
      .failed,
    1
  );

  const pgMissingRouter =
    new RuntimeCommandRouter({
      name:
        "pg-missing",
      logger: {
        error() {}
      },
      mutationExecutor:
        async (
          _playerId,
          action
        ) =>
          await action()
    });

  pgMissingRouter.register(
    "pg_guarded",
    async () => {
      guardedHandlerCalls += 1;
    },
    {
      authRequired: true,
      mutation: true,
      postgresAuthoritative: true
    }
  );

  await pgMissingRouter.dispatch({
    type: "pg_guarded",
    msg: {
      type: "pg_guarded"
    },
    ws,
    send:
      (_ws, payload) =>
        guardSent.push(
          payload
        )
  });

  assert.strictEqual(
    guardedHandlerCalls,
    0
  );

  assert.strictEqual(
    guardSent.pop().code,
    "COMMAND_HANDLER_FAILED"
  );

  const mutationMissingRouter =
    new RuntimeCommandRouter({
      name:
        "mutation-missing",
      logger: {
        error() {}
      }
    });

  mutationMissingRouter.register(
    "normal_guarded",
    async () => {
      guardedHandlerCalls += 1;
    },
    {
      authRequired: true,
      mutation: true
    }
  );

  await mutationMissingRouter.dispatch({
    type:
      "normal_guarded",
    msg: {
      type:
        "normal_guarded"
    },
    ws,
    send:
      (_ws, payload) =>
        guardSent.push(
          payload
        )
  });

  assert.strictEqual(
    guardedHandlerCalls,
    0
  );

  assert.strictEqual(
    guardSent.pop().code,
    "COMMAND_HANDLER_FAILED"
  );

  assert.throws(
    () =>
      mutationMissingRouter.register(
        "invalid_authority",
        async () => {},
        {
          postgresAuthoritative: true
        }
      ),
    /mutation olmalidir/
  );

  assert.throws(
    () =>
      mutationMissingRouter.register(
        "ambiguous_authority",
        async () => {},
        {
          mutation: true,
          postgresAuthoritative: true,
          worldStateAuthoritative: true
        }
      ),
    /eyni anda/
  );

  console.log(
    "PASS: command router dispatch, auth guard, metrics, authoritative route selection and fail-closed executor guards."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
