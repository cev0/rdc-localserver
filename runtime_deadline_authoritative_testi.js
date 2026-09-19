"use strict";

const assert =
  require("assert");

const {
  authoritativeDeadlineProcessorYarat
} = require("./runtime_deadline_authoritative");

function kopyala(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function yerindeEvezEt(
  target,
  source
) {
  for (
    const key of
    Object.keys(
      target
    )
  ) {
    delete target[key];
  }

  Object.assign(
    target,
    kopyala(source)
  );
}

(async () => {
  let databaseState = {
    playerId: "p1",
    due: true,
    completionCount: 0
  };

  const liveA = {
    playerId: "p1",
    due: true,
    completionCount: 0
  };

  const liveB = {
    playerId: "p1",
    due: true,
    completionCount: 0
  };

  const transactionEvents = [];
  const invalidations = [];

  let queue =
    Promise.resolve();

  function withPlayerLock(
    _playerId,
    operation
  ) {
    const previous =
      queue;

    let release;

    queue =
      new Promise(
        resolve => {
          release = resolve;
        }
      );

    return previous
      .then(
        async () => {
          try {
            return await operation();
          }
          finally {
            release();
          }
        }
      );
  }

  async function transactionExecutor(
    playerId,
    liveState,
    operation
  ) {
    transactionEvents.push(
      "BEGIN:" +
      playerId
    );

    const locked =
      kopyala(
        databaseState
      );

    const result =
      await operation(
        locked,
        {
          playerId
        }
      );

    if (
      result &&
      result.deyisdi === true
    ) {
      databaseState =
        kopyala(
          locked
        );
    }

    yerindeEvezEt(
      liveState,
      locked
    );

    transactionEvents.push(
      "COMMIT:" +
      playerId +
      ":" +
      (
        result &&
        result.deyisdi === true
          ? "changed"
          : "same"
      )
    );

    return result;
  }

  async function settlePlayerTimeline(
    state,
    _playerId,
    atMs
  ) {
    if (
      state.due !== true
    ) {
      return {
        stateChanged: false,
        builderChanged: false,
        completedResearchList: [],
        nextDueAtMs: null
      };
    }

    state.due = false;
    state.completionCount += 1;
    state.completedAtMs =
      atMs;

    return {
      stateChanged: true,
      builderChanged: true,
      completedResearchList: [
        {
          techId: "tech-a",
          targetLevel: 2
        }
      ],
      nextDueAtMs: null
    };
  }

  const nowValues = [
    1000,
    1001,
    1002,
    1003,
    1004,
    1005
  ];

  function nowMs() {
    return nowValues.shift() ||
      2000;
  }

  function processorYarat(
    liveState
  ) {
    return authoritativeDeadlineProcessorYarat({
      getPlayerState:
        playerId =>
          playerId === "p1"
            ? liveState
            : null,

      withPlayerLock,
      transactionExecutor,
      settlePlayerTimeline,
      nowMs,

      publishInvalidation:
        async (
          playerId,
          metadata
        ) => {
          invalidations.push({
            playerId,
            metadata
          });

          return true;
        },

      logger: {
        error() {}
      }
    });
  }

  const processorA =
    processorYarat(
      liveA
    );

  const processorB =
    processorYarat(
      liveB
    );

  const [
    resultA,
    resultB
  ] =
    await Promise.all([
      processorA("p1"),
      processorB("p1")
    ]);

  const changedResults =
    [
      resultA,
      resultB
    ].filter(
      result =>
        result &&
        result.stateChanged === true
    );

  assert.strictEqual(
    changedResults.length,
    1,
    "Eyni deadline iki instance-da oyansa belə yalnız bir authoritative mutation dəyişiklik etməlidir."
  );

  assert.strictEqual(
    databaseState.completionCount,
    1
  );

  assert.strictEqual(
    databaseState.due,
    false
  );

  assert.strictEqual(
    invalidations.length,
    1,
    "Yalnız real state dəyişikliyi cross-instance invalidation göndərməlidir."
  );

  assert.strictEqual(
    invalidations[0].playerId,
    "p1"
  );

  assert.strictEqual(
    invalidations[0]
      .metadata.type,
    "deadline_scheduler"
  );

  assert.ok(
    transactionEvents.includes(
      "COMMIT:p1:changed"
    )
  );

  assert.ok(
    transactionEvents.includes(
      "COMMIT:p1:same"
    )
  );

  assert.strictEqual(
    liveA.completionCount +
    liveB.completionCount >= 1,
    true
  );

  const missing =
    await processorA(
      "missing-player"
    );

  assert.strictEqual(
    missing,
    null
  );

  console.log(
    "PASS: background deadlines commit through player lock + PostgreSQL and duplicate instance wakeups are idempotent."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
