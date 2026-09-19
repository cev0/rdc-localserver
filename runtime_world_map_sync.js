"use strict";

const RUNTIME_STATE_MAP_REFRESH_TYPE =
  "__runtime_state_map_refresh_v1";

const RUNTIME_STATE_CENTER_UPDATE_TYPE =
  "__runtime_state_center_update_v1";

const RUNTIME_STATE_DYNAMIC_REFRESH_TYPE =
  "__runtime_state_dynamic_refresh_v1";

function tamEded(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? Math.max(
        0,
        Math.trunc(n)
      )
    : 0;
}

function stateIdAl(value) {
  const sid =
    tamEded(value);

  return sid > 0
    ? sid
    : 0;
}

function centerUpdateTetbiqEt(
  stateRuntime,
  payload,
  nowMs = Date.now()
) {
  if (
    !stateRuntime ||
    typeof stateRuntime !== "object" ||
    !payload ||
    typeof payload !== "object"
  ) {
    return false;
  }

  if (
    !stateRuntime.centerBuilding ||
    typeof stateRuntime.centerBuilding !==
      "object"
  ) {
    stateRuntime.centerBuilding = {};
  }

  const incomingRevision =
    tamEded(
      payload.revision
    );

  const currentRevision =
    tamEded(
      stateRuntime.revision
    );

  if (
    incomingRevision > 0 &&
    currentRevision > incomingRevision
  ) {
    return false;
  }

  const occupiedByPlayerId =
    typeof payload.occupiedByPlayerId ===
      "string"
      ? payload.occupiedByPlayerId
          .trim()
      : "";

  const occupiedByAllianceId =
    typeof payload.occupiedByAllianceId ===
      "string"
      ? payload.occupiedByAllianceId
          .trim()
      : "";

  const centerUnlockAtMs =
    tamEded(
      payload.centerUnlockAtMs
    );

  const occupiedAtMs =
    tamEded(
      payload.occupiedAtMs
    );

  stateRuntime.centerBuilding
    .occupiedByPlayerId =
      occupiedByPlayerId ||
      null;

  stateRuntime.centerBuilding
    .occupiedByAllianceId =
      occupiedByAllianceId ||
      null;

  stateRuntime.centerBuilding
    .occupiedAtMs =
      occupiedAtMs;

  if (centerUnlockAtMs > 0) {
    stateRuntime.centerBuilding
      .unlockAtMs =
        centerUnlockAtMs;

    stateRuntime.centerUnlockAtMs =
      centerUnlockAtMs;
  }

  stateRuntime.centerBuilding
    .isUnlocked =
      centerUnlockAtMs > 0
        ? Number(nowMs) >=
          centerUnlockAtMs
        : !!stateRuntime.centerBuilding
            .isUnlocked;

  stateRuntime.presidentPlayerId =
    occupiedByPlayerId ||
    null;

  stateRuntime.presidentAllianceId =
    occupiedByAllianceId ||
    null;

  if (incomingRevision > 0) {
    stateRuntime.revision =
      Math.max(
        currentRevision,
        incomingRevision
      );
  }

  return true;
}

async function runtimeDynamicMapRefreshGonder(
  runtimeBus,
  stateId,
  reason = "dynamic_state_changed",
  nowMs = Date.now,
  logger = console
) {
  const sid =
    stateIdAl(
      stateId
    );

  if (
    !sid ||
    !runtimeBus ||
    typeof runtimeBus.publishBroadcast !==
      "function"
  ) {
    return false;
  }

  const vaxt =
    typeof nowMs === "function"
      ? nowMs()
      : Date.now();

  try {
    return await runtimeBus
      .publishBroadcast(
        "world-state",
        String(sid),
        {
          type:
            RUNTIME_STATE_DYNAMIC_REFRESH_TYPE,
          reason:
            typeof reason === "string" &&
            reason.trim()
              ? reason.trim().slice(
                  0,
                  96
                )
              : "dynamic_state_changed",
          committedAtMs:
            Number(vaxt) ||
            Date.now()
        }
      );
  }
  catch (error) {
    try {
      logger.error(
        "[RUNTIME_WORLD_MAP_SYNC] Dynamic refresh publish failed:",
        error && error.message
          ? error.message
          : error
      );
    }
    catch (_) {
    }

    return false;
  }
}

function runtimeWorldMapSyncControllerYarat(
  options = {}
) {
  const getWorldStateRuntime =
    options.getWorldStateRuntime;

  const clearBaseCache =
    typeof options.clearBaseCache ===
      "function"
      ? options.clearBaseCache
      : () => {};

  const pushStateLocalMap =
    typeof options.pushStateLocalMap ===
      "function"
      ? options.pushStateLocalMap
      : async () => {};

  const pushWorldMap =
    typeof options.pushWorldMap ===
      "function"
      ? options.pushWorldMap
      : async () => {};

  const pushDynamicMap =
    typeof options.pushDynamicMap ===
      "function"
      ? options.pushDynamicMap
      : async () => {};

  const nowMs =
    typeof options.nowMs ===
      "function"
      ? options.nowMs
      : () => Date.now();

  const logger =
    options.logger ||
    console;

  if (
    typeof getWorldStateRuntime !==
      "function"
  ) {
    throw new Error(
      "Runtime world-map sync üçün getWorldStateRuntime yoxdur."
    );
  }

  async function publish(
    runtimeBus,
    stateId,
    payload
  ) {
    const sid =
      stateIdAl(
        stateId
      );

    if (
      !sid ||
      !runtimeBus ||
      typeof runtimeBus.publishBroadcast !==
        "function"
    ) {
      return false;
    }

    try {
      return await runtimeBus
        .publishBroadcast(
          "world-state",
          String(sid),
          payload
        );
    }
    catch (error) {
      try {
        logger.error(
          "[RUNTIME_WORLD_MAP_SYNC] Broadcast publish failed:",
          error && error.message
            ? error.message
            : error
        );
      }
      catch (_) {
      }

      return false;
    }
  }

  async function publishBaseRefresh(
    runtimeBus,
    stateId,
    reason = "base_changed"
  ) {
    return await publish(
      runtimeBus,
      stateId,
      {
        type:
          RUNTIME_STATE_MAP_REFRESH_TYPE,
        reason:
          typeof reason === "string"
            ? reason
            : "base_changed",
        committedAtMs:
          nowMs()
      }
    );
  }

  async function publishDynamicRefresh(
    runtimeBus,
    stateId,
    reason =
      "dynamic_state_changed"
  ) {
    return await runtimeDynamicMapRefreshGonder(
      runtimeBus,
      stateId,
      reason,
      nowMs,
      logger
    );
  }

  async function publishCenterUpdate(
    runtimeBus,
    stateId,
    result
  ) {
    const info =
      result &&
      typeof result === "object"
        ? result
        : {};

    return await publish(
      runtimeBus,
      stateId,
      {
        type:
          RUNTIME_STATE_CENTER_UPDATE_TYPE,
        occupiedByPlayerId:
          info.occupiedByPlayerId ||
          "",
        occupiedByAllianceId:
          info.occupiedByAllianceId ||
          "",
        occupiedAtMs:
          tamEded(
            info.occupiedAtMs
          ),
        centerUnlockAtMs:
          tamEded(
            info.centerUnlockAtMs
          ),
        revision:
          tamEded(
            info.revision
          ),
        committedAtMs:
          nowMs()
      }
    );
  }

  async function handleBroadcast(
    message
  ) {
    if (
      !message ||
      message.scope !==
        "world-state" ||
      !message.payload ||
      typeof message.payload !==
        "object"
    ) {
      return false;
    }

    const sid =
      stateIdAl(
        message.targetId
      );

    if (!sid) {
      return false;
    }

    const payload =
      message.payload;

    if (
      payload.type ===
        RUNTIME_STATE_MAP_REFRESH_TYPE
    ) {
      clearBaseCache(
        sid
      );

      await pushStateLocalMap(
        sid
      );

      return true;
    }

    if (
      payload.type ===
        RUNTIME_STATE_DYNAMIC_REFRESH_TYPE
    ) {
      await pushDynamicMap(
        sid
      );

      return true;
    }

    if (
      payload.type ===
        RUNTIME_STATE_CENTER_UPDATE_TYPE
    ) {
      let stateRuntime =
        getWorldStateRuntime(
          sid
        );

      if (stateRuntime) {
        centerUpdateTetbiqEt(
          stateRuntime,
          payload,
          nowMs()
        );
      }

      // Yeni State başqa instance-da yaradılıbsa bu instance-in local runtime-ı
      // broadcast gələn anda hələ mövcud olmaya bilər. Authoritative world-map
      // refresh əvvəl metadata-nı hydrate edir; sonra center payload-u həmin yeni
      // runtime-a tətbiq edib local map-i göndəririk.
      await pushWorldMap();

      if (!stateRuntime) {
        stateRuntime =
          getWorldStateRuntime(
            sid
          );

        if (stateRuntime) {
          centerUpdateTetbiqEt(
            stateRuntime,
            payload,
            nowMs()
          );
        }
      }

      await pushStateLocalMap(
        sid
      );

      return true;
    }

    return false;
  }

  return {
    publishBaseRefresh,
    publishDynamicRefresh,
    publishCenterUpdate,
    handleBroadcast
  };
}

module.exports = {
  RUNTIME_STATE_MAP_REFRESH_TYPE,
  RUNTIME_STATE_CENTER_UPDATE_TYPE,
  RUNTIME_STATE_DYNAMIC_REFRESH_TYPE,
  centerUpdateTetbiqEt,
  runtimeDynamicMapRefreshGonder,
  runtimeWorldMapSyncControllerYarat
};
