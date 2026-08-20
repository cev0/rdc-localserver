"use strict";

const assert = require("assert");
const {
  socketiQonaqOyuncuyaBagla,
  qonaqPlayerIdYarat
} = require("./qonaq_auth_handler");

const connections = new Map();
const ws = {
  _authedPlayerId: null,
  _accountSessionId: "kohne-session",
  _authKind: "account",
  _pendingPinChallengeId: "pin-1"
};

socketiQonaqOyuncuyaBagla(ws, "guest-123", connections);

assert.strictEqual(ws._authedPlayerId, "guest-123");
assert.strictEqual(ws._accountSessionId, null);
assert.strictEqual(ws._authKind, "guest");
assert.strictEqual(ws._pendingPinChallengeId, null);
assert.strictEqual(connections.get("guest-123"), ws);

const ikinciId = qonaqPlayerIdYarat();
assert.strictEqual(typeof ikinciId, "string");
assert.strictEqual(ikinciId.length, 24);
assert.match(ikinciId, /^[a-f0-9]+$/);

const kohneWs = { _authedPlayerId: "guest-old" };
connections.set("guest-old", kohneWs);
connections.set("guest-new", ws);
ws._authedPlayerId = "guest-new";

socketiQonaqOyuncuyaBagla(ws, "guest-final", connections);

assert.strictEqual(connections.has("guest-new"), false);
assert.strictEqual(connections.get("guest-final"), ws);
assert.strictEqual(connections.get("guest-old"), kohneWs);
assert.strictEqual(ws._authKind, "guest");

console.log("[QONAQ_AUTH_TEST] OK");
