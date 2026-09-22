"use strict";

const assert = require("assert");

const {
  requestIdAl,
  correlatedSendYarat
} = require("./runtime_protocol_envelope");

(function requestIdContract() {
  assert.strictEqual(
    requestIdAl({
      requestId: "  ABC-123  "
    }),
    "ABC-123"
  );

  assert.strictEqual(
    requestIdAl({}),
    ""
  );

  assert.strictEqual(
    requestIdAl({
      requestId: 123
    }),
    ""
  );

  assert.strictEqual(
    requestIdAl({
      requestId: "x".repeat(200)
    }).length,
    128
  );
})();

(function correlatedSendContract() {
  const sent = [];

  const baseSend =
    (ws, payload) => {
      sent.push({
        ws,
        payload
      });
    };

  const ws = {
    id: "socket-1"
  };

  const send =
    correlatedSendYarat(
      baseSend,
      "req-1"
    );

  send(ws, {
    type: "pong"
  });

  assert.deepStrictEqual(
    sent[0].payload,
    {
      type: "pong",
      requestId: "req-1"
    }
  );

  send(ws, {
    type: "custom",
    requestId: "server-owned"
  });

  assert.strictEqual(
    sent[1].payload.requestId,
    "server-owned"
  );

  const plainSend =
    correlatedSendYarat(
      baseSend,
      ""
    );

  plainSend(ws, {
    type: "hello"
  });

  assert.deepStrictEqual(
    sent[2].payload,
    {
      type: "hello"
    }
  );
})();

console.log(
  "PASS: requestId normalization and correlated response envelope."
);
