"use strict";

const assert = require("assert");
const {
  konvoyPublicProyeksiyaSinxronunuRetryIleIcraEt
} = require("./konvoy_public_projection_retry");

(async () => {
  {
    let syncCalls = 0;
    let refreshCalls = 0;
    const delays = [];

    const netice =
      await konvoyPublicProyeksiyaSinxronunuRetryIleIcraEt({
        maxAttempts: 3,
        retryDelayMs: 100,
        sleepFn: async ms => {
          delays.push(ms);
        },
        syncFn: async () => {
          syncCalls += 1;

          if (syncCalls < 3) {
            throw new Error("temporary postgres error");
          }

          return {
            success: true,
            deyisdi: true
          };
        },
        refreshFn: async () => {
          refreshCalls += 1;
          return true;
        },
        logger: {
          error() {}
        }
      });

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.attempts, 3);
    assert.strictEqual(syncCalls, 3);
    assert.strictEqual(refreshCalls, 1);
    assert.deepStrictEqual(delays, [100, 200]);
  }

  {
    let refreshCalls = 0;
    const errors = [];

    const netice =
      await konvoyPublicProyeksiyaSinxronunuRetryIleIcraEt({
        maxAttempts: 2,
        retryDelayMs: 1,
        sleepFn: async () => {},
        syncFn: async () => ({
          success: false,
          message: "projection write failed"
        }),
        refreshFn: async () => {
          refreshCalls += 1;
        },
        logger: {
          error(...args) {
            errors.push(args);
          }
        }
      });

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.attempts, 2);
    assert.strictEqual(refreshCalls, 0);
    assert.strictEqual(errors.length, 1);
  }

  console.log(
    "PASS: convoy public projection retry preserves async ACK path and retries transient sync failures."
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
