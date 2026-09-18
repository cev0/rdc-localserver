"use strict";

const assert = require("assert");
const fs = require("fs");

const {
  RuntimeCommandRouter
} = require("./runtime_command_router");

const {
  buildCommandleriniQeydEt
} = require("./runtime_build_commands");

(async () => {
  const sent = [];
  const mapCalls = [];
  const locks = [];

  const state = {
    playerId: "p1",
    buildings: [],
    resources: {
      food: 1000
    }
  };

  const router =
    new RuntimeCommandRouter({
      name: "build-test",
      logger: {
        error() {}
      },
      mutationExecutor:
        async (playerId, fn) => {
          locks.push(playerId);
          return await fn();
        }
    });

  buildCommandleriniQeydEt(
    router,
    {
      getOrCreatePlayerState:
        () => state,

      normalizeBuildingId:
        value =>
          String(value || "")
            .trim()
            .toLowerCase(),

      removeRoadAtCell:
        () => ({ ok: true }),

      checkUnlockRequirements:
        () => ({ ok: true }),

      countPlacedBuildingsOfType:
        () => 0,

      getMaxPlacedCountForBuilding:
        () => 10,

      getAllowedPlacedCountForBuilding:
        () => 10,

      getNextUnlockCountRequirement:
        () => null,

      hasUnfinishedBuildingOfSameType:
        () => false,

      canPlaceBuilding:
        () => true,

      isGarageBuildingId:
        () => false,

      getLevelData:
        () => ({
          cost: []
        }),

      hasEnoughResources:
        () => ({
          ok: true
        }),

      spendResources() {},

      placeBuildingWithoutStarting:
        (_state, buildingId, x, z) => {
          const building = {
            instanceId: "b1",
            buildingId,
            x,
            z,
            level: 1,
            isCompleted: false,
            buildFinishTimeMs: 0
          };

          state.buildings.push(
            building
          );

          return building;
        },

      syncResourceSlotOccupancy() {},
      refreshRoadAccessForBuildings() {},
      refreshBuilderCapacity() {},

      makeClientState:
        target => ({
          playerId: target.playerId,
          buildings:
            target.buildings
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
    _authedPlayerId: "p1"
  };

  const send =
    (_ws, payload) => {
      sent.push(payload);
    };

  const handled =
    await router.dispatch({
      type: "build_request",
      msg: {
        type: "build_request",
        playerId: "p1",
        buildingId: "farm",
        x: 4,
        z: 6
      },
      ws,
      send,
      nowMs: () => 1000
    });

  assert.strictEqual(
    handled,
    true
  );

  assert.deepStrictEqual(
    locks,
    ["p1"]
  );

  assert.strictEqual(
    state.buildings.length,
    1
  );

  assert.strictEqual(
    sent[0].type,
    "build_placed"
  );

  assert.strictEqual(
    sent[1].type,
    "state"
  );

  assert.deepStrictEqual(
    mapCalls,
    [
      "local:p1",
      "world:p1"
    ]
  );

  const serverCode =
    fs.readFileSync(
      require.resolve("./server.js"),
      "utf8"
    );

  assert.ok(
    !serverCode.includes(
      'case "build_request"'
    ),
    "build_request legacy switch-de qalmamalidir."
  );

  const extensionCode =
    fs.readFileSync(
      require.resolve(
        "./server_missiya_genisletme_v2.js"
      ),
      "utf8"
    );

  assert.ok(
    !extensionCode.includes(
      '  "build_request",'
    ),
    "build_request outer legacy mutex set-de qalmamalidir."
  );

  console.log(
    "PASS: build_request is routed, locked and removed from legacy switch."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
