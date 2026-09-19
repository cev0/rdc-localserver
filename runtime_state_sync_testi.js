"use strict";

const assert =
  require("assert");

const {
  RUNTIME_STATE_INVALIDATION_TYPE,
  runtimeStateInvalidationPayloadYarat,
  runtimeStateInvalidationPayloadidir,
  runtimeStateSyncControllerYarat
} = require("./runtime_state_sync");

(async () => {
  const states =
    new Map([
      [
        "p1",
        {
          playerId: "p1",
          marker: "old"
        }
      ]
    ]);

  const locks = [];
  const stale = [];
  const restores = [];
  const schedules = [];
  const pushes = [];
  const published = [];

  const controller =
    runtimeStateSyncControllerYarat({
      getOrCreatePlayerState:
        playerId => {
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

      updateServerTime:
        state => {
          state.serverTimeUnixMs =
            999;
        },

      withPlayerLock:
        async (
          playerId,
          operation
        ) => {
          locks.push(
            playerId
          );

          return await operation();
        },

      hasLocalPlayer:
        playerId =>
          playerId === "p1",

      markStaleFn:
        playerId => {
          stale.push(
            playerId
          );
          return true;
        },

      restorePlayerStateFn:
        async (
          context,
          playerId,
          options
        ) => {
          restores.push({
            playerId,
            force:
              options &&
              options.force === true
          });

          const state =
            context
              .getOrCreatePlayerState(
                playerId
              );

          state.marker =
            "db-latest";

          if (
            context.updateServerTime
          ) {
            context.updateServerTime(
              state
            );
          }

          return true;
        },

      schedulePlayerDeadline:
        (playerId) => {
          schedules.push(
            playerId
          );
        },

      pushStateToPlayerConnections:
        (playerId, state) => {
          pushes.push({
            playerId,
            marker:
              state.marker
          });
        },

      logger: {
        error() {}
      }
    });

  const payload =
    runtimeStateInvalidationPayloadYarat(
      "p1",
      {
        type:
          "build_start",
        committedAtMs:
          1234
      }
    );

  assert.strictEqual(
    payload.type,
    RUNTIME_STATE_INVALIDATION_TYPE
  );

  assert.strictEqual(
    payload.reason,
    "build_start"
  );

  assert.strictEqual(
    payload.committedAtMs,
    1234
  );

  assert.strictEqual(
    runtimeStateInvalidationPayloadidir(
      payload
    ),
    true
  );

  assert.strictEqual(
    runtimeStateInvalidationPayloadidir(
      {
        type: "state"
      }
    ),
    false
  );

  const handled =
    await controller
      .handleDirect({
        playerId: "p1",
        payload
      });

  assert.strictEqual(
    handled,
    true
  );

  assert.deepStrictEqual(
    stale,
    [
      "p1",
      "p1"
    ],
    "Direct invalidation state-i dərhal stale edir və force refresh bunu təsdiqləyir."
  );

  assert.deepStrictEqual(
    locks,
    [
      "p1"
    ]
  );

  assert.deepStrictEqual(
    restores,
    [
      {
        playerId: "p1",
        force: true
      }
    ]
  );

  assert.strictEqual(
    states.get("p1").marker,
    "db-latest"
  );

  assert.strictEqual(
    states.get("p1")
      .serverTimeUnixMs,
    999
  );

  assert.deepStrictEqual(
    schedules,
    [
      "p1"
    ]
  );

  assert.deepStrictEqual(
    pushes,
    [
      {
        playerId: "p1",
        marker: "db-latest"
      }
    ]
  );

  assert.strictEqual(
    await controller
      .handleDirect({
        playerId: "p1",
        payload: {
          type:
            "ordinary_client_payload"
        }
      }),
    false
  );

  assert.strictEqual(
    await controller
      .handleDirect({
        playerId: "offline",
        payload:
          runtimeStateInvalidationPayloadYarat(
            "offline"
          )
      }),
    true
  );

  assert.ok(
    stale.includes(
      "offline"
    )
  );

  assert.strictEqual(
    restores.length,
    1,
    "Local connection olmayan player üçün lazımsız DB refresh edilməməlidir."
  );

  const runtimeBus = {
    async publishToPlayer(
      playerId,
      outgoing
    ) {
      published.push({
        playerId,
        outgoing
      });

      return true;
    }
  };

  assert.strictEqual(
    await controller
      .publishInvalidation(
        runtimeBus,
        "p1",
        {
          type:
            "teleport"
        }
      ),
    true
  );

  assert.strictEqual(
    published.length,
    1
  );

  assert.strictEqual(
    published[0].playerId,
    "p1"
  );

  assert.strictEqual(
    published[0].outgoing.type,
    RUNTIME_STATE_INVALIDATION_TYPE
  );

  console.log(
    "PASS: runtime state sync invalidates remote RAM, refreshes under player lock and suppresses client delivery."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
