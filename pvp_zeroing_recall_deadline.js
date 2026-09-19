"use strict";

function tamEded(value) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : 0;
}

function pvpZeroingRecallPendingdir(state) {
  return !!(
    state &&
    state.pvpCity &&
    state.pvpCity.convoyRecallPending === true
  );
}

function pvpZeroingRecallDeadlineAtMs(
  state,
  nowMs = Date.now()
) {
  if (!pvpZeroingRecallPendingdir(state)) {
    return null;
  }

  const now =
    tamEded(nowMs) ||
    Date.now();

  const zeroedAtMs =
    tamEded(
      state &&
      state.pvpCity &&
      state.pvpCity.zeroedAtMs
    );

  return zeroedAtMs > 0
    ? Math.min(zeroedAtMs, now)
    : now;
}

async function pvpZeroingPendingRecalliniBerpaEt(
  options = {}
) {
  const state = options.state;
  const playerId =
    typeof options.playerId === "string"
      ? options.playerId.trim()
      : "";

  if (
    !playerId ||
    !pvpZeroingRecallPendingdir(state)
  ) {
    return {
      handled: false,
      success: true
    };
  }

  if (typeof options.recallFn !== "function") {
    throw new Error(
      "PvP zeroing pending recall üçün recallFn yoxdur."
    );
  }

  if (typeof options.refreshFn !== "function") {
    throw new Error(
      "PvP zeroing pending recall üçün refreshFn yoxdur."
    );
  }

  const now =
    tamEded(options.nowMs) ||
    Date.now();

  const recall =
    await options.recallFn(
      playerId,
      now
    );

  if (!recall || recall.success !== true) {
    throw new Error(
      recall && recall.message
        ? recall.message
        : "PvP zeroing pending convoy recall tamamlanmadı."
    );
  }

  const refreshed =
    await options.refreshFn(
      playerId
    );

  return {
    handled: true,
    success: true,
    recall,
    refreshed:
      refreshed || null
  };
}

module.exports = {
  pvpZeroingRecallPendingdir,
  pvpZeroingRecallDeadlineAtMs,
  pvpZeroingPendingRecalliniBerpaEt
};
