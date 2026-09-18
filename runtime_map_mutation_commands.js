"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  legacyBaseTeleportYoxla,
  legacyBaseTeleportKilidiniAl
} = require("./runtime_legacy_base_teleport");

function errorGonder(send, ws, message, code) {
  send(ws, {
    type: "error",
    ...(code ? { code } : {}),
    message
  });
}

function mapMutationCommandleriniQeydEt(
  router,
  deps
) {
  if (!router) {
    throw new Error("Command router yoxdur.");
  }

  const {
    getOrCreatePlayerState,
    ensureMapState,
    expandUnlockedArea,
    updateServerTime,
    makeClientState,
    normalizeBuildingId,
    refreshRoadAccessForBuildings,
    findRoadPathAStar,
    createRoadsAlongPath,
    pushStateToPlayerConnections,
    teleportPlayerBaseInsideState,
    applyPlayerBaseTeleportInsideState,
    pushStateLocalMapToStatePlayers,
    canMoveThisBuilding,
    canMoveBuilding,
    syncResourceSlotOccupancy,
    getWorldStateRuntime,
    occupyStateCenter,
    pushWorldMapToAllAuthedPlayers,
    dovletBazalariniBirbasaPostgresdenAlClient,
    dovletBazaKeshiniTemizle
  } = deps || {};

  const requiredFns = {
    getOrCreatePlayerState,
    ensureMapState,
    expandUnlockedArea,
    updateServerTime,
    makeClientState,
    normalizeBuildingId,
    refreshRoadAccessForBuildings,
    findRoadPathAStar,
    createRoadsAlongPath,
    pushStateToPlayerConnections,
    teleportPlayerBaseInsideState,
    applyPlayerBaseTeleportInsideState,
    pushStateLocalMapToStatePlayers,
    canMoveThisBuilding,
    canMoveBuilding,
    syncResourceSlotOccupancy,
    getWorldStateRuntime,
    occupyStateCenter,
    pushWorldMapToAllAuthedPlayers,
    dovletBazalariniBirbasaPostgresdenAlClient,
    dovletBazaKeshiniTemizle
  };

  for (
    const [name, fn] of
    Object.entries(requiredFns)
  ) {
    if (typeof fn !== "function") {
      throw new Error(
        "Map mutation dependency yoxdur: " +
        name
      );
    }
  }

  router.register(
    "expand_area_request",
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

      const direction = msg.direction;

      if (
        direction !== "right" &&
        direction !== "bottom" &&
        direction !== "left" &&
        direction !== "top"
      ) {
        errorGonder(
          send,
          ws,
          "Invalid expansion direction"
        );
        return;
      }

      const playerId = authCheck.playerId;
      const state =
        getOrCreatePlayerState(playerId);

      ensureMapState(state);

      const ok =
        expandUnlockedArea(
          state,
          direction,
          8,
          8
        );

      if (!ok) {
        errorGonder(
          send,
          ws,
          "Expansion failed"
        );
        return;
      }

      updateServerTime(state);

      send(ws, {
        type: "area_expanded",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson: JSON.stringify({
          direction,
          unlockedMinX:
            state.map.unlockedMinX,
          unlockedMaxX:
            state.map.unlockedMaxX,
          unlockedMinZ:
            state.map.unlockedMinZ,
          unlockedMaxZ:
            state.map.unlockedMaxZ,
          unlockedBlocks:
            state.map.unlockedBlocks
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
    "connect_road_request",
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

      const buildingInstanceId =
        typeof msg.buildingInstanceId === "string"
          ? msg.buildingInstanceId.trim()
          : "";

      if (!buildingInstanceId) {
        errorGonder(
          send,
          ws,
          "Missing buildingInstanceId"
        );
        return;
      }

      const playerId = authCheck.playerId;
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
        errorGonder(
          send,
          ws,
          "Building not found"
        );
        return;
      }

      const id =
        normalizeBuildingId(
          building.buildingId
        );

      if (
        id === "hq" ||
        id === "road"
      ) {
        errorGonder(
          send,
          ws,
          "Invalid target for road connection"
        );
        return;
      }

      refreshRoadAccessForBuildings(
        state
      );

      if (building.hasRoadAccess) {
        errorGonder(
          send,
          ws,
          "Building already connected to road"
        );
        return;
      }

      const path =
        findRoadPathAStar(
          state,
          buildingInstanceId
        );

      if (
        !path ||
        path.length === 0
      ) {
        errorGonder(
          send,
          ws,
          "Road path not found"
        );
        return;
      }

      const createdRoads =
        createRoadsAlongPath(
          state,
          path
        );

      refreshRoadAccessForBuildings(
        state
      );

      send(ws, {
        type: "road_connected",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify({
            buildingInstanceId,
            createdRoadCount:
              createdRoads.length
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
    "expand_base",
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
      const state =
        getOrCreatePlayerState(playerId);

      if (!state.map) {
        errorGonder(
          send,
          ws,
          "Map not initialized"
        );
        return;
      }

      state.map.unlockedMinX -= 2;
      state.map.unlockedMaxX += 2;
      state.map.unlockedMinZ -= 2;
      state.map.unlockedMaxZ += 2;

      updateServerTime(state);

      send(ws, {
        type: "base_expanded",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(state.map)
      });

      await deferAfterCommit(
        async () => {
          pushStateToPlayerConnections(
            playerId,
            state
          );
        }
      );
    },
    {
      authRequired: true,
      mutation: true,
      postgresAuthoritative: true
    }
  );

  /*
   * Legacy base teleport artıq player snapshot + Dövlət səviyyəli PostgreSQL
   * advisory lock ilə işləyir. WorldV2 teleport da eyni lock adını istifadə edir,
   * buna görə köhnə və yeni teleport sorğuları eyni Dövlət daxilində serial olur.
   *
   * occupy_state_center_request isə hələ ortaq Prezident runtime state-inə
   * toxunduğu üçün ayrıca world metadata persistence mərhələsinə qədər
   * player-only PostgreSQL executor-a salınmır.
   */
  router.register(
    "base_teleport_request",
    async ({
      ws,
      msg,
      send,
      nowMs,
      transactionContext,
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

      const targetBaseX =
        Number.isInteger(msg.x)
          ? msg.x
          : parseInt(msg.x, 10);

      const targetBaseZ =
        Number.isInteger(msg.z)
          ? msg.z
          : parseInt(msg.z, 10);

      if (
        !Number.isInteger(targetBaseX) ||
        !Number.isInteger(targetBaseZ)
      ) {
        errorGonder(
          send,
          ws,
          "Invalid base teleport coordinates"
        );
        return;
      }

      const playerId = authCheck.playerId;
      const state =
        getOrCreatePlayerState(playerId);

      if (
        !state ||
        !state.worldPlacement
      ) {
        errorGonder(
          send,
          ws,
          "Player world placement not found"
        );
        return;
      }

      const stateId =
        Number(
          state.worldPlacement.stateId
        );

      if (
        !Number.isInteger(stateId) ||
        stateId <= 0
      ) {
        errorGonder(
          send,
          ws,
          "Player stateId is invalid"
        );
        return;
      }

      const stateRuntime =
        getWorldStateRuntime(
          stateId
        );

      if (!stateRuntime) {
        errorGonder(
          send,
          ws,
          "World state not found"
        );
        return;
      }

      const client =
        transactionContext &&
        transactionContext.client;

      if (
        !client ||
        typeof client.query !==
          "function"
      ) {
        throw new Error(
          "Base teleport PostgreSQL transaction client-i yoxdur."
        );
      }

      await legacyBaseTeleportKilidiniAl(
        client,
        stateId
      );

      const bazaPaketi =
        await dovletBazalariniBirbasaPostgresdenAlClient(
          client,
          stateId
        );

      const check =
        legacyBaseTeleportYoxla({
          stateRuntime,
          playerId,
          targetBaseX,
          targetBaseZ,
          bases:
            Array.isArray(
              bazaPaketi &&
              bazaPaketi.bases
            )
              ? bazaPaketi.bases
              : []
        });

      if (!check.ok) {
        errorGonder(
          send,
          ws,
          check.message ||
            "Base teleport failed"
        );
        return;
      }

      const result =
        applyPlayerBaseTeleportInsideState(
          state,
          playerId,
          targetBaseX,
          targetBaseZ
        );

      if (!result.ok) {
        errorGonder(
          send,
          ws,
          result.message ||
            "Base teleport failed"
        );
        return;
      }

      send(ws, {
        type:
          result.ignored
            ? "base_teleport_ignored"
            : "base_teleported",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(result)
      });

      await deferAfterCommit(
        async () => {
          dovletBazaKeshiniTemizle(
            stateId
          );

          pushStateToPlayerConnections(
            playerId,
            state
          );

          pushStateLocalMapToStatePlayers(
            result.stateId
          );
        }
      );
    },
    {
      authRequired: true,
      mutation: true,
      postgresAuthoritative: true
    }
  );

  router.register(
    "move_request",
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
      const state =
        getOrCreatePlayerState(playerId);

      if (
        !state ||
        !Array.isArray(state.buildings)
      ) {
        errorGonder(
          send,
          ws,
          "Player state not found."
        );
        return;
      }

      const instanceId =
        typeof msg.buildingInstanceId === "string"
          ? msg.buildingInstanceId.trim()
          : "";

      const newX =
        Number.isInteger(msg.x)
          ? msg.x
          : parseInt(msg.x, 10);

      const newZ =
        Number.isInteger(msg.z)
          ? msg.z
          : parseInt(msg.z, 10);

      if (!instanceId) {
        errorGonder(
          send,
          ws,
          "buildingInstanceId is required."
        );
        return;
      }

      if (
        !Number.isInteger(newX) ||
        !Number.isInteger(newZ)
      ) {
        errorGonder(
          send,
          ws,
          "Invalid move target coordinates."
        );
        return;
      }

      const movingBuilding =
        state.buildings.find(
          b =>
            b &&
            b.instanceId === instanceId
        );

      if (!movingBuilding) {
        errorGonder(
          send,
          ws,
          "Building instance not found."
        );
        return;
      }

      if (
        !canMoveThisBuilding(
          movingBuilding
        )
      ) {
        errorGonder(
          send,
          ws,
          "This building cannot be moved."
        );
        return;
      }

      if (
        movingBuilding.x === newX &&
        movingBuilding.z === newZ
      ) {
        send(ws, {
          type: "move_ignored",
          buildingInstanceId:
            instanceId,
          x: newX,
          z: newZ,
          reason: "same_position"
        });
        return;
      }

      if (
        !canMoveBuilding(
          state,
          movingBuilding,
          newX,
          newZ
        )
      ) {
        errorGonder(
          send,
          ws,
          "Target area is occupied."
        );
        return;
      }

      movingBuilding.x = newX;
      movingBuilding.z = newZ;
      movingBuilding.updatedAt =
        nowMs();

      syncResourceSlotOccupancy(
        state
      );

      refreshRoadAccessForBuildings(
        state
      );

      updateServerTime(state);

      send(ws, {
        type: "move_applied",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify({
            buildingInstanceId:
              instanceId,
            x: newX,
            z: newZ
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
    "occupy_state_center_request",
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
      const playerState =
        getOrCreatePlayerState(playerId);

      if (
        !playerState ||
        !playerState.worldPlacement
      ) {
        errorGonder(
          send,
          ws,
          "Player world placement not found"
        );
        return;
      }

      const stateId =
        Number.isInteger(msg.stateId)
          ? msg.stateId
          : Number(
              playerState.worldPlacement
                .stateId
            );

      const stateRuntime =
        getWorldStateRuntime(stateId);

      if (!stateRuntime) {
        errorGonder(
          send,
          ws,
          "World state not found"
        );
        return;
      }

      if (
        Number(
          playerState.worldPlacement
            .stateId
        ) !== Number(stateId)
      ) {
        errorGonder(
          send,
          ws,
          "Player is not inside this state"
        );
        return;
      }

      const result =
        occupyStateCenter(
          stateRuntime,
          playerId,
          null
        );

      if (!result.ok) {
        errorGonder(
          send,
          ws,
          result.message ||
            "Occupation failed"
        );
        return;
      }

      send(ws, {
        type: "state_center_occupied",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(result)
      });

      pushStateLocalMapToStatePlayers(
        stateId
      );

      pushWorldMapToAllAuthedPlayers();
    },
    {
      authRequired: true,
      mutation: true
    }
  );

  return router;
}

module.exports = {
  mapMutationCommandleriniQeydEt
};
