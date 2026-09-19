"use strict";

const crypto = require("crypto");
const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  qosunTeliminiBaslat
} = require("./qosun_telimi_sistemi");

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
      mutation: true,
      postgresAuthoritative: true
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
      mutation: true,
      postgresAuthoritative: true
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
      mutation: true,
      postgresAuthoritative: true
    }
  );

  router.register(
    "train_unit_request",
    async ({
      ws,
      msg,
      send,
      nowMs,
      deferAfterCommit
    }) => {
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

      const now = nowMs();

      // Direct server.js fallback da əsas gameplay extension ilə eyni
      // server-authoritative troop kataloqundan istifadə edir. Beləliklə
      // training vaxtı, unlock, xərc və unit canonicalization üçün ayrıca
      // legacy formula qalmır.
      const trainingResult =
        qosunTeliminiBaslat(
          state,
          buildingInstanceId,
          unitId,
          count,
          now
        );

      if (
        !trainingResult ||
        trainingResult.success !== true
      ) {
        errorGonder(
          send,
          ws,
          trainingResult &&
          trainingResult.message
            ? trainingResult.message
            : "Training could not be started"
        );
        return;
      }

      const queueEntry =
        trainingResult.queue;

      const scheduleDeadline =
        async () => {
          schedulePlayerDeadline(
            playerId,
            state
          );
        };

      if (
        typeof deferAfterCommit ===
          "function"
      ) {
        deferAfterCommit(
          scheduleDeadline
        );
      }
      else {
        await scheduleDeadline();
      }

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
      mutation: true,
      postgresAuthoritative: true
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
      mutation: true,
      postgresAuthoritative: true
    }
  );

  return router;
}

module.exports = {
  gameplayMutationCommandleriniQeydEt
};
