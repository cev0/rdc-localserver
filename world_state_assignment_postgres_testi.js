"use strict";

const assert =
  require("assert");

const {
  WORLD_STATE_ASSIGNMENT_LOCK_NAME,
  worldStatePlacementEtibarlidir,
  spawnUyqundur,
  worldStatePlacementiniTeminEtClient
} = require("./world_state_assignment_postgres");

function kopyala(value) {
  return value == null
    ? null
    : JSON.parse(
        JSON.stringify(value)
      );
}

class FakeClient {
  constructor(options = {}) {
    this.metadata =
      new Map();

    for (
      const item of
      options.metadata || []
    ) {
      this.metadata.set(
        Number(item.state_id),
        kopyala(item)
      );
    }

    this.counts =
      new Map(
        options.counts || []
      );

    this.basesByState =
      new Map(
        options.basesByState || []
      );

    this.queries = [];
  }

  async query(
    sql,
    params = []
  ) {
    const text =
      String(sql || "")
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    this.queries.push({
      text,
      params:
        Array.from(params)
    });

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
        !this.metadata.has(
          stateId
        )
      ) {
        this.metadata.set(
          stateId,
          {
            state_id:
              stateId,
            created_at_ms:
              Number(params[1]),
            center_unlock_at_ms:
              Number(params[2]),
            display_name:
              String(params[3]),
            is_open: true,
            president_player_id:
              "",
            president_alliance_id:
              "",
            center_occupied_at_ms:
              0,
            revision: 0
          }
        );
      }

      return {
        rows: []
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
        this.metadata.get(
          stateId
        );

      if (
        row &&
        (
          Number(
            row.created_at_ms
          ) === 0 ||
          !String(
            row.display_name || ""
          )
        )
      ) {
        if (
          Number(
            row.created_at_ms
          ) === 0
        ) {
          row.created_at_ms =
            Number(params[1]);
        }

        if (
          !String(
            row.display_name || ""
          )
        ) {
          row.display_name =
            String(params[3]);
        }
      }

      return {
        rowCount:
          row ? 1 : 0,
        rows: []
      };
    }

    if (
      text.includes(
        "FROM dovlet_world_state_runtime"
      ) &&
      text.includes(
        "WHERE state_id = $1"
      )
    ) {
      const row =
        this.metadata.get(
          Number(params[0])
        );

      return {
        rows:
          row
            ? [
                kopyala(
                  row
                )
              ]
            : []
      };
    }

    if (
      text.includes(
        "FROM dovlet_world_state_runtime"
      ) &&
      text.includes(
        "ORDER BY state_id ASC"
      )
    ) {
      return {
        rows:
          Array.from(
            this.metadata.values()
          )
            .sort(
              (a, b) =>
                Number(
                  a.state_id
                ) -
                Number(
                  b.state_id
                )
            )
            .map(kopyala)
      };
    }

    if (
      text.includes(
        "COUNT(*)::integer AS player_count"
      )
    ) {
      return {
        rows:
          Array.from(
            this.counts.entries()
          )
            .map(
              ([stateId, count]) => ({
                state_id:
                  stateId,
                player_count:
                  count
              })
            )
      };
    }

    if (
      text.includes(
        "AS base_x"
      ) &&
      text.includes(
        "AS base_z"
      )
    ) {
      const sid =
        Number(params[1]);

      return {
        rows:
          (
            this.basesByState.get(
              sid
            ) ||
            []
          ).map(
            item => ({
              oyuncu_id:
                item.playerId,
              base_x:
                String(
                  item.baseX
                ),
              base_z:
                String(
                  item.baseZ
                )
            })
          )
      };
    }

    throw new Error(
      "Unexpected SQL: " +
      text
    );
  }
}

function metadataRow(
  stateId,
  createdAtMs = 1000
) {
  return {
    state_id:
      stateId,
    created_at_ms:
      createdAtMs,
    center_unlock_at_ms:
      createdAtMs +
      2592000000,
    display_name:
      "State#" +
      stateId,
    is_open: true,
    president_player_id:
      "",
    president_alliance_id:
      "",
    center_occupied_at_ms:
      0,
    revision: 0
  };
}

(async () => {
  assert.strictEqual(
    worldStatePlacementEtibarlidir({
      worldPlacement: {
        stateId: 1,
        baseX: 10,
        baseZ: 20
      }
    }),
    true
  );

  assert.strictEqual(
    worldStatePlacementEtibarlidir({
      worldPlacement: {
        stateId: 0,
        baseX: 10,
        baseZ: 20
      }
    }),
    false
  );

  assert.strictEqual(
    spawnUyqundur(
      {
        baseX: 100,
        baseZ: 100
      },
      [
        {
          baseX: 105,
          baseZ: 105
        }
      ],
      {
        width: 1024,
        height: 1024,
        centerX: 512,
        centerZ: 512,
        minBaseDistance: 18
      }
    ),
    false
  );

  {
    const client =
      new FakeClient();

    const state = {
      playerId: "p1"
    };

    const randomValues = [
      0,
      0,
      0.25,
      0.5
    ];

    const result =
      await worldStatePlacementiniTeminEtClient(
        client,
        state,
        "p1",
        10000,
        {
          randomFn:
            () =>
              randomValues.shift() ??
              0.75,
          centerUnlockDelayMs:
            1000
        }
      );

    assert.strictEqual(
      result.success,
      true
    );

    assert.strictEqual(
      result.deyisdi,
      true
    );

    assert.strictEqual(
      result.stateId,
      1
    );

    assert.strictEqual(
      state.worldPlacement
        .assignmentAuthority,
      "postgres_v1"
    );

    assert.strictEqual(
      state.worldPlacement
        .stateCreatedAtMs,
      10000
    );

    assert.strictEqual(
      state.worldPlacement
        .centerUnlockAtMs,
      11000
    );

    assert.strictEqual(
      state.worldMap
        .activeStateIdForNewPlayers,
      1
    );

    assert.ok(
      client.queries[0]
        .params[0] ===
        WORLD_STATE_ASSIGNMENT_LOCK_NAME,
      "Yeni oyunçu allocation-u əvvəl global PostgreSQL advisory lock almalıdır."
    );
  }

  {
    const client =
      new FakeClient({
        metadata: [
          metadataRow(
            1
          )
        ],
        counts: [
          [
            1,
            200
          ]
        ]
      });

    const state = {
      playerId: "p2",
      worldPlacement: {
        stateId: 1,
        baseX: 1,
        baseZ: 1
      }
    };

    const result =
      await worldStatePlacementiniTeminEtClient(
        client,
        state,
        "p2",
        20000,
        {
          force: true,
          softCap: 200,
          randomFn:
            () => 0.5,
          centerUnlockDelayMs:
            1000
        }
      );

    assert.strictEqual(
      result.stateId,
      2,
      "Global State soft-cap dolanda növbəti State yalnız PostgreSQL lock altında açılmalıdır."
    );

    assert.ok(
      client.metadata.has(
        2
      )
    );

    assert.strictEqual(
      state.worldPlacement.stateId,
      2
    );

    assert.strictEqual(
      state.worldPlacement
        .activeStateIdForNewPlayers,
      2
    );
  }

  {
    const client =
      new FakeClient({
        metadata: [
          metadataRow(
            3
          )
        ]
      });

    const state = {
      playerId: "existing",
      worldPlacement: {
        stateId: 3,
        baseX: 700,
        baseZ: 700,
        assignmentAuthority:
          "postgres_v1"
      }
    };

    const result =
      await worldStatePlacementiniTeminEtClient(
        client,
        state,
        "existing",
        30000
      );

    assert.strictEqual(
      result.deyisdi,
      false
    );

    assert.strictEqual(
      client.queries.length,
      0,
      "Etibarlı persistent placement lazımsız global assignment lock almamalıdır."
    );
  }

  console.log(
    "PASS: new-player State selection and spawn allocation are PostgreSQL-authoritative and soft-cap safe."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
