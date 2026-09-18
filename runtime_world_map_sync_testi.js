"use strict";

const assert =
  require("assert");

const {
  RUNTIME_STATE_MAP_REFRESH_TYPE,
  RUNTIME_STATE_CENTER_UPDATE_TYPE,
  RUNTIME_STATE_DYNAMIC_REFRESH_TYPE,
  centerUpdateTetbiqEt,
  runtimeWorldMapSyncControllerYarat
} = require("./runtime_world_map_sync");

(async () => {
  const runtime = {
    stateId: 7,
    centerUnlockAtMs: 5000,
    centerBuilding: {
      unlockAtMs: 5000,
      isUnlocked: false,
      occupiedByPlayerId: null,
      occupiedByAllianceId: null,
      occupiedAtMs: 0
    },
    presidentPlayerId: null,
    presidentAllianceId: null
  };

  assert.strictEqual(
    centerUpdateTetbiqEt(
      runtime,
      {
        occupiedByPlayerId:
          "p1",
        occupiedByAllianceId:
          "a1",
        occupiedAtMs: 6000,
        centerUnlockAtMs: 5000
      },
      7000
    ),
    true
  );

  assert.strictEqual(
    runtime.centerBuilding
      .occupiedByPlayerId,
    "p1"
  );

  assert.strictEqual(
    runtime.centerBuilding
      .occupiedByAllianceId,
    "a1"
  );

  assert.strictEqual(
    runtime.centerBuilding
      .isUnlocked,
    true
  );

  assert.strictEqual(
    runtime.presidentPlayerId,
    "p1"
  );

  const cacheClears = [];
  const statePushes = [];
  const dynamicPushes = [];
  let worldPushes = 0;
  const published = [];

  const controller =
    runtimeWorldMapSyncControllerYarat({
      getWorldStateRuntime:
        stateId =>
          stateId === 7
            ? runtime
            : null,

      clearBaseCache:
        stateId =>
          cacheClears.push(
            stateId
          ),

      pushStateLocalMap:
        async stateId =>
          statePushes.push(
            stateId
          ),

      pushWorldMap:
        async () => {
          worldPushes += 1;
        },

      pushDynamicMap:
        async stateId => {
          dynamicPushes.push(
            stateId
          );
        },

      nowMs:
        () => 9000,

      logger: {
        error() {}
      }
    });

  const runtimeBus = {
    async publishBroadcast(
      scope,
      targetId,
      payload
    ) {
      published.push({
        scope,
        targetId,
        payload
      });

      return true;
    }
  };

  assert.strictEqual(
    await controller.publishBaseRefresh(
      runtimeBus,
      7,
      "teleport"
    ),
    true
  );

  assert.deepStrictEqual(
    published[0],
    {
      scope: "world-state",
      targetId: "7",
      payload: {
        type:
          RUNTIME_STATE_MAP_REFRESH_TYPE,
        reason: "teleport",
        committedAtMs: 9000
      }
    }
  );

  await controller.handleBroadcast({
    scope: "world-state",
    targetId: "7",
    payload:
      published[0].payload
  });

  assert.deepStrictEqual(
    cacheClears,
    [7]
  );

  assert.deepStrictEqual(
    statePushes,
    [7]
  );

  assert.strictEqual(
    worldPushes,
    0
  );

  assert.strictEqual(
    await controller.publishDynamicRefresh(
      runtimeBus,
      7,
      "convoy_start"
    ),
    true
  );

  assert.strictEqual(
    published[1].payload.type,
    RUNTIME_STATE_DYNAMIC_REFRESH_TYPE
  );

  assert.strictEqual(
    published[1].payload.reason,
    "convoy_start"
  );

  await controller.handleBroadcast({
    scope: "world-state",
    targetId: "7",
    payload:
      published[1].payload
  });

  assert.deepStrictEqual(
    dynamicPushes,
    [7]
  );

  assert.strictEqual(
    await controller.publishCenterUpdate(
      runtimeBus,
      7,
      {
        occupiedByPlayerId:
          "p2",
        occupiedByAllianceId:
          "a2",
        occupiedAtMs:
          10000,
        centerUnlockAtMs:
          5000,
        revision:
          3
      }
    ),
    true
  );

  assert.strictEqual(
    published[2].payload.type,
    RUNTIME_STATE_CENTER_UPDATE_TYPE
  );

  await controller.handleBroadcast({
    scope: "world-state",
    targetId: "7",
    payload:
      published[2].payload
  });

  assert.strictEqual(
    runtime.presidentPlayerId,
    "p2"
  );

  assert.strictEqual(
    runtime.presidentAllianceId,
    "a2"
  );

  assert.deepStrictEqual(
    statePushes,
    [7, 7]
  );

  assert.strictEqual(
    worldPushes,
    1
  );

  assert.strictEqual(
    await controller.handleBroadcast({
      scope: "state",
      targetId: "7",
      payload: {
        type: "unrelated"
      }
    }),
    false
  );

  console.log(
    "PASS: world-map runtime sync broadcasts base refresh and center authority across instances."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
