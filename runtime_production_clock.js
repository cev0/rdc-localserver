"use strict";

const DEFAULT_PRODUCTION_TICK_MS = 5000;
const PRODUCTION_RUNTIME_KEY = "productionRuntime";

function reqemAl(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ensureProductionClock(
  state,
  targetTimeMs = Date.now(),
  tickMs = DEFAULT_PRODUCTION_TICK_MS
) {
  if (!state || typeof state !== "object") {
    return null;
  }

  const target = Math.max(
    0,
    Math.trunc(reqemAl(targetTimeMs, Date.now()))
  );

  const tick = Math.max(
    1,
    Math.trunc(reqemAl(tickMs, DEFAULT_PRODUCTION_TICK_MS))
  );

  let runtime = state[PRODUCTION_RUNTIME_KEY];

  if (
    !runtime ||
    typeof runtime !== "object" ||
    Array.isArray(runtime)
  ) {
    runtime = {};
    state[PRODUCTION_RUNTIME_KEY] = runtime;
  }

  const existing =
    Number(runtime.lastSettledAtMs);

  if (
    !Number.isFinite(existing) ||
    existing <= 0 ||
    existing > target + tick
  ) {
    runtime.lastSettledAtMs = target;
  }
  else {
    runtime.lastSettledAtMs =
      Math.max(0, Math.trunc(existing));
  }

  runtime.tickMs = tick;

  return runtime;
}

function consumeProductionTicks(
  state,
  targetTimeMs = Date.now(),
  tickMs = DEFAULT_PRODUCTION_TICK_MS
) {
  const target = Math.max(
    0,
    Math.trunc(reqemAl(targetTimeMs, Date.now()))
  );

  const runtime =
    ensureProductionClock(
      state,
      target,
      tickMs
    );

  if (!runtime) {
    return {
      ticks: 0,
      initialized: false,
      lastSettledAtMs: target,
      nextTickAtMs: target + Math.max(1, tickMs)
    };
  }

  const tick =
    Math.max(1, Math.trunc(runtime.tickMs));

  const last =
    Math.max(
      0,
      Math.trunc(
        Number(runtime.lastSettledAtMs) || target
      )
    );

  if (target <= last) {
    return {
      ticks: 0,
      initialized: true,
      lastSettledAtMs: last,
      nextTickAtMs: last + tick
    };
  }

  const elapsed = target - last;
  const ticks =
    Math.max(0, Math.floor(elapsed / tick));

  if (ticks > 0) {
    runtime.lastSettledAtMs =
      last + ticks * tick;
  }

  return {
    ticks,
    initialized: true,
    lastSettledAtMs:
      Number(runtime.lastSettledAtMs) || last,
    nextTickAtMs:
      (Number(runtime.lastSettledAtMs) || last) + tick
  };
}

module.exports = {
  DEFAULT_PRODUCTION_TICK_MS,
  PRODUCTION_RUNTIME_KEY,
  ensureProductionClock,
  consumeProductionTicks
};
