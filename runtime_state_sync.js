"use strict";

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpasiniKohneIsarele
} = require("./oyun_state_daimilik_korpu");

const RUNTIME_STATE_INVALIDATION_TYPE =
  "__runtime_state_invalidate_v1";

function metnAl(
  value,
  max = 128
) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function runtimeStateInvalidationPayloadYarat(
  playerId,
  metadata = null
) {
  const id =
    metnAl(
      playerId,
      128
    );

  if (!id) {
    throw new Error(
      "Runtime state invalidation üçün playerId yoxdur."
    );
  }

  const info =
    metadata &&
    typeof metadata === "object"
      ? metadata
      : {};

  return {
    type:
      RUNTIME_STATE_INVALIDATION_TYPE,
    version: 1,
    playerId: id,
    reason:
      metnAl(
        info.reason ||
        info.type ||
        "state_commit",
        96
      ),
    committedAtMs:
      Number(
        info.committedAtMs ||
        Date.now()
      ) || Date.now()
  };
}

function runtimeStateInvalidationPayloadidir(
  payload
) {
  return !!(
    payload &&
    typeof payload === "object" &&
    payload.type ===
      RUNTIME_STATE_INVALIDATION_TYPE
  );
}

function runtimeStateSyncControllerYarat(
  options = {}
) {
  const getOrCreatePlayerState =
    options.getOrCreatePlayerState;

  if (
    typeof getOrCreatePlayerState !==
      "function"
  ) {
    throw new Error(
      "Runtime state sync üçün getOrCreatePlayerState yoxdur."
    );
  }

  const updateServerTime =
    typeof options.updateServerTime ===
      "function"
      ? options.updateServerTime
      : null;

  const withPlayerLock =
    typeof options.withPlayerLock ===
      "function"
      ? options.withPlayerLock
      : async (
          _playerId,
          operation
        ) =>
          await operation();

  const hasLocalPlayer =
    typeof options.hasLocalPlayer ===
      "function"
      ? options.hasLocalPlayer
      : () => true;

  const schedulePlayerDeadline =
    typeof options.schedulePlayerDeadline ===
      "function"
      ? options.schedulePlayerDeadline
      : null;

  const pushStateToPlayerConnections =
    typeof options.pushStateToPlayerConnections ===
      "function"
      ? options.pushStateToPlayerConnections
      : null;

  const restorePlayerStateFn =
    typeof options.restorePlayerStateFn ===
      "function"
      ? options.restorePlayerStateFn
      : oyunStateIniBerpaEt;

  const markStaleFn =
    typeof options.markStaleFn ===
      "function"
      ? options.markStaleFn
      : oyuncuStateBerpasiniKohneIsarele;

  const logger =
    options.logger ||
    console;

  async function ensureFresh(
    playerId,
    secimler = null
  ) {
    const id =
      metnAl(
        playerId,
        128
      );

    if (!id) {
      throw new Error(
        "Runtime state refresh üçün playerId yoxdur."
      );
    }

    const opts =
      secimler &&
      typeof secimler === "object"
        ? secimler
        : {};

    if (opts.force === true) {
      markStaleFn(
        id
      );
    }

    return await withPlayerLock(
      id,
      async () => {
        await restorePlayerStateFn(
          {
            getOrCreatePlayerState,
            updateServerTime
          },
          id,
          {
            force:
              opts.force === true
          }
        );

        const state =
          getOrCreatePlayerState(
            id
          );

        if (
          schedulePlayerDeadline
        ) {
          schedulePlayerDeadline(
            id,
            state
          );
        }

        if (
          opts.push === true &&
          pushStateToPlayerConnections
        ) {
          await pushStateToPlayerConnections(
            id,
            state
          );
        }

        return state;
      }
    );
  }

  async function publishInvalidation(
    runtimeBus,
    playerId,
    metadata = null
  ) {
    const id =
      metnAl(
        playerId,
        128
      );

    if (
      !id ||
      !runtimeBus ||
      typeof runtimeBus.publishToPlayer !==
        "function"
    ) {
      return false;
    }

    try {
      return await runtimeBus
        .publishToPlayer(
          id,
          runtimeStateInvalidationPayloadYarat(
            id,
            metadata
          )
        );
    }
    catch (error) {
      try {
        logger.error(
          "[RUNTIME_STATE_SYNC] Invalidation publish failed:",
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

  async function handleDirect(
    message
  ) {
    const payload =
      message &&
      message.payload;

    if (
      !runtimeStateInvalidationPayloadidir(
        payload
      )
    ) {
      return false;
    }

    const playerId =
      metnAl(
        (
          message &&
          message.playerId
        ) ||
        payload.playerId,
        128
      );

    if (!playerId) {
      return true;
    }

    markStaleFn(
      playerId
    );

    if (
      !hasLocalPlayer(
        playerId
      )
    ) {
      return true;
    }

    try {
      await ensureFresh(
        playerId,
        {
          force: true,
          push: true
        }
      );
    }
    catch (error) {
      try {
        logger.error(
          "[RUNTIME_STATE_SYNC] Remote state refresh failed:",
          {
            playerId,
            message:
              error && error.message
                ? error.message
                : String(error)
          }
        );
      }
      catch (_) {
      }
    }

    return true;
  }

  return {
    ensureFresh,
    publishInvalidation,
    handleDirect
  };
}

module.exports = {
  RUNTIME_STATE_INVALIDATION_TYPE,
  runtimeStateInvalidationPayloadYarat,
  runtimeStateInvalidationPayloadidir,
  runtimeStateSyncControllerYarat
};
