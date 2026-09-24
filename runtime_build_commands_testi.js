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
  let legacyUnlockCalls = 0;

  const {
    verifiedLastShelterBuildingLevelDataAl
  } = require("./last_shelter_building_runtime_overlay");

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
        async (
          playerId,
          fn
        ) => {
          locks.push(
            playerId
          );
          return await fn();
        },
      authoritativeMutationExecutor:
        async (
          playerId,
          fn
        ) => {
          locks.push(
            playerId
          );

          const afterCommit = [];

          const result =
            await fn({
              send:
                (_ws, payload) => {
                  sent.push(
                    payload
                  );
                },
              deferAfterCommit:
                (callback) => {
                  if (
                    typeof callback ===
                      "function"
                  ) {
                    afterCommit.push(
                      callback
                    );
                  }

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
        (_state, buildingId) => {
          legacyUnlockCalls += 1;

          return buildingId === "testbuilding"
            ? { ok: true }
            : {
                ok: false,
                message: "legacy unlock must not gate mapped Last Shelter buildings"
              };
        },

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
        (buildingId, targetLevel) =>
          verifiedLastShelterBuildingLevelDataAl(
            buildingId,
            targetLevel
          ) || {
            buildingId,
            targetLevel,
            cost: []
          },

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
        buildingId: "testbuilding",
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

  assert.strictEqual(
    legacyUnlockCalls,
    1,
    "Unmapped RDC building must still use the compatibility unlock gate."
  );

  sent.length = 0;

  await router.dispatch({
    type: "build_request",
    msg: {
      type: "build_request",
      playerId: "p1",
      buildingId: "436000",
      x: 8,
      z: 8
    },
    ws,
    send,
    nowMs: () => 1100
  });

  assert.strictEqual(
    sent[0].code,
    "BUILDING_CONDITION_NOT_MET",
    "Numeric road placement must enforce original building.xml HQ prerequisite."
  );

  assert.strictEqual(
    legacyUnlockCalls,
    1,
    "Mapped Last Shelter placement must not call the legacy unlock gate."
  );

  state.buildings.push({
    instanceId: "hq-authoritative",
    buildingId: "400000",
    level: 1,
    isCompleted: true,
    buildFinishTimeMs: 0
  });

  sent.length = 0;

  await router.dispatch({
    type: "build_request",
    msg: {
      type: "build_request",
      playerId: "p1",
      buildingId: "436000",
      x: 8,
      z: 8
    },
    ws,
    send,
    nowMs: () => 1200
  });

  assert.strictEqual(
    sent[0].type,
    "build_placed"
  );

  assert.strictEqual(
    JSON.parse(sent[0].payloadJson).buildingId,
    "436000"
  );

  assert.strictEqual(
    legacyUnlockCalls,
    1,
    "Satisfied mapped placement remains authoritative and bypasses legacy unlock metadata."
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
