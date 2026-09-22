"use strict";

const assert = require("assert");

const {
  payloadBarmaqIziAl,
  storeTeminEt,
  requestYoxla,
  requestNeticesiniQeydEt,
  stateIdempotencyExecutorYarat
} = require("./runtime_request_idempotency");

(function fingerprintContract() {
  const a =
    payloadBarmaqIziAl({
      type: "build_request",
      requestId: "req-a",
      x: 1,
      z: 2,
      nested: {
        b: 2,
        a: 1
      }
    });

  const b =
    payloadBarmaqIziAl({
      nested: {
        a: 1,
        b: 2
      },
      z: 2,
      requestId: "req-b",
      x: 1,
      type: "build_request"
    });

  assert.strictEqual(
    a,
    b,
    "requestId fingerprint-e daxil olmamalidir ve object key sirasi ferq yaratmamalidir."
  );
})();

(function recordReplayConflictContract() {
  const state = {};

  requestNeticesiniQeydEt(
    state,
    "build_request",
    "REQ-1",
    {
      type: "build_request",
      requestId: "REQ-1",
      buildingId: "farm",
      x: 10,
      z: 20
    },
    {
      responses: [
        {
          type: "build_placed",
          success: true
        }
      ],
      result: {
        ok: true
      }
    },
    1000
  );

  const replay =
    requestYoxla(
      state,
      "build_request",
      "REQ-1",
      {
        z: 20,
        x: 10,
        type: "build_request",
        requestId: "REQ-1",
        buildingId: "farm"
      },
      1500
    );

  assert.strictEqual(
    replay.replay,
    true
  );

  assert.strictEqual(
    replay.conflict,
    false
  );

  assert.deepStrictEqual(
    replay.responses,
    [
      {
        type: "build_placed",
        success: true
      }
    ]
  );

  const conflict =
    requestYoxla(
      state,
      "build_request",
      "REQ-1",
      {
        type: "build_request",
        requestId: "REQ-1",
        buildingId: "farm",
        x: 99,
        z: 20
      },
      1600
    );

  assert.strictEqual(
    conflict.replay,
    false
  );

  assert.strictEqual(
    conflict.conflict,
    true
  );
})();

(function ttlAndBoundContract() {
  const state = {
    serverRequestIdempotency: {
      version: 1,
      items: [
        {
          operationType: "build_request",
          requestId: "old",
          fingerprint: "x",
          completedAtMs: 1000,
          responses: []
        },
        {
          operationType: "build_request",
          requestId: "fresh",
          fingerprint: "y",
          completedAtMs: 9500,
          responses: []
        }
      ]
    }
  };

  const store =
    storeTeminEt(
      state,
      10000,
      {
        ttlMs: 1000,
        maxItems: 5
      }
    );

  assert.deepStrictEqual(
    store.items.map(
      x => x.requestId
    ),
    ["fresh"]
  );
})();

(async function executorContract() {
  const state = {
    playerId: "p1",
    resources: {
      wood: 100
    }
  };

  let mutationCount = 0;
  const sent = [];

  const executeIdempotent =
    stateIdempotencyExecutorYarat({
      getPlayerState:
        () => state,
      nowMs:
        () => 5000
    });

  const msg = {
    type: "upgrade_request",
    requestId: "upgrade-1",
    buildingInstanceId: "hq-1"
  };

  const send =
    (_ws, payload) => {
      sent.push(payload);
    };

  // Executor testini daha aydin saxlamaq ucun eyni socket obyektini ayrica qururuq.
  const ws = {
    id: "ws-1"
  };

  async function dispatchOnce(
    currentMsg
  ) {
    return await executeIdempotent({
      playerId: "p1",
      type: "upgrade_request",
      msg: currentMsg,
      ws,
      send,
      execute:
        async (wrappedSend) => {
          mutationCount += 1;
          state.resources.wood -= 25;

          wrappedSend(
            ws,
            {
              type: "upgrade_started",
              remainingWood:
                state.resources.wood
            }
          );
        }
    });
  }

  await dispatchOnce(msg);

  assert.strictEqual(
    mutationCount,
    1
  );

  assert.strictEqual(
    state.resources.wood,
    75
  );

  assert.strictEqual(
    sent.length,
    1
  );

  await dispatchOnce({
    ...msg
  });

  assert.strictEqual(
    mutationCount,
    1,
    "eyni requestId mutasiyani ikinci defe icra etmemelidir."
  );

  assert.strictEqual(
    state.resources.wood,
    75
  );

  assert.strictEqual(
    sent.length,
    2
  );

  assert.deepStrictEqual(
    sent[1],
    sent[0],
    "replay evvelki cavabi qaytarmalidir."
  );

  await dispatchOnce({
    ...msg,
    buildingInstanceId: "hq-2"
  });

  assert.strictEqual(
    mutationCount,
    1
  );

  assert.strictEqual(
    sent[sent.length - 1].code,
    "IDEMPOTENCY_CONFLICT"
  );

  console.log(
    "PASS: request idempotency fingerprint, replay, conflict, TTL and mutation executor."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
