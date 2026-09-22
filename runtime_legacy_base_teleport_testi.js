"use strict";

const assert = require("assert");

const {
  WORLD_STATE_TELEPORT_LOCK_NAME,
  worldStateTeleportKilidiniAl
} = require("./world_state_transaction_lock");

const {
  legacyBaseTeleportYoxla,
  legacyBaseTeleportKilidiniAl
} = require("./runtime_legacy_base_teleport");

(async () => {
  const runtime = {
    stateId: 7,
    localMap: {
      width: 1024,
      height: 1024,
      centerX: 512,
      centerZ: 512
    },
    centerBuilding: {
      x: 512,
      z: 512
    }
  };

  assert.strictEqual(
    legacyBaseTeleportYoxla({
      stateRuntime: runtime,
      playerId: "p1",
      targetBaseX: 100,
      targetBaseZ: 100,
      bases: []
    }).ok,
    true
  );

  assert.strictEqual(
    legacyBaseTeleportYoxla({
      stateRuntime: runtime,
      playerId: "p1",
      targetBaseX: 1024,
      targetBaseZ: 100,
      bases: []
    }).ok,
    false
  );

  assert.strictEqual(
    legacyBaseTeleportYoxla({
      stateRuntime: runtime,
      playerId: "p1",
      targetBaseX: 512,
      targetBaseZ: 512,
      bases: []
    }).ok,
    false
  );

  assert.strictEqual(
    legacyBaseTeleportYoxla({
      stateRuntime: runtime,
      playerId: "p1",
      targetBaseX: 100,
      targetBaseZ: 100,
      bases: [
        {
          playerId: "p2",
          baseX: 110,
          baseZ: 100
        }
      ]
    }).ok,
    false
  );

  assert.strictEqual(
    legacyBaseTeleportYoxla({
      stateRuntime: runtime,
      playerId: "p1",
      targetBaseX: 100,
      targetBaseZ: 100,
      bases: [
        {
          playerId: "p1",
          baseX: 100,
          baseZ: 100
        },
        {
          playerId: "p2",
          baseX: 200,
          baseZ: 200
        }
      ]
    }).ok,
    true,
    "öz köhnə snapshot mövqeyi collision sayılmamalıdır."
  );

  const queries = [];

  const client = {
    async query(sql, params) {
      queries.push({
        sql,
        params
      });

      return {
        rows: []
      };
    }
  };

  await worldStateTeleportKilidiniAl(
    client,
    7
  );

  await legacyBaseTeleportKilidiniAl(
    client,
    7
  );

  assert.strictEqual(
    queries.length,
    2
  );

  for (const query of queries) {
    assert.ok(
      query.sql.includes(
        "pg_advisory_xact_lock"
      )
    );

    assert.deepStrictEqual(
      query.params,
      [
        WORLD_STATE_TELEPORT_LOCK_NAME +
        ":7"
      ]
    );
  }

  console.log(
    "PASS: legacy and WorldV2 base teleports share one PostgreSQL state lock and collision rules."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
