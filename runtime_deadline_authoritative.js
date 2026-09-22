"use strict";

const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

function metnAl(
  value,
  max = 128
) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function authoritativeDeadlineProcessorYarat(
  options = {}
) {
  const getPlayerState =
    options.getPlayerState;

  const settlePlayerTimeline =
    options.settlePlayerTimeline;

  if (
    typeof getPlayerState !==
      "function"
  ) {
    throw new Error(
      "Deadline authoritative processor üçün getPlayerState yoxdur."
    );
  }

  if (
    typeof settlePlayerTimeline !==
      "function"
  ) {
    throw new Error(
      "Deadline authoritative processor üçün settlePlayerTimeline yoxdur."
    );
  }

  const withPlayerLock =
    typeof options.withPlayerLock ===
      "function"
      ? options.withPlayerLock
      : async (
          _playerId,
          operation
        ) =>
          await operation();

  const transactionExecutor =
    typeof options.transactionExecutor ===
      "function"
      ? options.transactionExecutor
      : oyuncuStateMutasiyasiniPostgresIleIcraEt;

  const publishInvalidation =
    typeof options.publishInvalidation ===
      "function"
      ? options.publishInvalidation
      : null;

  const nowMs =
    typeof options.nowMs ===
      "function"
      ? options.nowMs
      : () => Date.now();

  const logger =
    options.logger ||
    console;

  return async function processDeadline(
    playerId
  ) {
    const id =
      metnAl(
        playerId,
        128
      );

    if (!id) {
      return null;
    }

    const liveState =
      getPlayerState(
        id
      );

    if (
      !liveState ||
      typeof liveState !==
        "object"
    ) {
      return null;
    }

    let timelineResult =
      null;

    await withPlayerLock(
      id,
      async () => {
        await transactionExecutor(
          id,
          liveState,
          async (
            lockedState
          ) => {
            timelineResult =
              await settlePlayerTimeline(
                lockedState,
                id,
                nowMs()
              );

            return {
              deyisdi:
                !!(
                  timelineResult &&
                  timelineResult
                    .stateChanged ===
                    true
                )
            };
          }
        );

        if (
          timelineResult &&
          timelineResult.stateChanged ===
            true &&
          publishInvalidation
        ) {
          try {
            await publishInvalidation(
              id,
              {
                type:
                  "deadline_scheduler",
                committedAtMs:
                  nowMs()
              }
            );
          }
          catch (error) {
            try {
              logger.error(
                "[DEADLINE_AUTHORITATIVE] Invalidation publish failed:",
                error && error.message
                  ? error.message
                  : error
              );
            }
            catch (_) {
            }
          }
        }
      }
    );

    return timelineResult;
  };
}

module.exports = {
  authoritativeDeadlineProcessorYarat
};
