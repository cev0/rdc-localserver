"use strict";

const assert = require("assert");
const fs = require("fs");

const {
  DEFAULT_PRODUCTION_TICK_MS,
  ensureProductionClock,
  consumeProductionTicks
} = require("./runtime_production_clock");

(function productionClockRemainderContract() {
  const state = {};

  const runtime = ensureProductionClock(
    state,
    1000,
    DEFAULT_PRODUCTION_TICK_MS
  );

  assert.strictEqual(
    runtime.lastSettledAtMs,
    1000
  );

  assert.strictEqual(
    consumeProductionTicks(
      state,
      5999,
      DEFAULT_PRODUCTION_TICK_MS
    ).ticks,
    0
  );

  const first =
    consumeProductionTicks(
      state,
      6000,
      DEFAULT_PRODUCTION_TICK_MS
    );

  assert.strictEqual(first.ticks, 1);
  assert.strictEqual(
    first.lastSettledAtMs,
    6000
  );

  const second =
    consumeProductionTicks(
      state,
      16050,
      DEFAULT_PRODUCTION_TICK_MS
    );

  assert.strictEqual(second.ticks, 2);
  assert.strictEqual(
    second.lastSettledAtMs,
    16000
  );

  // 50 ms remainder itmemelidir.
  const third =
    consumeProductionTicks(
      state,
      20999,
      DEFAULT_PRODUCTION_TICK_MS
    );

  assert.strictEqual(third.ticks, 0);

  const fourth =
    consumeProductionTicks(
      state,
      21000,
      DEFAULT_PRODUCTION_TICK_MS
    );

  assert.strictEqual(fourth.ticks, 1);
  assert.strictEqual(
    fourth.lastSettledAtMs,
    21000
  );
})();

(function legacyStateInitializesWithoutFreeOfflineReward() {
  const legacy = {
    resources: {
      food: 10
    }
  };

  const result =
    consumeProductionTicks(
      legacy,
      500000,
      DEFAULT_PRODUCTION_TICK_MS
    );

  assert.strictEqual(result.ticks, 0);
  assert.strictEqual(
    legacy.productionRuntime.lastSettledAtMs,
    500000
  );
})();

(function serverIntegrationContract() {
  const serverCode =
    fs.readFileSync(
      require.resolve("./server.js"),
      "utf8"
    );

  assert.ok(
    serverCode.includes(
      "delete clientState.productionRuntime;"
    ),
    "productionRuntime client payload-dan silinmelidir."
  );

  const missiyaCode =
    fs.readFileSync(
      require.resolve("./missiya_handler.js"),
      "utf8"
    );

  assert.ok(
    !serverCode.includes(
      'case "save_state"'
    ),
    "legacy save_state server.js switch-ine geri qayitmamalidir."
  );

  assert.ok(
    missiyaCode.includes(
      "clientStateIgnored: true"
    ) &&
    missiyaCode.includes(
      "serverAuthoritative: true"
    ),
    "save_state client payload server state-inin uzerine yazilmamalidir."
  );

  assert.ok(
    serverCode.includes(
      "settlePlayerTimeline("
    ),
    "offline timed event + production timeline settlement olmalidir."
  );

  assert.ok(
    !serverCode.includes(
      "processProductionForAllPlayers();"
    ),
    "global production player scan geri qayitmamalidir."
  );
})();

console.log(
  "PASS: lazy production clock, remainder, migration and server integration."
);
