"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  clientStateQaydalariniTetbiqEt
} = require("./server_client_state_patch");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rdc-client-state-"));
const tempServer = path.join(tempDir, "server.js");

const fakeServerKod = `"use strict";\n\nfunction makeClientState(state) {\n  if (!state || typeof state !== "object") {\n    return null;\n  }\n\n  const clientState = JSON.parse(JSON.stringify(state));\n\n  if (\n    clientState.army &&\n    clientState.army.trainingQueues &&\n    !Array.isArray(clientState.army.trainingQueues)\n  ) {\n    clientState.army.trainingQueues = Object.values(clientState.army.trainingQueues);\n  }\n\n  return clientState;\n}\n\nmodule.exports = { makeClientState };\n`;

fs.writeFileSync(tempServer, fakeServerKod, "utf8");

assert.strictEqual(
  clientStateQaydalariniTetbiqEt(tempServer),
  true,
  "İlk patch faylı dəyişməlidir."
);

const patchedKod = fs.readFileSync(tempServer, "utf8");
assert.ok(patchedKod.includes("[CLIENT_TROOP_ALIAS_COMPAT]"));
assert.ok(patchedKod.includes("delete clientState.serverSorquIdempotentliyi;"));

// Eyni patch ikinci dəfə məzmunu dəyişməməlidir.
assert.strictEqual(
  clientStateQaydalariniTetbiqEt(tempServer),
  false,
  "Patch idempotent olmalıdır."
);

delete require.cache[require.resolve(tempServer)];
const { makeClientState } = require(tempServer);

const source = {
  serverSorquIdempotentliyi: { secret: true },
  army: {
    troops: {
      fighter_lv1: 2,
      warrior_t1: 5,
      shooter_lv1: 1,
      shooter_t1: 7,
      vehicle_lv1: 3,
      vehicle_t1: 4,
      warrior_t2: 9,
      shooter_t2: 6,
      vehicle_t2: 8
    },
    trainingQueues: {
      bina_1: {
        buildingInstanceId: "bina_1",
        unitId: "shooter_t1",
        count: 5,
        finishTimeMs: 12345
      }
    }
  }
};

const client = makeClientState(source);

assert.strictEqual(client.serverSorquIdempotentliyi, undefined);
assert.strictEqual(client.army.troops.fighter_lv1, 7);
assert.strictEqual(client.army.troops.shooter_lv1, 8);
assert.strictEqual(client.army.troops.vehicle_lv1, 7);
assert.strictEqual(client.army.troops.fighter_lv2, 9);
assert.strictEqual(client.army.troops.shooter_lv2, 6);
assert.strictEqual(client.army.troops.vehicle_lv2, 8);
assert.ok(Array.isArray(client.army.trainingQueues));
assert.strictEqual(client.army.trainingQueues.length, 1);

// Authoritative server source clone edilməzdən əvvəlki kimi qalmalıdır.
assert.strictEqual(source.army.troops.fighter_lv1, 2);
assert.strictEqual(source.army.troops.warrior_t1, 5);
assert.ok(!Array.isArray(source.army.trainingQueues));

fs.rmSync(tempDir, { recursive: true, force: true });

console.log("[SERVER_CLIENT_STATE_QOSUN_COMPAT_TEST] OK");
