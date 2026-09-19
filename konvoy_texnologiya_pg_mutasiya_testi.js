"use strict";

const assert =
  require("assert");

const {
  KONVOY_TEXNOLOGIYA_BALANSI
} = require("./konvoy_qaydalari");

const {
  konvoyTexnologiyaStartMutasiyasiniTetbiqEt
} = require("./konvoy_texnologiya_handler");

const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

function kopyala(value) {
  return value == null
    ? value
    : JSON.parse(
        JSON.stringify(value)
      );
}

function stateHazirla(
  resources
) {
  return {
    playerId:
      "oyuncu_a",
    resources: {
      wood:
        resources.wood,
      iron:
        resources.iron,
      fuel:
        resources.fuel,
      money:
        resources.money
    },
    technology: {
      levels: {},
      currentResearch: null
    },
    buildings: [
      {
        instanceId: "hq-1",
        buildingId: "hq",
        level: 10,
        isCompleted: true,
        hasRoadAccess: true
      },
      {
        instanceId: "inst-a",
        buildingId: "institute",
        level: 5,
        isCompleted: true,
        hasRoadAccess: true
      }
    ],
    qehremanTapshiriqlari: {
      version: 2,
      technology: null,
      resources: [],
      development: []
    },
    heroes: [],
    serverSorquIdempotentliyi: {
      version: 1,
      items: []
    }
  };
}

function fakeHovuzHazirla(
  initialSnapshot
) {
  let snapshot =
    kopyala(
      initialSnapshot
    );

  const sorqular = [];
  let insertCount = 0;

  const client = {
    async query(
      sql,
      parametrler = []
    ) {
      const q =
        String(
          sql || ""
        )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      sorqular.push({
        sql: q,
        parametrler:
          kopyala(
            parametrler
          )
      });

      if (
        q === "BEGIN" ||
        q === "COMMIT" ||
        q === "ROLLBACK"
      ) {
        return {
          rows: []
        };
      }

      if (
        q.startsWith(
          "SELECT pg_advisory_xact_lock"
        )
      ) {
        return {
          rows: [{}]
        };
      }

      if (
        q.startsWith(
          "SELECT detallar"
        )
      ) {
        return snapshot
          ? {
              rows: [
                {
                  detallar: {
                    version: 1,
                    state:
                      kopyala(
                        snapshot
                      )
                  }
                }
              ]
            }
          : {
              rows: []
            };
      }

      if (
        q.startsWith(
          "INSERT INTO hesab_audit_jurnali"
        )
      ) {
        const detallar =
          JSON.parse(
            parametrler[2]
          );

        snapshot =
          kopyala(
            detallar.state
          );

        insertCount += 1;

        return {
          rowCount: 1,
          rows: []
        };
      }

      if (
        q.startsWith(
          "DELETE FROM hesab_audit_jurnali"
        )
      ) {
        return {
          rowCount: 0,
          rows: []
        };
      }

      throw new Error(
        "Gözlənilməyən SQL: " +
        q
      );
    },

    release() {}
  };

  return {
    hovuz: {
      async connect() {
        return client;
      }
    },

    sorqular,

    snapshotAl:
      () =>
        kopyala(
          snapshot
        ),

    insertCountAl:
      () =>
        insertCount
  };
}

(async () => {
  const balans =
    KONVOY_TEXNOLOGIYA_BALANSI
      .IKINCI_QEHRAMAN_YERI;

  assert.ok(
    balans &&
    balans.techId
  );

  const liveState =
    stateHazirla({
      wood: 9999,
      iron: 9999,
      fuel: 9999,
      money: 9999
    });

  const databaseState =
    stateHazirla({
      wood: 600,
      iron: 300,
      fuel: 100,
      money: 500
    });

  const fake =
    fakeHovuzHazirla(
      databaseState
    );

  const requestId =
    "req-konvoy-tech-1";

  const first =
    await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      "oyuncu_a",
      liveState,
      async lockedState =>
        konvoyTexnologiyaStartMutasiyasiniTetbiqEt(
          lockedState,
          balans.techId,
          requestId,
          1000
        ),
      {
        hovuz:
          fake.hovuz
      }
    );

  assert.strictEqual(
    first.success,
    true
  );

  assert.strictEqual(
    first.deyisdi,
    true
  );

  assert.strictEqual(
    first.idempotentReplay,
    false
  );

  assert.strictEqual(
    first.research.techId,
    balans.techId
  );

  /*
   * Stale RAM-dakı 9999 resurs deyil, PostgreSQL snapshot-dakı
   * 600/300/500 resurs authoritative başlanğıc olmalıdır.
   */
  assert.strictEqual(
    liveState.resources.wood,
    100
  );

  assert.strictEqual(
    liveState.resources.iron,
    100
  );

  assert.strictEqual(
    liveState.resources.money,
    100
  );

  assert.strictEqual(
    fake.insertCountAl(),
    1
  );

  const sql =
    fake.sorqular.map(
      x => x.sql
    );

  assert.strictEqual(
    sql[0],
    "BEGIN"
  );

  assert.ok(
    sql[1].startsWith(
      "SELECT pg_advisory_xact_lock"
    )
  );

  assert.ok(
    sql[2].startsWith(
      "SELECT detallar"
    )
  );

  assert.ok(
    sql.some(
      x =>
        x.startsWith(
          "INSERT INTO hesab_audit_jurnali"
        )
    )
  );

  assert.ok(
    sql.includes(
      "COMMIT"
    )
  );

  const replay =
    await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      "oyuncu_a",
      liveState,
      async lockedState =>
        konvoyTexnologiyaStartMutasiyasiniTetbiqEt(
          lockedState,
          balans.techId,
          requestId,
          2000
        ),
      {
        hovuz:
          fake.hovuz
      }
    );

  assert.strictEqual(
    replay.success,
    true
  );

  assert.strictEqual(
    replay.deyisdi,
    false
  );

  assert.strictEqual(
    replay.idempotentReplay,
    true
  );

  assert.strictEqual(
    replay.research.techId,
    balans.techId
  );

  assert.strictEqual(
    fake.insertCountAl(),
    1,
    "Eyni requestId replay-i ikinci dəfə snapshot yazmamalıdır."
  );

  const snapshot =
    fake.snapshotAl();

  assert.strictEqual(
    snapshot.technology
      .currentResearch.techId,
    balans.techId
  );

  assert.strictEqual(
    snapshot
      .serverSorquIdempotentliyi
      .items.length,
    1
  );

  console.log(
    "PASS: convoy technology research is PostgreSQL-authoritative and idempotent across stale RAM."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
