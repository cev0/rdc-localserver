"use strict";

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

function buildCommandleriniQeydEt(
  router,
  deps
) {
  if (!router) {
    throw new Error("Command router yoxdur.");
  }

  const {
    getOrCreatePlayerState,
    normalizeBuildingId,
    removeRoadAtCell,
    checkUnlockRequirements,
    countPlacedBuildingsOfType,
    getMaxPlacedCountForBuilding,
    getAllowedPlacedCountForBuilding,
    getNextUnlockCountRequirement,
    hasUnfinishedBuildingOfSameType,
    canPlaceBuilding,
    isGarageBuildingId,
    getLevelData,
    hasEnoughResources,
    spendResources,
    placeBuildingWithoutStarting,
    syncResourceSlotOccupancy,
    refreshRoadAccessForBuildings,
    refreshBuilderCapacity,
    makeClientState,
    sendStateLocalMapToPlayer,
    sendWorldMapToPlayer
  } = deps || {};

  const requiredFns = {
    getOrCreatePlayerState,
    normalizeBuildingId,
    removeRoadAtCell,
    checkUnlockRequirements,
    countPlacedBuildingsOfType,
    getMaxPlacedCountForBuilding,
    getAllowedPlacedCountForBuilding,
    getNextUnlockCountRequirement,
    hasUnfinishedBuildingOfSameType,
    canPlaceBuilding,
    isGarageBuildingId,
    getLevelData,
    hasEnoughResources,
    spendResources,
    placeBuildingWithoutStarting,
    syncResourceSlotOccupancy,
    refreshRoadAccessForBuildings,
    refreshBuilderCapacity,
    makeClientState,
    sendStateLocalMapToPlayer,
    sendWorldMapToPlayer
  };

  for (
    const [name, fn] of
    Object.entries(requiredFns)
  ) {
    if (typeof fn !== "function") {
      throw new Error(
        "Build command dependency yoxdur: " +
        name
      );
    }
  }

  router.register(
    "build_request",
    async ({
      ws,
      msg,
      send,
      nowMs,
      deferAfterCommit
    }) => {
      const authCheck =
        playerIdUyugunluqYoxla(
          msg,
          ws
        );

      if (!authCheck.ok) {
        errorGonder(
          send,
          ws,
          authCheck.message,
          authCheck.message ===
          "Player ID mismatch"
            ? "PLAYER_ID_MISMATCH"
            : "NOT_AUTHED"
        );
        return;
      }

      const playerId =
        authCheck.playerId;

      const buildingId =
        typeof msg.buildingId === "string"
          ? msg.buildingId.trim()
          : "";

      const x = msg.x;
      const z = msg.z;

      if (!buildingId) {
        errorGonder(
          send,
          ws,
          "Missing buildingId"
        );
        return;
      }

      if (
        typeof x !== "number" ||
        typeof z !== "number"
      ) {
        errorGonder(
          send,
          ws,
          "Invalid x/z"
        );
        return;
      }

      const state =
        getOrCreatePlayerState(
          playerId
        );

      const normalizedBuildingId =
        normalizeBuildingId(
          buildingId
        );

      if (
        normalizedBuildingId ===
        "road_delete"
      ) {
        const result =
          removeRoadAtCell(
            state,
            x,
            z
          );

        if (!result.ok) {
          errorGonder(
            send,
            ws,
            result.message
          );
          return;
        }

        send(ws, {
          type: "road_deleted",
          playerId,
          serverTimeUnixMs:
            nowMs(),
          payloadJson:
            JSON.stringify({
              x,
              z,
              buildingId: "road"
            })
        });

        send(ws, {
          type: "state",
          playerId,
          serverTimeUnixMs:
            nowMs(),
          payloadJson:
            JSON.stringify(
              makeClientState(state)
            )
        });

        return;
      }

      const unlockCheck =
        checkUnlockRequirements(
          state,
          normalizedBuildingId
        );

      if (!unlockCheck.ok) {
        errorGonder(
          send,
          ws,
          unlockCheck.message
        );
        return;
      }

      const currentPlacedCount =
        countPlacedBuildingsOfType(
          state,
          normalizedBuildingId
        );

      const maxPlacedCount =
        getMaxPlacedCountForBuilding(
          normalizedBuildingId
        );

      const allowedPlacedCountNow =
        getAllowedPlacedCountForBuilding(
          state,
          normalizedBuildingId
        );

      if (
        currentPlacedCount >=
        maxPlacedCount
      ) {
        errorGonder(
          send,
          ws,
          "This building has reached its max placed count"
        );
        return;
      }

      if (
        currentPlacedCount >=
        allowedPlacedCountNow
      ) {
        const nextUnlock =
          getNextUnlockCountRequirement(
            state,
            normalizedBuildingId
          );

        const message =
          nextUnlock
            ? `HQ level ${nextUnlock.requiredMainBuildingLevel} required to place more of this building`
            : "Current HQ level does not allow placing more of this building";

        errorGonder(
          send,
          ws,
          message
        );
        return;
      }

      if (
        hasUnfinishedBuildingOfSameType(
          state,
          buildingId
        )
      ) {
        errorGonder(
          send,
          ws,
          "You already have an unfinished building of this type"
        );
        return;
      }

      if (
        !canPlaceBuilding(
          state,
          buildingId,
          x,
          z
        )
      ) {
        errorGonder(
          send,
          ws,
          "Placement blocked"
        );
        return;
      }

      if (
        normalizedBuildingId ===
          "road" ||
        isGarageBuildingId(
          normalizedBuildingId
        )
      ) {
        const levelData =
          getLevelData(
            buildingId,
            1
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
      }

      const building =
        placeBuildingWithoutStarting(
          state,
          buildingId,
          x,
          z
        );

      syncResourceSlotOccupancy(
        state
      );

      refreshRoadAccessForBuildings(
        state
      );

      refreshBuilderCapacity(
        state
      );

      send(ws, {
        type: "build_placed",
        playerId,
        serverTimeUnixMs:
          nowMs(),
        payloadJson:
          JSON.stringify({
            buildingInstanceId:
              building.instanceId,
            buildingId:
              building.buildingId,
            x: building.x,
            z: building.z,
            level: building.level,
            isCompleted:
              building.isCompleted,
            buildFinishTimeMs:
              building.buildFinishTimeMs
          })
      });

      send(ws, {
        type: "state",
        playerId,
        serverTimeUnixMs:
          nowMs(),
        payloadJson:
          JSON.stringify(
            makeClientState(state)
          )
      });

      await deferAfterCommit(
        async () => {
          sendStateLocalMapToPlayer(
            ws,
            playerId
          );

          sendWorldMapToPlayer(
            ws,
            playerId
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

  return router;
}

module.exports = {
  buildCommandleriniQeydEt
};
