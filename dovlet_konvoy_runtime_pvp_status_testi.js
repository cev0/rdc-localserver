"use strict";

const assert = require("assert");
const {
  PVP_KAMP_STATUSU,
  PVP_YOLDA_STATUSU,
  PVP_DOYUSE_HAZIR_STATUSU,
  publicVeziyyetiHesabla
} = require("./dovlet_konvoy_runtime_postgres");

function esasOperation(status) {
  return {
    publicId: "oyuncu_a:konvoy_1",
    playerId: "oyuncu_a",
    convoyId: "konvoy_1",
    stateId: 1,
    targetType: "player_base",
    targetId: "oyuncu_b",
    targetPlayerId: "oyuncu_b",
    fromX: 10,
    fromZ: 20,
    targetX: 30,
    targetZ: 40,
    startedAtMs: 1000,
    arrivalAtMs: 3000,
    actionEndsAtMs: 0,
    returnStartedAtMs: 0,
    returnEndsAtMs: 0,
    plannedActionEndsAtMs: 0,
    plannedReturnEndsAtMs: 0,
    status
  };
}

(function yoldaInterpolasiyaTesti() {
  const netice = publicVeziyyetiHesabla(
    esasOperation(PVP_YOLDA_STATUSU),
    2000
  );

  // Mövcud davranış qorunur: çatana qədər public status generic marching-dir.
  assert.strictEqual(netice.status, "marching");
  assert.strictEqual(netice.progress01, 0.5);
  assert.strictEqual(netice.x, 20);
  assert.strictEqual(netice.z, 30);
  assert.strictEqual(netice.remainingMs, 1000);
})();

(function catmisAmmaResolverGozleyirTesti() {
  const netice = publicVeziyyetiHesabla(
    esasOperation(PVP_YOLDA_STATUSU),
    3500
  );

  assert.strictEqual(netice.status, PVP_YOLDA_STATUSU);
  assert.strictEqual(netice.x, 30);
  assert.strictEqual(netice.z, 40);
  assert.strictEqual(netice.progress01, 1);
  assert.strictEqual(netice.remainingMs, 0);
})();

(function doyuseHazirMovqeTesti() {
  const netice = publicVeziyyetiHesabla(
    esasOperation(PVP_DOYUSE_HAZIR_STATUSU),
    3500
  );

  assert.strictEqual(netice.status, PVP_DOYUSE_HAZIR_STATUSU);
  assert.strictEqual(netice.x, 30);
  assert.strictEqual(netice.z, 40);
  assert.strictEqual(netice.progress01, 1);
})();

(function kampMovqeTesti() {
  const operation = esasOperation(PVP_KAMP_STATUSU);
  operation.abandonedTarget = true;
  operation.campReason = "target_relocated";

  const netice = publicVeziyyetiHesabla(operation, 3500);

  assert.strictEqual(netice.status, PVP_KAMP_STATUSU);
  assert.strictEqual(netice.x, 30);
  assert.strictEqual(netice.z, 40);
  assert.strictEqual(netice.progress01, 1);
})();

(function normalKonvoyDavranisiQorunurTesti() {
  const operation = {
    ...esasOperation("returning"),
    targetType: "enemy",
    returnStartedAtMs: 4000,
    returnEndsAtMs: 6000
  };

  const netice = publicVeziyyetiHesabla(operation, 5000);

  assert.strictEqual(netice.status, "returning");
  assert.strictEqual(netice.progress01, 0.5);
  assert.strictEqual(netice.x, 20);
  assert.strictEqual(netice.z, 30);
  assert.strictEqual(netice.remainingMs, 1000);
})();

console.log("[DOVLET_KONVOY_RUNTIME_PVP_STATUS_TEST] OK");
