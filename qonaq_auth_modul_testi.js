"use strict";

const assert = require("assert");

const {
  ConnectionRuntimeRegistry
} = require("./runtime_registry");

const {
  socketiQonaqOyuncuyaBagla,
  qonaqPlayerIdYarat,
  runtimePresenceQeydEt,
  runtimePresenceSil
} = require("./qonaq_auth_handler");

(async () => {
  {
    const connections = new Map();
    const ws = {
      _authedPlayerId: null,
      _accountSessionId:
        "kohne-session",
      _authKind: "account",
      _pendingPinChallengeId:
        "pin-1"
    };

    socketiQonaqOyuncuyaBagla(
      ws,
      "guest-123",
      connections
    );

    assert.strictEqual(
      ws._authedPlayerId,
      "guest-123"
    );

    assert.strictEqual(
      ws._accountSessionId,
      null
    );

    assert.strictEqual(
      ws._authKind,
      "guest"
    );

    assert.strictEqual(
      ws._pendingPinChallengeId,
      null
    );

    assert.strictEqual(
      connections.get(
        "guest-123"
      ),
      ws
    );

    const ikinciId =
      qonaqPlayerIdYarat();

    assert.strictEqual(
      typeof ikinciId,
      "string"
    );

    assert.strictEqual(
      ikinciId.length,
      24
    );

    assert.match(
      ikinciId,
      /^[a-f0-9]+$/
    );
  }

  {
    const connections =
      new ConnectionRuntimeRegistry();

    const existingSocket = {
      id: "existing",
      _authedPlayerId:
        "guest-old"
    };

    const movingSocket = {
      id: "moving",
      _authedPlayerId:
        "guest-old"
    };

    connections.set(
      "guest-old",
      existingSocket
    );

    connections.set(
      "guest-old",
      movingSocket
    );

    socketiQonaqOyuncuyaBagla(
      movingSocket,
      "guest-new",
      connections
    );

    const oldSockets = [];

    connections.forEachSocket(
      "guest-old",
      socket =>
        oldSockets.push(
          socket.id
        )
    );

    assert.deepStrictEqual(
      oldSockets,
      [
        "existing"
      ],
      "Guest reconnect/player switch başqa local socket-i registry-dən silməməlidir."
    );

    assert.strictEqual(
      connections.get(
        "guest-new"
      ),
      movingSocket
    );
  }

  {
    const connections =
      new ConnectionRuntimeRegistry();

    const socket = {
      id: "presence"
    };

    const registerCalls = [];
    const unregisterCalls = [];

    const runtimeBus = {
      async registerLocalPlayer(
        playerId
      ) {
        registerCalls.push(
          playerId
        );

        return true;
      },

      async unregisterLocalPlayer(
        playerId
      ) {
        unregisterCalls.push(
          playerId
        );

        return true;
      }
    };

    assert.strictEqual(
      await runtimePresenceQeydEt(
        runtimeBus,
        "guest-a"
      ),
      true
    );

    assert.deepStrictEqual(
      registerCalls,
      [
        "guest-a"
      ]
    );

    connections.set(
      "guest-a",
      socket
    );

    assert.strictEqual(
      await runtimePresenceSil(
        runtimeBus,
        connections,
        "guest-a"
      ),
      false,
      "Local socket qalırsa Redis presence silinməməlidir."
    );

    assert.deepStrictEqual(
      unregisterCalls,
      []
    );

    connections.deleteIfCurrent(
      "guest-a",
      socket
    );

    assert.strictEqual(
      await runtimePresenceSil(
        runtimeBus,
        connections,
        "guest-a"
      ),
      true
    );

    assert.deepStrictEqual(
      unregisterCalls,
      [
        "guest-a"
      ]
    );
  }

  console.log(
    "[QONAQ_AUTH_TEST] multi-socket registry və Redis presence OK"
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
