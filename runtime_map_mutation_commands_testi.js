"use strict";

const assert = require("assert");
const fs = require("fs");

const {
  RuntimeCommandRouter
} = require("./runtime_command_router");

const {
  mapMutationCommandleriniQeydEt
} = require("./runtime_map_mutation_commands");

(async () => {
  const locks = [];
  const authoritativeLocks = [];
  const worldAuthoritativeLocks = [];
  const sent = [];
  const localMapPushes = [];
  const statePushes = [];
  const worldPushes = [];
  const stateMapBroadcasts = [];
  const centerBroadcasts = [];

  const state = {
    playerId: "p1",
    map: {
      unlockedMinX: 0,
      unlockedMaxX: 7,
      unlockedMinZ: 0,
      unlockedMaxZ: 7,
      unlockedBlocks: ["0,0"]
    },
    buildings: [],
    worldPlacement: {
      stateId: 1
    }
  };

  const router =
    new RuntimeCommandRouter({
      name: "map-mutation-test",
      logger: {
        error() {}
      },
      mutationExecutor:
        async (playerId, fn) => {
          locks.push(playerId);
          return await fn();
        },
      authoritativeMutationExecutor:
        async (
          playerId,
          fn,
          metadata
        ) => {
          authoritativeLocks.push(
            playerId + ":" +
            metadata.type
          );

          const afterCommit = [];

          const result =
            await fn({
              send:
                (_ws, payload) => {
                  sent.push(payload);
                },
              transactionContext: {
                client: {
                  async query() {
                    return {
                      rows: []
                    };
                  }
                }
              },
              deferAfterCommit:
                (callback) => {
                  afterCommit.push(
                    callback
                  );
                  return true;
                }
            });

          for (
            const callback of
            afterCommit
          ) {
            await callback();
          }

          return result;
        },
      worldStateAuthoritativeMutationExecutor:
        async (
          playerId,
          fn,
          metadata
        ) => {
          worldAuthoritativeLocks.push(
            playerId + ":" +
            metadata.type
          );

          const afterCommit = [];

          const result =
            await fn({
              send:
                (_ws, payload) => {
                  sent.push(payload);
                },
              transactionContext: {
                client: {
                  async query() {
                    return {
                      rows: []
                    };
                  }
                },
                stateId: 1,
                worldStateLockHeld: true
              },
              deferAfterCommit:
                (callback) => {
                  afterCommit.push(
                    callback
                  );
                  return true;
                }
            });

          for (
            const callback of
            afterCommit
          ) {
            await callback();
          }

          return result;
        }
    });

  mapMutationCommandleriniQeydEt(
    router,
    {
      getOrCreatePlayerState:
        () => state,

      ensureMapState() {},

      expandUnlockedArea:
        (target, direction) => {
          target.map.unlockedBlocks.push(
            direction
          );
          return true;
        },

      updateServerTime() {},

      makeClientState:
        target => ({
          playerId: target.playerId,
          map: target.map
        }),

      normalizeBuildingId:
        value =>
          String(value || "")
            .trim()
            .toLowerCase(),

      refreshRoadAccessForBuildings() {},

      findRoadPathAStar:
        () => [{ x: 1, z: 1 }],

      createRoadsAlongPath:
        () => [{ id: "road-1" }],

      async pushStateToPlayerConnections(
        playerId
      ) {
        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              5
            )
        );

        statePushes.push(
          playerId
        );
      },

      teleportPlayerBaseInsideState:
        () => ({
          ok: true,
          ignored: false,
          stateId: 1,
          baseX: 10,
          baseZ: 20,
          zone: "outer"
        }),

      applyPlayerBaseTeleportInsideState:
        (
          target,
          _playerId,
          x,
          z
        ) => {
          target.worldPlacement.baseX =
            x;
          target.worldPlacement.baseZ =
            z;

          return {
            ok: true,
            ignored: false,
            stateId: 1,
            baseX: x,
            baseZ: z,
            zone: "outer"
          };
        },

      pushStateLocalMapToStatePlayers:
        stateId => {
          localMapPushes.push(stateId);
        },

      canMoveThisBuilding:
        () => true,

      canMoveBuilding:
        () => true,

      syncResourceSlotOccupancy() {},

      getWorldStateRuntime:
        stateId => ({
          stateId,
          localMap: {
            width: 1024,
            height: 1024,
            centerX: 512,
            centerZ: 512
          },
          centerBuilding: {
            x: 512,
            z: 512
          },
          playerIds: [
            "p1"
          ]
        }),

      dovletBazalariniBirbasaPostgresdenAlClient:
        async () => ({
          bases: [
            {
              playerId: "p1",
              baseX: 1,
              baseZ: 1
            }
          ]
        }),

      dovletBazaKeshiniTemizle() {},

      occupyStateCenterPostgresClient:
        async (
          _client,
          options
        ) => ({
          success: true,
          stateId:
            options.stateId,
          occupiedByPlayerId:
            options.playerId,
          occupiedByAllianceId:
            options.allianceId || "",
          occupiedAtMs:
            options.nowMs,
          centerUnlockAtMs: 0,
          revision: 1
        }),

      pushWorldMapToAllAuthedPlayers:
        () => {
          worldPushes.push(true);
        },

      publishStateMapRefresh:
        async (
          stateId,
          reason
        ) => {
          stateMapBroadcasts.push({
            stateId,
            reason
          });

          return true;
        },

      publishCenterUpdate:
        async (
          stateId,
          result
        ) => {
          centerBroadcasts.push({
            stateId,
            playerId:
              result.occupiedByPlayerId
          });

          return true;
        }
    }
  );

  const ws = {
    _authedPlayerId: "p1"
  };

  const send =
    (_ws, payload) => {
      sent.push(payload);
    };

  await router.dispatch({
    type: "expand_area_request",
    msg: {
      type: "expand_area_request",
      playerId: "p1",
      direction: "right"
    },
    ws,
    send,
    nowMs: () => 100
  });

  assert.strictEqual(
    sent[0].type,
    "area_expanded"
  );

  assert.strictEqual(
    sent[1].type,
    "state"
  );

  assert.deepStrictEqual(
    statePushes,
    ["p1"],
    "Post-commit area expansion authoritative player push tamamlanana qədər gözləməlidir."
  );

  sent.length = 0;

  await router.dispatch({
    type: "base_teleport_request",
    msg: {
      type: "base_teleport_request",
      playerId: "p1",
      x: 100,
      z: 100
    },
    ws,
    send,
    nowMs: () => 150
  });

  assert.strictEqual(
    sent[0].type,
    "base_teleported"
  );

  assert.strictEqual(
    state.worldPlacement.baseX,
    100
  );

  assert.strictEqual(
    state.worldPlacement.baseZ,
    100
  );

  assert.deepStrictEqual(
    statePushes,
    ["p1", "p1"],
    "Teleport post-commit ardıcıllığı authoritative player push-u tamamlamadan map broadcast-a keçməməlidir."
  );

  sent.length = 0;

  await router.dispatch({
    type: "occupy_state_center_request",
    msg: {
      type: "occupy_state_center_request",
      playerId: "p1",
      stateId: 1
    },
    ws,
    send,
    nowMs: () => 200
  });

  assert.strictEqual(
    sent[0].type,
    "state_center_occupied"
  );

  assert.strictEqual(
    state.worldPlacement.stateId,
    1
  );

  assert.deepStrictEqual(
    localMapPushes,
    [1, 1],
    "Committed legacy teleport və persistent center occupation local map push etməlidir."
  );

  assert.strictEqual(
    worldPushes.length,
    1,
    "Persistent center occupation committed olduqdan sonra world map broadcast etməlidir."
  );

  assert.deepStrictEqual(
    stateMapBroadcasts,
    [
      {
        stateId: 1,
        reason:
          "base_teleport"
      }
    ],
    "Committed base teleport digər server instanslarına State map refresh göndərməlidir."
  );

  assert.deepStrictEqual(
    centerBroadcasts,
    [
      {
        stateId: 1,
        playerId: "p1"
      }
    ],
    "Persistent center occupation digər server instanslarına center update göndərməlidir."
  );

  assert.deepStrictEqual(
    authoritativeLocks,
    [
      "p1:expand_area_request"
    ],
    "Player-local map mutation player PostgreSQL authoritative executor-da qalmalıdır."
  );

  assert.deepStrictEqual(
    worldAuthoritativeLocks,
    [
      "p1:base_teleport_request",
      "p1:occupy_state_center_request"
    ],
    "Shared-world teleport və state center Dövlət-first PostgreSQL executor-dan keçməlidir."
  );

  assert.deepStrictEqual(
    locks,
    [],
    "Bu testdə yoxlanan mutasiyalar fallback RAM-only executor-a düşməməlidir."
  );

  const serverCode =
    fs.readFileSync(
      require.resolve("./server.js"),
      "utf8"
    );

  for (const type of [
    "expand_area_request",
    "connect_road_request",
    "expand_base",
    "base_teleport_request",
    "move_request",
    "occupy_state_center_request"
  ]) {
    assert.ok(
      !serverCode.includes(
        'case "' + type + '"'
      ),
      "Map mutation legacy switch-de qalmamalidir: " +
        type
    );
  }

  console.log(
    "PASS: player-local map mutations stay player-authoritative while teleport/state-center use State-first PostgreSQL and cross-instance map sync."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
