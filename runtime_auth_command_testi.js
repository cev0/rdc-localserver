"use strict";

const assert = require("assert");

const {
  RuntimeCommandRouter
} = require("./runtime_command_router");

const {
  authCommandiniQeydEt
} = require("./runtime_auth_command");

(async () => {
  const router =
    new RuntimeCommandRouter({
      name: "auth-test",
      logger: {
        error() {}
      }
    });

  const sent = [];
  const presence = [];
  const schedules = [];
  const mapCalls = [];

  const connections = {
    items: new Map(),

    set(playerId, ws) {
      this.items.set(
        playerId,
        ws
      );
    }
  };

  const runtimeBus = {
    async registerLocalPlayer(
      playerId
    ) {
      presence.push(playerId);
      return true;
    }
  };

  function getOrCreatePlayerState(
    playerId
  ) {
    return {
      playerId,
      serverTimeUnixMs: 0
    };
  }

  function updateServerTime(state) {
    state.serverTimeUnixMs =
      123;
  }

  authCommandiniQeydEt(
    router,
    {
      connections,
      runtimeBus,
      getOrCreatePlayerState,
      updateServerTime,
      schedulePlayerDeadline:
        (playerId) => {
          schedules.push(playerId);
        },
      makeClientState:
        state => ({
          playerId:
            state.playerId,
          serverTimeUnixMs:
            state.serverTimeUnixMs
        }),
      sendStateLocalMapToPlayer:
        (_ws, playerId) => {
          mapCalls.push(
            "local:" + playerId
          );
        },
      sendWorldMapToPlayer:
        (_ws, playerId) => {
          mapCalls.push(
            "world:" + playerId
          );
        }
    }
  );

  const ws = {
    _authedPlayerId: null
  };

  const send =
    (_ws, payload) => {
      sent.push(payload);
    };

  const handled =
    await router.dispatch({
      type: "auth",
      msg: {
        type: "auth",
        playerId: "player-123"
      },
      ws,
      send,
      nowMs: () => 999
    });

  assert.strictEqual(
    handled,
    true
  );

  assert.strictEqual(
    ws._authedPlayerId,
    "player-123"
  );

  assert.strictEqual(
    connections.items.get(
      "player-123"
    ),
    ws
  );

  assert.deepStrictEqual(
    presence,
    ["player-123"]
  );

  assert.deepStrictEqual(
    schedules,
    ["player-123"]
  );

  assert.deepStrictEqual(
    mapCalls,
    [
      "local:player-123",
      "world:player-123"
    ]
  );

  assert.strictEqual(
    sent.length,
    2
  );

  assert.deepStrictEqual(
    sent[0],
    {
      type: "ack",
      playerId: "player-123",
      serverTimeUnixMs: 999
    }
  );

  assert.strictEqual(
    sent[1].type,
    "state"
  );

  assert.deepStrictEqual(
    JSON.parse(
      sent[1].payloadJson
    ),
    {
      playerId: "player-123",
      serverTimeUnixMs: 123
    }
  );

  console.log(
    "PASS: auth command router handler preserves connection, presence, state and map flow."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
