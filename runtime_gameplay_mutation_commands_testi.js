"use strict";

const assert = require("assert");
const fs = require("fs");

const {
  RuntimeCommandRouter
} = require("./runtime_command_router");

const {
  gameplayMutationCommandleriniQeydEt
} = require("./runtime_gameplay_mutation_commands");

(async () => {
  const sent = [];
  const lockCalls = [];
  const deadlines = [];

  const state = {
    playerId: "p1",
    technology: {
      currentResearch: null
    },
    buildings: [
      {
        instanceId: "institute-1",
        buildingId: "institute",
        isCompleted: true,
        hasRoadAccess: true
      }
    ],
    builders: {
      jobs: []
    },
    army: {
      troops: {},
      trainingQueues: {}
    },
    resources: {
      food: 1000
    }
  };

  const router =
    new RuntimeCommandRouter({
      name: "mutation-test",
      logger: {
        error() {}
      },
      mutationExecutor:
        async (playerId, fn) => {
          lockCalls.push(playerId);
          return await fn();
        }
    });

  const deps = {
    getOrCreatePlayerState:
      () => state,

    normalizeBuildingId:
      value =>
        String(value || "")
          .trim()
          .toLowerCase(),

    ensureTechnologyObject:
      target => {
        target.technology =
          target.technology || {
            currentResearch: null
          };
      },

    startTechnologyResearch:
      (target, techId) => {
        const research = {
          techId,
          targetLevel: 2,
          startedAtMs: 100,
          durationMs: 5000,
          endsAtMs: 5100
        };

        target.technology.currentResearch =
          research;

        return {
          ok: true,
          research
        };
      },

    refreshTechnologyStats() {},
    updateServerTime() {},

    schedulePlayerDeadline:
      (playerId) => {
        deadlines.push(playerId);
      },

    makeClientState:
      target => ({
        playerId: target.playerId
      }),

    hasFreeBuilder:
      () => true,

    isGarageBuildingId:
      () => false,

    getLevelData:
      () => ({
        cost: [],
        buildTimeSeconds: 1
      }),

    hasEnoughResources:
      () => ({
        ok: true
      }),

    spendResources() {},

    getBuilderSlotsRequiredForBuilding:
      () => 1,

    refreshBuilderCapacity() {},

    getAdjustedTrainingDurationMs:
      (_target, duration) =>
        duration,

    isUpgradeDisabledBuildingId:
      () => false,

    getMaxLevelForBuilding:
      () => 10,

    createUpgradeJob:
      () => ({
        jobId: "job-1",
        targetLevel: 2,
        endsAtMs: 2000,
        durationMs: 1000
      })
  };

  gameplayMutationCommandleriniQeydEt(
    router,
    deps
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
      type:
        "technology_research_start",
      msg: {
        type:
          "technology_research_start",
        playerId: "p1",
        techId: "production_1"
      },
      ws,
      send,
      nowMs: () => 100
    });

  assert.strictEqual(
    handled,
    true
  );

  assert.deepStrictEqual(
    lockCalls,
    ["p1"]
  );

  assert.deepStrictEqual(
    deadlines,
    [],
    "PostgreSQL-authoritative route deadline-i handler daxilinde commit-den evvel schedule etmemelidir."
  );

  assert.strictEqual(
    sent[0].type,
    "technology_research_started"
  );

  assert.strictEqual(
    sent[1].type,
    "state"
  );

  sent.length = 0;

  await router.dispatch({
    type: "upgrade_request",
    msg: {
      type: "upgrade_request",
      playerId: "other",
      buildingInstanceId:
        "institute-1"
    },
    ws,
    send,
    nowMs: () => 200
  });

  assert.strictEqual(
    sent[0].code,
    "PLAYER_ID_MISMATCH"
  );

  assert.strictEqual(
    lockCalls.length,
    2,
    "Mutation command mismatch olsa bele router mutex daxilinde emal olunur."
  );

  const legacyServerCode =
    fs.readFileSync(
      require.resolve("./server.js"),
      "utf8"
    );

  for (const type of [
    "research_start",
    "technology_research_start",
    "start_construction_request",
    "train_unit_request",
    "upgrade_request"
  ]) {
    assert.ok(
      !legacyServerCode.includes(
        'case "' + type + '"'
      ),
      "Migrasiya olunmus case legacy switch-de qalmamalidir: " +
        type
    );
  }

  const extensionCode =
    fs.readFileSync(
      require.resolve(
        "./server_missiya_genisletme_v2.js"
      ),
      "utf8"
    );

  for (const type of [
    "research_start",
    "technology_research_start",
    "start_construction_request",
    "train_unit_request",
    "upgrade_request"
  ]) {
    const setLine =
      '  "' + type + '",';

    assert.ok(
      !extensionCode.includes(setLine),
      "Router-in oz mutex-i olan command outer legacy mutex set-de qalmamalidir: " +
        type
    );
  }

  console.log(
    "PASS: routed gameplay mutations use one authoritative mutex and legacy cases are removed."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
