"use strict";

const assert = require("assert");
const { EventEmitter } = require("events");

const {
  websocketRuntimeConfigFromEnv,
  byteLengthAl,
  RuntimeWebSocketGuard
} = require("./runtime_ws_guard");

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1;
    this.bufferedAmount = 0;
    this.sent = [];
    this.closed = [];
    this.pingCount = 0;
    this.terminated = false;
  }

  send(payload) {
    this.sent.push(payload);
  }

  close(code, reason) {
    this.closed.push({
      code,
      reason
    });
  }

  ping() {
    this.pingCount += 1;
  }

  terminate() {
    this.terminated = true;
  }
}

(function configContract() {
  const config =
    websocketRuntimeConfigFromEnv({
      WS_MAX_PAYLOAD_BYTES: "2048",
      WS_RATE_PER_SECOND: "10",
      WS_RATE_BURST: "20",
      WS_HEARTBEAT_MS: "6000",
      WS_MAX_BUFFERED_BYTES: "131072"
    });

  assert.strictEqual(
    config.maxPayloadBytes,
    2048
  );

  assert.strictEqual(
    config.ratePerSecond,
    10
  );

  assert.strictEqual(
    config.rateBurst,
    20
  );

  assert.strictEqual(
    config.heartbeatMs,
    6000
  );

  assert.strictEqual(
    config.maxBufferedBytes,
    131072
  );

  assert.strictEqual(
    byteLengthAl("abc"),
    3
  );
})();

(function inboundRateAndPayloadContract() {
  const guard =
    new RuntimeWebSocketGuard({
      maxPayloadBytes: 32,
      ratePerSecond: 2,
      rateBurst: 2,
      heartbeatMs: 10000,
      maxBufferedBytes: 1024
    });

  const ws = new FakeSocket();

  guard.attach(ws, 1000);

  assert.strictEqual(
    guard.acceptInbound(
      ws,
      "a",
      1000
    ).ok,
    true
  );

  assert.strictEqual(
    guard.acceptInbound(
      ws,
      "b",
      1000
    ).ok,
    true
  );

  const limited =
    guard.acceptInbound(
      ws,
      "c",
      1000
    );

  assert.strictEqual(
    limited.ok,
    false
  );

  assert.strictEqual(
    limited.code,
    "RATE_LIMITED"
  );

  // 500 ms -> rate 2/s olduğuna görə 1 token geri gəlir.
  assert.strictEqual(
    guard.acceptInbound(
      ws,
      "d",
      1500
    ).ok,
    true
  );

  const oversize =
    guard.acceptInbound(
      ws,
      "x".repeat(33),
      2000
    );

  assert.strictEqual(
    oversize.ok,
    false
  );

  assert.strictEqual(
    oversize.code,
    "MESSAGE_TOO_LARGE"
  );
})();

(function backpressureContract() {
  const guard =
    new RuntimeWebSocketGuard({
      maxPayloadBytes: 1024,
      ratePerSecond: 10,
      rateBurst: 10,
      heartbeatMs: 10000,
      maxBufferedBytes: 64 * 1024
    });

  const ws = new FakeSocket();

  assert.strictEqual(
    guard.sendJson(
      ws,
      {
        type: "pong"
      }
    ),
    true
  );

  assert.deepStrictEqual(
    JSON.parse(ws.sent[0]),
    {
      type: "pong"
    }
  );

  ws.bufferedAmount =
    64 * 1024 + 1;

  assert.strictEqual(
    guard.sendJson(
      ws,
      {
        type: "state"
      }
    ),
    false
  );

  assert.strictEqual(
    ws.closed[0].code,
    1013
  );

  assert.strictEqual(
    guard.snapshot()
      .metrics
      .droppedBackpressure,
    1
  );
})();

(function heartbeatContract() {
  const guard =
    new RuntimeWebSocketGuard({
      maxPayloadBytes: 1024,
      ratePerSecond: 10,
      rateBurst: 10,
      heartbeatMs: 10000,
      maxBufferedBytes: 64 * 1024
    });

  const live = new FakeSocket();
  const stale = new FakeSocket();

  guard.attach(live, 1000);
  guard.attach(stale, 1000);

  const wss = {
    clients: new Set([
      live,
      stale
    ])
  };

  guard.heartbeatSweep(wss);

  assert.strictEqual(
    live.pingCount,
    1
  );

  assert.strictEqual(
    stale.pingCount,
    1
  );

  // live pong qaytarır, stale qaytarmır.
  live.emit("pong");

  guard.heartbeatSweep(wss);

  assert.strictEqual(
    live.terminated,
    false
  );

  assert.strictEqual(
    live.pingCount,
    2
  );

  assert.strictEqual(
    stale.terminated,
    true
  );

  assert.strictEqual(
    guard.snapshot()
      .metrics
      .terminatedStale,
    1
  );
})();

console.log(
  "PASS: WebSocket payload, rate, backpressure and heartbeat guard."
);
