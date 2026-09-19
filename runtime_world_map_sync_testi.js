"use strict";

const assert =
  require("assert");
const fs =
  require("fs");
const path =
  require("path");

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


  {
    const serverKod =
      fs.readFileSync(
        path.join(
          __dirname,
          "server.js"
        ),
        "utf8"
      );

    const basla =
      serverKod.indexOf(
        "async function pushStateToPlayerConnections"
      );

    const bitir =
      serverKod.indexOf(
        "//////////////////////////////////////////////////////////////////////",
        basla
      );

    assert.ok(
      basla >= 0 &&
      bitir > basla,
      "Player state push funksiyası tapılmalıdır."
    );

    const pushBloku =
      serverKod.slice(
        basla,
        bitir
      );

    assert.ok(
      pushBloku.includes(
        "buildStateLocalMapPayloadAuthoritative"
      ),
      "Cross-instance state refresh PostgreSQL-authoritative local map payload göndərməlidir."
    );

    assert.ok(
      !pushBloku.includes(
        "sendStateLocalMapToPlayer("
      ),
      "Cross-instance state refresh legacy RAM-only local map sender-ə düşməməlidir."
    );

    const senderBasla =
      serverKod.indexOf(
        "async function sendStateLocalMapToPlayer"
      );

    const senderBitir =
      serverKod.indexOf(
        "function sendWorldMapToPlayer",
        senderBasla
      );

    assert.ok(
      senderBasla >= 0 &&
      senderBitir > senderBasla,
      "Single-player local map sender tapılmalıdır."
    );

    const senderBloku =
      serverKod.slice(
        senderBasla,
        senderBitir
      );

    assert.ok(
      senderBloku.includes(
        "buildStateLocalMapPayloadAuthoritative"
      ),
      "Auth/login/build local map sender PostgreSQL-authoritative base catalog istifadə etməlidir."
    );

    assert.ok(
      !senderBloku.includes(
        "buildStateLocalMapPayload(stateId"
      ),
      "Single-player local map sender legacy RAM-only base kataloquna birbaşa düşməməlidir."
    );

    const worldSenderBasla =
      serverKod.indexOf(
        "async function sendWorldMapToPlayer"
      );

    const worldSenderBitir =
      serverKod.indexOf(
        "function pushStateLocalMapToStatePlayers",
        worldSenderBasla
      );

    assert.ok(
      worldSenderBasla >= 0 &&
      worldSenderBitir > worldSenderBasla,
      "Single-player world map sender tapılmalıdır."
    );

    const worldSenderBloku =
      serverKod.slice(
        worldSenderBasla,
        worldSenderBitir
      );

    assert.ok(
      worldSenderBloku.includes(
        "buildWorldMapPayloadForClientAuthoritative"
      ),
      "Auth/login/build world map sender PostgreSQL-authoritative metadata və player counts istifadə etməlidir."
    );

    assert.ok(
      !worldSenderBloku.includes(
        "buildWorldMapPayloadForClient()"
      ),
      "Single-player world map sender legacy RAM-only world snapshot-a düşməməlidir."
    );

    const worldBroadcastBasla =
      serverKod.indexOf(
        "async function pushWorldMapToAllAuthedPlayers"
      );

    const worldBroadcastBitir =
      serverKod.indexOf(
        "function makeClientState",
        worldBroadcastBasla
      );

    const worldBroadcastBloku =
      serverKod.slice(
        worldBroadcastBasla,
        worldBroadcastBitir
      );

    assert.ok(
      worldBroadcastBloku.includes(
        "buildWorldMapPayloadForClientAuthoritative"
      ),
      "Cross-instance center update broadcast authoritative world snapshot istifadə etməlidir."
    );

    const authoritativeBasla =
      serverKod.indexOf(
        "async function buildStateLocalMapPayloadAuthoritative"
      );

    const authoritativeBitir =
      serverKod.indexOf(
        "async function pushStateLocalMapToStatePlayersAuthoritative",
        authoritativeBasla
      );

    const authoritativeBloku =
      serverKod.slice(
        authoritativeBasla,
        authoritativeBitir
      );

    assert.ok(
      authoritativeBloku.includes(
        "PostgreSQL base catalog unavailable"
      ),
      "Authoritative local-map read DB xətasını ayrıca qeyd etməlidir."
    );

    assert.ok(
      authoritativeBloku.includes(
        "return null;"
      ),
      "PostgreSQL base catalog xətasında stale RAM local-map fallback göndərilməməlidir."
    );

    assert.ok(
      !authoritativeBloku.includes(
        "PostgreSQL base catalog fallback"
      ),
      "Legacy RAM fallback mesajı authoritative path-də qalmamalıdır."
    );
  }

  console.log(
    "PASS: world-map runtime sync broadcasts base refresh and center authority across instances."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
