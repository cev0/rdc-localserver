"use strict";

const assert = require("assert");

const {
  WORLD_STATE_CENTER_LOCK_NAME,
  worldStateCenterKilidiniAl,
  worldStateCenterMetadataAlClient,
  occupyStateCenterPostgresClient
} = require("./world_state_center_postgres");

class FakeClient {
  constructor() {
    this.rowsByState = new Map();
    this.queries = [];
  }

  async query(sql, params = []) {
    this.queries.push({
      sql:
        String(sql),
      params:
        Array.from(params)
    });

    const text =
      String(sql)
        .replace(/\s+/g, " ")
        .trim();

    if (
      text.startsWith(
        "SELECT pg_advisory_xact_lock"
      )
    ) {
      return {
        rows: [
          {
            pg_advisory_xact_lock:
              null
          }
        ]
      };
    }

    if (
      text.startsWith(
        "INSERT INTO dovlet_world_state_runtime"
      )
    ) {
      const stateId =
        Number(params[0]);

      if (
        !this.rowsByState.has(
          stateId
        )
      ) {
        this.rowsByState.set(
          stateId,
          {
            state_id:
              stateId,
            center_unlock_at_ms:
              Number(params[1]),
            president_player_id:
              "",
            president_alliance_id:
              "",
            center_occupied_at_ms:
              0,
            revision:
              0
          }
        );
      }

      return {
        rows: []
      };
    }

    if (
      text.startsWith(
        "SELECT state_id"
      ) &&
      text.includes(
        "FROM dovlet_world_state_runtime"
      )
    ) {
      const row =
        this.rowsByState.get(
          Number(params[0])
        );

      return {
        rows:
          row
            ? [
                {
                  ...row
                }
              ]
            : []
      };
    }

    if (
      text.startsWith(
        "UPDATE dovlet_world_state_runtime"
      )
    ) {
      const stateId =
        Number(params[0]);

      const row =
        this.rowsByState.get(
          stateId
        );

      if (!row) {
        return {
          rows: []
        };
      }

      row.president_player_id =
        String(
          params[1] || ""
        );

      row.president_alliance_id =
        String(
          params[2] || ""
        );

      row.center_occupied_at_ms =
        Number(params[3]) || 0;

      row.revision =
        Number(row.revision || 0) +
        1;

      return {
        rows: [
          {
            ...row
          }
        ]
      };
    }

    throw new Error(
      "Unexpected SQL: " + text
    );
  }
}

(async () => {
  const client =
    new FakeClient();

  await worldStateCenterKilidiniAl(
    client,
    7
  );

  assert.ok(
    client.queries[0]
      .params[0]
      .includes(
        WORLD_STATE_CENTER_LOCK_NAME +
        ":7"
      )
  );

  const locked =
    await occupyStateCenterPostgresClient(
      client,
      {
        stateId: 7,
        playerId: "player-1",
        allianceId: "alliance-1",
        centerUnlockAtMs: 5000,
        nowMs: 4999
      }
    );

  assert.strictEqual(
    locked.success,
    false
  );

  assert.strictEqual(
    locked.errorCode,
    "STATE_CENTER_LOCKED"
  );

  let metadata =
    await worldStateCenterMetadataAlClient(
      client,
      7
    );

  assert.strictEqual(
    metadata.centerUnlockAtMs,
    5000
  );

  assert.strictEqual(
    metadata.revision,
    0
  );

  const occupied =
    await occupyStateCenterPostgresClient(
      client,
      {
        stateId: 7,
        playerId: "player-1",
        allianceId: "alliance-1",
        centerUnlockAtMs: 9000,
        nowMs: 5000
      }
    );

  assert.strictEqual(
    occupied.success,
    true
  );

  assert.strictEqual(
    occupied.occupiedByPlayerId,
    "player-1"
  );

  assert.strictEqual(
    occupied.occupiedByAllianceId,
    "alliance-1"
  );

  assert.strictEqual(
    occupied.occupiedAtMs,
    5000
  );

  assert.strictEqual(
    occupied.centerUnlockAtMs,
    5000,
    "İlk persistent unlock vaxtı sonrakı instance dəyəri ilə overwrite edilməməlidir."
  );

  assert.strictEqual(
    occupied.revision,
    1
  );

  const occupiedAgain =
    await occupyStateCenterPostgresClient(
      client,
      {
        stateId: 7,
        playerId: "player-2",
        allianceId: "",
        centerUnlockAtMs: 5000,
        nowMs: 6000
      }
    );

  assert.strictEqual(
    occupiedAgain.success,
    true
  );

  assert.strictEqual(
    occupiedAgain.occupiedByPlayerId,
    "player-2"
  );

  assert.strictEqual(
    occupiedAgain.revision,
    2
  );

  metadata =
    await worldStateCenterMetadataAlClient(
      client,
      7
    );

  assert.strictEqual(
    metadata.presidentPlayerId,
    "player-2"
  );

  assert.strictEqual(
    metadata.revision,
    2
  );

  console.log(
    "PASS: persistent World state center lock, unlock time, ownership and revision."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
