"use strict";

const crypto = require("crypto");
const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");

function errorGonder(send, ws, message, code) {
  send(ws, {
    type: "error",
    ...(code ? { code } : {}),
    message
  });
}

function gameplayMutationCommandleriniQeydEt(
  router,
  deps
) {
  if (!router) {
    throw new Error("Command router yoxdur.");
  }

  const {
    getOrCreatePlayerState,
    normalizeBuildingId,
    ensureTechnologyObject,
    startTechnologyResearch,
    refreshTechnologyStats,
    updateServerTime,
    schedulePlayerDeadline,
    makeClientState,
    hasFreeBuilder,
    isGarageBuildingId,
    getLevelData,
    hasEnoughResources,
    spendResources,
    getBuilderSlotsRequiredForBuilding,
    refreshBuilderCapacity,
    getAdjustedTrainingDurationMs,
    isUpgradeDisabledBuildingId,
    getMaxLevelForBuilding,
    createUpgradeJob
  } = deps || {};

  const requiredFns = {
    getOrCreatePlayerState,
    normalizeBuildingId,
    ensureTechnologyObject,
    startTechnologyResearch,
    refreshTechnologyStats,
    updateServerTime,
    schedulePlayerDeadline,
    makeClientState,
    hasFreeBuilder,
    isGarageBuildingId,
    getLevelData,
    hasEnoughResources,
    spendResources,
    getBuilderSlotsRequiredForBuilding,
    refreshBuilderCapacity,
    getAdjustedTrainingDurationMs,
    isUpgradeDisabledBuildingId,
    getMaxLevelForBuilding,
    createUpgradeJob
  };

  for (const [name, fn] of Object.entries(requiredFns)) {
    if (typeof fn !== "function") {
      throw new Error(
        "Gameplay mutation dependency yoxdur: " + name
      );
    }
  }

  router.register(
    "research_start",
    async ({ ws, msg, send, nowMs }) => {
      const authCheck =
        playerIdUyugunluqYoxla(msg, ws);

      if (!authCheck.ok) {
        errorGonder(
          send,
          ws,
          authCheck.message,
          authCheck.message === "Player ID mismatch"
            ? "PLAYER_ID_MISMATCH"
            : "NOT_AUTHED"
        );
        return;
      }

      const playerId = authCheck.playerId;
      const buildingInstanceId =
        typeof msg.buildingInstanceId === "string"
          ? msg.buildingInstanceId.trim()
          : "";
      const techId =
        typeof msg.techId === "string"
          ? msg.techId.trim()
          : "";

      if (!buildingInstanceId) {
        errorGonder(send, ws, "Missing buildingInstanceId");
        return;
      }

      if (!techId) {
        errorGonder(send, ws, "Missing techId");
        return;
      }

      const state =
        getOrCreatePlayerState(playerId);

      ensureTechnologyObject(state);

      const institute =
        Array.isArray(state.buildings)
          ? state.buildings.find(
              b =>
                b &&
                b.instanceId === buildingInstanceId &&
                normalizeBuildingId(b.buildingId) === "institute"
            )
          : null;

      if (!institute) {
        errorGonder(send, ws, "Institute building not found");
        return;
      }

      if (!institute.isCompleted) {
        errorGonder(send, ws, "Institute is not completed yet");
        return;
      }

      if (institute.hasRoadAccess === false) {
        errorGonder(send, ws, "Institute must be road connected");
        return;
      }

      const started =
        startTechnologyResearch(
          state,
          techId
        );

      if (!started || !started.ok) {
        errorGonder(
          send,
          ws,
          started && started.message
            ? started.message
            : "Research could not be started"
        );
        return;
      }

      refreshTechnologyStats(state);
      updateServerTime(state);
      schedulePlayerDeadline(
        playerId,
        state
      );

      send(ws, {
        type: "research_started",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson: JSON.stringify({
          buildingInstanceId,
          techId:
            normalizeBuildingId(techId),
          targetLevel:
            started.research.targetLevel,
          startedAtMs:
            started.research.startedAtMs,
          durationMs:
            started.research.durationMs,
          endsAtMs:
            started.research.endsAtMs
        })
      });

      send(ws, {
        type: "state",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            makeClientState(state)
          )
      });
    },
    {
      authRequired: true,
      mutation: true
    }
  );

  router.register(
    "technology_research_start",
    async ({ ws, msg, send, nowMs }) => {
      const authCheck =
        playerIdUyugunluqYoxla(msg, ws);

      if (!authCheck.ok) {
        errorGonder(
          send,
          ws,
          authCheck.message,
          authCheck.message === "Player ID mismatch"
            ? "PLAYER_ID_MISMATCH"
            : "NOT_AUTHED"
        );
        return;
      }

      const playerId = authCheck.playerId;
      const techId =
        typeof msg.techId === "string"
          ? msg.techId.trim()
          : "";

      if (!techId) {
        errorGonder(send, ws, "Missing techId");
        return;
      }

      const state =
        getOrCreatePlayerState(playerId);

      const result =
        startTechnologyResearch(
          state,
          techId
        );

      if (!result || !result.ok) {
        errorGonder(
          send,
          ws,
          result && result.message
            ? result.message
            : "Technology research could not start"
        );
        return;
      }

      schedulePlayerDeadline(
        playerId,
        state
      );

      send(ws, {
        type: "technology_research_started",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            result.research
          )
      });

      send(ws, {
        type: "state",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            makeClientState(state)
          )
      });
    },
    {
      authRequired: true,
      mutation: true
    }
  );

  router.register(
    "start_construction_request",
    async ({ ws, msg, send, nowMs }) => {
      const authCheck =
        playerIdUyugunluqYoxla(msg, ws);

      if (!authCheck.ok) {
        errorGonder(
          send,
          ws,
          authCheck.message,
          authCheck.message === "Player ID mismatch"
            ? "PLAYER_ID_MISMATCH"
            : "NOT_AUTHED"
        );
        return;
      }

      const playerId = authCheck.playerId;
      const buildingInstanceId =
        typeof msg.buildingInstanceId === "string"
          ? msg.buildingInstanceId.trim()
          : "";

      if (!buildingInstanceId) {
        errorGonder(send, ws, "Missing buildingInstanceId");
        return;
      }

      const state =
        getOrCreatePlayerState(playerId);

      const building =
        Array.isArray(state.buildings)
          ? state.buildings.find(
              b =>
                b &&
                b.instanceId === buildingInstanceId
            )
          : null;

      if (!building) {
        errorGonder(send, ws, "Building not found");
        return;
      }

      if (
        !hasFreeBuilder(
          state,
          building.buildingId
        )
      ) {
        errorGonder(send, ws, "All builders are busy");
        return;
      }

      const buildingId =
        normalizeBuildingId(
          building.buildingId
        );

      if (
        buildingId === "road" ||
        buildingId === "hq" ||
        isGarageBuildingId(buildingId)
      ) {
        errorGonder(
          send,
          ws,
          "This building cannot start construction"
        );
        return;
      }

      if (building.isCompleted) {
        errorGonder(send, ws, "Building already completed");
        return;
      }

      if (
        Number(
          building.buildFinishTimeMs
        ) > 0
      ) {
        errorGonder(send, ws, "Construction already started");
        return;
      }

      if (!building.hasRoadAccess) {
        errorGonder(send, ws, "Road required before construction");
        return;
      }

      const targetLevel =
        Math.max(
          1,
          Number(building.level) || 1
        );

      const levelData =
        getLevelData(
          building.buildingId,
          targetLevel
        );

      const check =
        hasEnoughResources(
          state,
          levelData.cost
        );

      if (!check.ok) {
        errorGonder(
          send,
          ws,
          `Not enough ${check.resource}. Need ${check.need}, have ${check.have}`
        );
        return;
      }

      spendResources(
        state,
        levelData.cost
      );

      const durationMs =
        Math.max(
          0,
          Math.round(
            (Number(
              levelData.buildTimeSeconds
            ) || 0) * 1000
          )
        );

      const now = nowMs();

      building.buildFinishTimeMs =
        now + durationMs;

      building.isCompleted = false;

      const jobId =
        crypto
          .randomBytes(8)
          .toString("hex");

      state.builders.jobs.push({
        jobId,
        kind: "build",
        buildingInstanceId:
          building.instanceId,
        buildingId:
          building.buildingId,
        x: building.x,
        z: building.z,
        targetLevel,
        startedAtMs: now,
        durationMs,
        endsAtMs: now + durationMs,
        isCompleted: false,
        builderSlotsRequired:
          getBuilderSlotsRequiredForBuilding(
            building.buildingId
          )
      });

      refreshBuilderCapacity(state);
      updateServerTime(state);
      schedulePlayerDeadline(
        playerId,
        state
      );

      send(ws, {
        type: "construction_started",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson: JSON.stringify({
          buildingInstanceId:
            building.instanceId,
          buildingId:
            building.buildingId,
          targetLevel,
          endsAtMs:
            building.buildFinishTimeMs
        })
      });

      send(ws, {
        type: "state",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            makeClientState(state)
          )
      });
    },
    {
      authRequired: true,
      mutation: true
    }
  );

  router.register(
    "train_unit_request",
    async ({ ws, msg, send, nowMs }) => {
      const authCheck =
        playerIdUyugunluqYoxla(msg, ws);

      if (!authCheck.ok) {
        errorGonder(
          send,
          ws,
          authCheck.message,
          authCheck.message === "Player ID mismatch"
            ? "PLAYER_ID_MISMATCH"
            : "NOT_AUTHED"
        );
        return;
      }

      const playerId = authCheck.playerId;

      const buildingInstanceId =
        typeof msg.buildingInstanceId === "string"
          ? msg.buildingInstanceId.trim()
          : "";

      const unitId =
        typeof msg.unitId === "string"
          ? msg.unitId.trim()
          : "";

      const count =
        Number(msg.count);

      if (!buildingInstanceId) {
        errorGonder(send, ws, "Missing buildingInstanceId");
        return;
      }

      if (!unitId) {
        errorGonder(send, ws, "Missing unitId");
        return;
      }

      if (
        !Number.isFinite(count) ||
        count <= 0
      ) {
        errorGonder(send, ws, "Invalid count");
        return;
      }

      const state =
        getOrCreatePlayerState(playerId);

      if (!state.army) {
        state.army = {
          troops: {},
          trainingQueues: {}
        };
      }

      if (!state.army.troops) {
        state.army.troops = {};
      }

      if (!state.army.trainingQueues) {
        state.army.trainingQueues = {};
      }

      const building =
        Array.isArray(state.buildings)
          ? state.buildings.find(
              b =>
                b &&
                b.instanceId === buildingInstanceId
            )
          : null;

      if (!building) {
        errorGonder(send, ws, "Building not found");
        return;
      }

      const buildingId =
        normalizeBuildingId(
          building.buildingId
        );

      const isTrainingBuilding =
        buildingId === "fighter_camp" ||
        buildingId === "shooter_camp" ||
        buildingId === "vehicle_factory";

      if (!isTrainingBuilding) {
        errorGonder(
          send,
          ws,
          "This building cannot train units"
        );
        return;
      }

      if (!building.isCompleted) {
        errorGonder(send, ws, "Building is not completed");
        return;
      }

      if (
        state.army.trainingQueues[
          buildingInstanceId
        ]
      ) {
        errorGonder(send, ws, "Training queue already busy");
        return;
      }

      const now = nowMs();

      const durationMs =
        getAdjustedTrainingDurationMs(
          state,
          count * 5000
        );

      const queueEntry = {
        buildingInstanceId,
        unitId,
        count,
        startTimeMs: now,
        finishTimeMs:
          now + durationMs
      };

      state.army.trainingQueues[
        buildingInstanceId
      ] = queueEntry;

      schedulePlayerDeadline(
        playerId,
        state
      );

      send(ws, {
        type: "train_started",
        playerId,
        serverTimeUnixMs: now,
        payloadJson:
          JSON.stringify(queueEntry)
      });

      send(ws, {
        type: "state",
        playerId,
        serverTimeUnixMs: now,
        payloadJson:
          JSON.stringify(
            makeClientState(state)
          )
      });
    },
    {
      authRequired: true,
      mutation: true
    }
  );

  router.register(
    "upgrade_request",
    async ({ ws, msg, send, nowMs }) => {
      const authCheck =
        playerIdUyugunluqYoxla(msg, ws);

      if (!authCheck.ok) {
        errorGonder(
          send,
          ws,
          authCheck.message,
          authCheck.message === "Player ID mismatch"
            ? "PLAYER_ID_MISMATCH"
            : "NOT_AUTHED"
        );
        return;
      }

      const playerId = authCheck.playerId;

      const buildingInstanceId =
        typeof msg.buildingInstanceId === "string"
          ? msg.buildingInstanceId.trim()
          : "";

      if (!buildingInstanceId) {
        errorGonder(send, ws, "Missing buildingInstanceId");
        return;
      }

      const state =
        getOrCreatePlayerState(playerId);

      const building =
        Array.isArray(state.buildings)
          ? state.buildings.find(
              b =>
                b &&
                b.instanceId === buildingInstanceId
            )
          : null;

      if (!building) {
        errorGonder(send, ws, "Building not found");
        return;
      }

      if (
        !hasFreeBuilder(
          state,
          building.buildingId
        )
      ) {
        errorGonder(send, ws, "All builders are busy");
        return;
      }

      const buildingId =
        normalizeBuildingId(
          building.buildingId
        );

      if (
        buildingId === "road" ||
        isUpgradeDisabledBuildingId(
          buildingId
        )
      ) {
        errorGonder(
          send,
          ws,
          "This building cannot be upgraded"
        );
        return;
      }

      if (!building.isCompleted) {
        errorGonder(send, ws, "Building is already busy");
        return;
      }

      if (!building.hasRoadAccess) {
        errorGonder(
          send,
          ws,
          "Road connection required before upgrade"
        );
        return;
      }

      const currentLevel =
        Math.max(
          1,
          Number(building.level) || 1
        );

      const maxLevel =
        getMaxLevelForBuilding(
          building.buildingId
        );

      if (currentLevel >= maxLevel) {
        errorGonder(
          send,
          ws,
          "Building already at max level"
        );
        return;
      }

      const targetLevel =
        currentLevel + 1;

      const levelData =
        getLevelData(
          building.buildingId,
          targetLevel
        );

      const check =
        hasEnoughResources(
          state,
          levelData.cost
        );

      if (!check.ok) {
        errorGonder(
          send,
          ws,
          `Not enough ${check.resource}. Need ${check.need}, have ${check.have}`
        );
        return;
      }

      spendResources(
        state,
        levelData.cost
      );

      const job =
        createUpgradeJob(
          state,
          building
        );

      if (!job) {
        errorGonder(
          send,
          ws,
          "Building already at max level"
        );
        return;
      }

      refreshBuilderCapacity(state);
      schedulePlayerDeadline(
        playerId,
        state
      );

      send(ws, {
        type: "upgrade_started",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson: JSON.stringify({
          jobId: job.jobId,
          buildingInstanceId:
            building.instanceId,
          buildingId:
            building.buildingId,
          currentLevel,
          targetLevel:
            job.targetLevel,
          endsAtMs:
            job.endsAtMs
        })
      });

      send(ws, {
        type: "state",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            makeClientState(state)
          )
      });
    },
    {
      authRequired: true,
      mutation: true
    }
  );

  return router;
}

module.exports = {
  gameplayMutationCommandleriniQeydEt
};
