"use strict";

function gozle(ms) {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, Math.max(0, Number(ms) || 0));

    if (timer && typeof timer.unref === "function") {
      timer.unref();
    }
  });
}

async function konvoyPublicProyeksiyaSinxronunuRetryIleIcraEt(options = {}) {
  const syncFn = options.syncFn;
  const refreshFn = options.refreshFn;
  const sleepFn = typeof options.sleepFn === "function"
    ? options.sleepFn
    : gozle;
  const logger = options.logger || console;
  const maxAttempts = Math.max(
    1,
    Math.min(
      5,
      Math.trunc(Number(options.maxAttempts) || 3)
    )
  );
  const retryDelayMs = Math.max(
    0,
    Math.trunc(Number(options.retryDelayMs) || 120)
  );

  if (typeof syncFn !== "function") {
    throw new Error("Convoy public projection syncFn yoxdur.");
  }

  if (typeof refreshFn !== "function") {
    throw new Error("Convoy public projection refreshFn yoxdur.");
  }

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const netice = await syncFn();

      if (!netice || netice.success !== true) {
        throw new Error(
          netice && netice.message
            ? netice.message
            : "Convoy public projection sync uğursuz oldu."
        );
      }

      await refreshFn(netice);

      return {
        success: true,
        attempts: attempt,
        result: netice
      };
    }
    catch (error) {
      lastError = error;

      if (attempt >= maxAttempts) {
        break;
      }

      await sleepFn(
        retryDelayMs * attempt
      );
    }
  }

  try {
    logger.error(
      "[KONVOY_RECALL_PUBLIC_SYNC]",
      lastError
    );
  }
  catch (_) {
  }

  return {
    success: false,
    attempts: maxAttempts,
    error: lastError
  };
}

module.exports = {
  konvoyPublicProyeksiyaSinxronunuRetryIleIcraEt
};
