"use strict";

const assert = require("assert");

const {
  dinamikLayerRuntimeMelumatiniHazirla
} = require("./dovlet_xerite_layer_handler");

(function testleriIcraEt() {
  const runtime = {
    version: 2,
    stateId: 7,
    items: {
      "p1:c1": {
        publicId: "p1:c1",
        playerId: "p1",
        convoyId: "c1",
        stateId: 7,
        targetType: "player_base",
        targetPlayerId: "p2",
        fromX: 10,
        fromZ: 20,
        targetX: 100,
        targetZ: 200,
        status:
          "marching_to_player_base",
        updatedAtMs: 1000
      },

      "p2:c2": {
        publicId: "p2:c2",
        playerId: "p2",
        convoyId: "c2",
        stateId: 7,
        targetType: "player_base",
        targetPlayerId: "p1",
        targetX: 300,
        targetZ: 400,
        status:
          "camping_at_abandoned_target",
        campReason:
          "target_relocated",
        updatedAtMs: 1000
      },

      "other-state": {
        publicId: "p3:c3",
        playerId: "p3",
        convoyId: "c3",
        stateId: 8,
        status: "marching"
      }
    }
  };

  const p1 =
    dinamikLayerRuntimeMelumatiniHazirla(
      runtime,
      7,
      "p1",
      5000
    );

  assert.strictEqual(
    p1.version,
    2
  );

  assert.strictEqual(
    p1.layer,
    "dynamic"
  );

  assert.strictEqual(
    p1.stateId,
    7
  );

  assert.strictEqual(
    p1.readOnlyRuntime,
    true
  );

  assert.strictEqual(
    p1.convoys.length,
    1
  );

  assert.strictEqual(
    p1.camps.length,
    1
  );

  assert.strictEqual(
    p1.convoys[0].playerId,
    "p1"
  );

  assert.strictEqual(
    p1.convoys[0].isSelf,
    true
  );

  assert.strictEqual(
    p1.convoys[0].x,
    100
  );

  assert.strictEqual(
    p1.convoys[0].z,
    200
  );

  assert.strictEqual(
    p1.camps[0].playerId,
    "p2"
  );

  assert.strictEqual(
    p1.camps[0].isSelf,
    false
  );

  assert.strictEqual(
    p1.camps[0].isCampForMyOldBase,
    undefined,
    "Dynamic layer public camp modeli yalnız map üçün lazım olan sahələri daşımalıdır."
  );

  const p2 =
    dinamikLayerRuntimeMelumatiniHazirla(
      runtime,
      7,
      "p2",
      5000
    );

  assert.strictEqual(
    p2.convoys[0].isSelf,
    false
  );

  assert.strictEqual(
    p2.camps[0].isSelf,
    true
  );

  console.log(
    "[DOVLET_XERITE_LAYER_DYNAMIC_TEST] PostgreSQL runtime snapshot-dan per-player dynamic layer OK"
  );
})();
