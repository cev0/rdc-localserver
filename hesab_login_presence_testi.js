"use strict";

const assert = require("assert");

const {
  ConnectionRuntimeRegistry
} = require("./runtime_registry");

const {
  socketiOyuncuyaBagla,
  socketiPinGozlemeyeAl,
  runtimePresenceSil
} = require("./hesab_login_handler");

(async () => {
  const connections =
    new ConnectionRuntimeRegistry();

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

  const existingSocket = {
    id: "existing",
    _authedPlayerId: "player-a"
  };

  const movingSocket = {
    id: "moving",
    _authedPlayerId: null
  };

  connections.set(
    "player-a",
    existingSocket
  );

  await socketiOyuncuyaBagla(
    movingSocket,
    "player-a",
    "session-a",
    connections,
    runtimeBus
  );

  const playerASockets = [];

  connections.forEachSocket(
    "player-a",
    socket =>
      playerASockets.push(
        socket.id
      )
  );

  assert.deepStrictEqual(
    playerASockets.sort(),
    [
      "existing",
      "moving"
    ]
  );

  assert.deepStrictEqual(
    registerCalls,
    [
      "player-a"
    ]
  );

  await socketiOyuncuyaBagla(
    movingSocket,
    "player-b",
    "session-b",
    connections,
    runtimeBus
  );

  const playerAAfterMove = [];

  connections.forEachSocket(
    "player-a",
    socket =>
      playerAAfterMove.push(
        socket.id
      )
  );

  assert.deepStrictEqual(
    playerAAfterMove,
    [
      "existing"
    ],
    "Hesab dəyişəndə yalnız cari socket köhnə player registry-dən çıxmalıdır."
  );

  assert.strictEqual(
    connections.get("player-b"),
    movingSocket
  );

  assert.deepStrictEqual(
    unregisterCalls,
    [],
    "Köhnə player üçün başqa local socket qalırsa Redis presence silinməməlidir."
  );

  assert.deepStrictEqual(
    registerCalls,
    [
      "player-a",
      "player-b"
    ]
  );

  await socketiPinGozlemeyeAl(
    movingSocket,
    connections,
    "challenge-1",
    runtimeBus
  );

  assert.strictEqual(
    connections.has(
      "player-b"
    ),
    false
  );

  assert.strictEqual(
    movingSocket._authedPlayerId,
    null
  );

  assert.strictEqual(
    movingSocket._authKind,
    "pin_pending"
  );

  assert.deepStrictEqual(
    unregisterCalls,
    [
      "player-b"
    ],
    "Son local socket auth-dan çıxanda Redis presence dərhal silinməlidir."
  );

  assert.strictEqual(
    await runtimePresenceSil(
      runtimeBus,
      connections,
      "player-a"
    ),
    false,
    "Local socket qalan player üçün presence unregister edilməməlidir."
  );

  assert.deepStrictEqual(
    unregisterCalls,
    [
      "player-b"
    ]
  );

  connections.deleteIfCurrent(
    "player-a",
    existingSocket
  );

  assert.strictEqual(
    await runtimePresenceSil(
      runtimeBus,
      connections,
      "player-a"
    ),
    true
  );

  assert.deepStrictEqual(
    unregisterCalls,
    [
      "player-b",
      "player-a"
    ]
  );

  console.log(
    "PASS: account login/session binding preserves multi-socket registry and Redis presence lifecycle."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
