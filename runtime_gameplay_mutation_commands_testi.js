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
  let levelDataOverride = null;
  let buildingSpendCalls = 0;
  let upgradeJobCalls = 0;

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
        async (
          playerId,
          fn
        ) => {
          lockCalls.push(
            playerId
          );
          return await fn();
        },
      authoritativeMutationExecutor:
        async (
          playerId,
          fn
        ) => {
          lockCalls.push(
            playerId
          );

          const afterCommit = [];

          const result =
            await fn({
              send:
                (_ws, payload) => {
                  sent.push(payload);
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
      () =>
        levelDataOverride || {
          cost: [],
          buildTimeSeconds: 1
        },

    hasEnoughResources:
      () => ({
        ok: true
      }),

    spendResources() {
      buildingSpendCalls += 1;
    },

    getBuilderSlotsRequiredForBuilding:
      () => 1,

    refreshBuilderCapacity() {},

    isUpgradeDisabledBuildingId:
      () => false,

    getMaxLevelForBuilding:
      () => 10,

    createUpgradeJob:
      () => {
        upgradeJobCalls += 1;
        return {
          jobId: "job-1",
          targetLevel: 2,
          endsAtMs: 2000,
          durationMs: 1000
        };
      }
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

  sent.length = 0;
  deadlines.length = 0;

  state.buildings.push({
    instanceId: "fighter-camp-1",
    buildingId: "fighter_camp",
    level: 1,
    isCompleted: true,
    hasRoadAccess: true
  });

  await router.dispatch({
    type: "train_unit_request",
    msg: {
      type: "train_unit_request",
      playerId: "p1",
      buildingInstanceId:
        "fighter-camp-1",
      unitId: "fighter_lv1",
      count: 10
    },
    ws,
    send,
    nowMs: () => 300
  });

  assert.strictEqual(
    sent[0].type,
    "train_started"
  );

  assert.strictEqual(
    sent[1].type,
    "state"
  );

  const startedQueue =
    JSON.parse(
      sent[0].payloadJson
    );

  assert.strictEqual(
    startedQueue.unitId,
    "warrior_t1",
    "Legacy fighter_lv1 alias əsas troop kataloqunun canonical unitId-sinə çevrilməlidir."
  );

  assert.strictEqual(
    state.resources.food,
    390,
    "Direct server fallback troop kataloqu Last Shelter warrior_t1 üçün 61 food/vahid server-side training xərcini tətbiq etməlidir."
  );

  sent.length = 0;
  levelDataOverride = {
    source:
      "last_shelter_verified_level_gap",
    unavailable: true,
    targetLevel: 6,
    cost: []
  };

  state.buildings.push({
    instanceId: "hq-1",
    buildingId: "hq",
    level: 5,
    isCompleted: true,
    hasRoadAccess: true
  });

  await router.dispatch({
    type: "upgrade_request",
    msg: {
      type: "upgrade_request",
      playerId: "p1",
      buildingInstanceId: "hq-1"
    },
    ws,
    send,
    nowMs: () => 400
  });

  assert.strictEqual(
    sent[0].code,
    "BUILDING_LEVEL_REFERENCE_INCOMPLETE"
  );
  assert.strictEqual(
    buildingSpendCalls,
    0,
    "Verified level gap zamanı resurs çıxılmamalıdır."
  );
  assert.strictEqual(
    upgradeJobCalls,
    0,
    "Verified level gap zamanı upgrade job yaranmamalıdır."
  );

  levelDataOverride = null;

  const routedCode =
    fs.readFileSync(
      require.resolve(
        "./runtime_gameplay_mutation_commands.js"
      ),
      "utf8"
    );

  assert.ok(
    routedCode.includes(
      "qosunTeliminiBaslat"
    ),
    "Direct runtime route əsas troop training sisteminə delegate etməlidir."
  );

  assert.ok(
    !routedCode.includes(
      "count * 5000"
    ),
    "Troop training üçün ayrıca 5 saniyəlik legacy formula qalmamalıdır."
  );

  assert.deepStrictEqual(
    deadlines,
    ["p1"],
    "Training deadline yalnız authoritative action tamamlandıqdan sonra schedule edilməlidir."
  );

  assert.strictEqual(
    lockCalls.length,
    3,
    "Training request PostgreSQL-authoritative executor-dan keçməlidir."
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
