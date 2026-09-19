"use strict";

const {
  worldStateTeleportKilidiniAl
} = require("./world_state_transaction_lock");

const DEFAULT_MIN_BASE_DISTANCE = 18;

function reqemAl(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? n
    : fallback;
}

function playerIdAl(value) {
  return typeof value === "string"
    ? value.trim().slice(0, 128)
    : "";
}

function legacyBaseTeleportYoxla({
  stateRuntime,
  playerId,
  targetBaseX,
  targetBaseZ,
  bases = [],
  minBaseDistance =
    DEFAULT_MIN_BASE_DISTANCE
} = {}) {
  if (!stateRuntime) {
    return {
      ok: false,
      message:
        "World state not found"
    };
  }

  if (
    !Number.isInteger(
      targetBaseX
    ) ||
    !Number.isInteger(
      targetBaseZ
    )
  ) {
    return {
      ok: false,
      message:
        "Invalid base coordinates"
    };
  }

  const width =
    Math.max(
      1,
      Math.trunc(
        reqemAl(
          stateRuntime.localMap &&
          stateRuntime.localMap.width,
          1024
        )
      )
    );

  const height =
    Math.max(
      1,
      Math.trunc(
        reqemAl(
          stateRuntime.localMap &&
          stateRuntime.localMap.height,
          1024
        )
      )
    );

  if (
    targetBaseX < 0 ||
    targetBaseX >= width ||
    targetBaseZ < 0 ||
    targetBaseZ >= height
  ) {
    return {
      ok: false,
      message:
        "Target base coordinates are outside the state map"
    };
  }

  const centerX =
    reqemAl(
      stateRuntime.centerBuilding &&
      stateRuntime.centerBuilding.x,
      reqemAl(
        stateRuntime.localMap &&
        stateRuntime.localMap.centerX,
        512
      )
    );

  const centerZ =
    reqemAl(
      stateRuntime.centerBuilding &&
      stateRuntime.centerBuilding.z,
      reqemAl(
        stateRuntime.localMap &&
        stateRuntime.localMap.centerZ,
        512
      )
    );

  if (
    targetBaseX === centerX &&
    targetBaseZ === centerZ
  ) {
    return {
      ok: false,
      message:
        "Cannot teleport onto the state center"
    };
  }

  const self =
    playerIdAl(
      playerId
    ).toLowerCase();

  const minDistance =
    Math.max(
      1,
      reqemAl(
        minBaseDistance,
        DEFAULT_MIN_BASE_DISTANCE
      )
    );

  const minDistanceSq =
    minDistance *
    minDistance;

  for (
    const base of
    Array.isArray(bases)
      ? bases
      : []
  ) {
    if (!base) {
      continue;
    }

    const otherPlayerId =
      playerIdAl(
        base.playerId
      ).toLowerCase();

    if (
      !otherPlayerId ||
      otherPlayerId === self
    ) {
      continue;
    }

    const otherX =
      Number(
        base.baseX != null
          ? base.baseX
          : base.x
      );

    const otherZ =
      Number(
        base.baseZ != null
          ? base.baseZ
          : base.z
      );

    if (
      !Number.isFinite(otherX) ||
      !Number.isFinite(otherZ)
    ) {
      continue;
    }

    const dx =
      targetBaseX -
      otherX;

    const dz =
      targetBaseZ -
      otherZ;

    if (
      dx * dx +
      dz * dz <
      minDistanceSq
    ) {
      return {
        ok: false,
        message:
          "Target location is too close to another base"
      };
    }
  }

  return {
    ok: true
  };
}

async function legacyBaseTeleportKilidiniAl(
  client,
  stateId
) {
  return await worldStateTeleportKilidiniAl(
    client,
    stateId
  );
}

module.exports = {
  DEFAULT_MIN_BASE_DISTANCE,
  legacyBaseTeleportYoxla,
  legacyBaseTeleportKilidiniAl
};
