"use strict";

const assert = require("assert");
const {
  PlayerRuntimeRegistry,
  ConnectionRuntimeRegistry
} = require("./runtime_registry");

(function playerRegistryMapContract() {
  const players = new PlayerRuntimeRegistry();

  players.set("p1", { level: 1 });
  players.set("p2", { level: 2 });

  assert.strictEqual(players.size, 2);
  assert.strictEqual(players.has("p1"), true);
  assert.deepStrictEqual(players.get("p2"), { level: 2 });

  const ids = [];
  for (const [playerId] of players) {
    ids.push(playerId);
  }

  assert.deepStrictEqual(ids.sort(), ["p1", "p2"]);

  let levelTotal = 0;
  players.forEach((state) => {
    levelTotal += state.level;
  });

  assert.strictEqual(levelTotal, 3);
})();

(function connectionReconnectSafety() {
  const connections = new ConnectionRuntimeRegistry();
  const oldSocket = { id: "old" };
  const newSocket = { id: "new" };

  connections.set("p1", oldSocket);
  connections.set("p1", newSocket);

  const sockets = [];
  connections.forEachSocket("p1", (socket) => sockets.push(socket));
  assert.deepStrictEqual(sockets, [oldSocket, newSocket]);

  assert.strictEqual(
    connections.deleteIfCurrent("p1", oldSocket),
    true,
    "Kohne socket registry-den silinmelidir, amma yeni socket qalmalidir."
  );

  assert.strictEqual(connections.get("p1"), newSocket);
  assert.strictEqual(connections.has("p1"), true);

  assert.strictEqual(
    connections.deleteIfCurrent("p1", newSocket),
    true
  );

  assert.strictEqual(connections.has("p1"), false);
})();

console.log("PASS: runtime registry Map contract and reconnect safety.");
