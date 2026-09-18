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
  const sent = [];
  const localMapPushes = [];
  const worldPushes = [];

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

      pushStateToPlayerConnections() {},

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

      occupyStateCenter:
        () => ({
          ok: true,
          ownerPlayerId: "p1"
        }),

      pushWorldMapToAllAuthedPlayers:
        () => {
          worldPushes.push(true);
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

  assert.deepStrictEqual(
    localMapPushes,
    [1]
  );

  assert.strictEqual(
    worldPushes.length,
    1
  );

  assert.deepStrictEqual(
    authoritativeLocks,
    [
      "p1:expand_area_request",
      "p1:base_teleport_request"
    ],
    "Player-local map və legacy teleport PostgreSQL authoritative executor-dan keçməlidir."
  );

  assert.deepStrictEqual(
    locks,
    ["p1"],
    "Shared-world occupy route hələ ayrıca world metadata persistence tələb edir."
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
    "PASS: player-local map mutations use PostgreSQL authoritative routing; shared-world mutation stays separately locked."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
