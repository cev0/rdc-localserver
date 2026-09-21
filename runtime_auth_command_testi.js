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
  const freshCalls = [];
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
      ensureFreshPlayerState:
        async (playerId) => {
          freshCalls.push(
            playerId
          );

          return getOrCreatePlayerState(
            playerId
          );
        },
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
      makeLastShelterResourcePayload:
        (_state, atTimeMs) => ({
          food: 1000,
          db_timezone_offset:
            Math.trunc(atTimeMs / 1000)
        }),
      makeLastShelterInitPayload:
        (state, playerId) => ({
          user: {
            uid: playerId
          },
          serverTimeUnixMs:
            state.serverTimeUnixMs,
          activity: [
            { id: "57002" }
          ]
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
    freshCalls,
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
    4
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

  assert.strictEqual(
    sent[2].type,
    "SynUserResource"
  );
  assert.strictEqual(
    sent[2].playerId,
    "player-123"
  );
  assert.deepStrictEqual(
    sent[2].payload,
    {
      food: 1000,
      db_timezone_offset: 0
    }
  );
  assert.deepStrictEqual(
    JSON.parse(
      sent[2].payloadJson
    ),
    sent[2].payload
  );

  assert.strictEqual(
    sent[3].type,
    "last_shelter.init"
  );
  assert.strictEqual(
    sent[3].playerId,
    "player-123"
  );
  assert.deepStrictEqual(
    sent[3].payload,
    {
      user: {
        uid: "player-123"
      },
      serverTimeUnixMs: 123,
      activity: [
        { id: "57002" }
      ]
    }
  );
  assert.deepStrictEqual(
    JSON.parse(
      sent[3].payloadJson
    ),
    sent[3].payload
  );

  console.log(
    "PASS: auth command router handler preserves connection, presence, state and map flow."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
