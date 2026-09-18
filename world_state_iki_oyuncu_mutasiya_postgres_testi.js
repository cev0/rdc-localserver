"use strict";

const assert = require("assert");
const {
  WORLD_STATE_MUTATION_LOCK_NAME
} = require("./world_state_transaction_lock");
const {
  worldStateIkiOyuncuMutasiyasiniPostgresIleIcraEt
} = require("./world_state_iki_oyuncu_mutasiya_postgres");

function kopyala(v) {
  return v == null
    ? null
    : JSON.parse(JSON.stringify(v));
}

function fakeHovuzHazirla(snapshotByPlayerId) {
  const sorqular = [];
  const yazilan = {};
  let releaseSayi = 0;

  const client = {
    async query(sql, parametrler = []) {
      const temizSql = String(sql || "")
        .replace(/\s+/g, " ")
        .trim();

      sorqular.push({
        sql: temizSql,
        parametrler: kopyala(parametrler)
      });

      if (
        temizSql === "BEGIN" ||
        temizSql === "COMMIT" ||
        temizSql === "ROLLBACK"
      ) {
        return { rows: [] };
      }

      if (
        temizSql.startsWith(
          "SELECT pg_advisory_xact_lock"
        )
      ) {
        return { rows: [{}] };
      }

      if (
        temizSql.startsWith(
          "SELECT detallar"
        )
      ) {
        const playerId =
          String(
            parametrler[0] || ""
          ).trim().toLowerCase();

        const state =
          snapshotByPlayerId[playerId];

        return state
          ? {
              rows: [
                {
                  detallar: {
                    version: 1,
                    state: kopyala(state)
                  }
                }
              ]
            }
          : { rows: [] };
      }

      if (
        temizSql.startsWith(
          "INSERT INTO hesab_audit_jurnali"
        )
      ) {
        const playerId =
          String(
            parametrler[0] || ""
          ).trim().toLowerCase();

        yazilan[playerId] =
          JSON.parse(
            parametrler[2]
          ).state;

        return {
          rowCount: 1,
          rows: []
        };
      }

      if (
        temizSql.startsWith(
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
        temizSql
      );
    },

    release() {
      releaseSayi += 1;
    }
  };

  return {
    hovuz: {
      async connect() {
        return client;
      }
    },
    sorqular,
    yazilan,
    releaseSayiniAl:
      () => releaseSayi
  };
}

function stateHazirla(
  playerId,
  stateId,
  money
) {
  return {
    playerId,
    worldPlacement: {
      stateId,
      baseX: 10,
      baseZ: 20
    },
    resources: {
      money
    }
  };
}

(async () => {
  {
    const liveA =
      stateHazirla(
        "oyuncu_a",
        7,
        10
      );

    const liveB =
      stateHazirla(
        "oyuncu_b",
        7,
        20
      );

    const fake =
      fakeHovuzHazirla({
        oyuncu_a:
          stateHazirla(
            "oyuncu_a",
            7,
            100
          ),
        oyuncu_b:
          stateHazirla(
            "oyuncu_b",
            7,
            200
          )
      });

    const result =
      await worldStateIkiOyuncuMutasiyasiniPostgresIleIcraEt(
        {
          playerId:
            "oyuncu_b",
          cariState:
            liveB
        },
        {
          playerId:
            "oyuncu_a",
          cariState:
            liveA
        },
        async (
          stateler,
          trx
        ) => {
          assert.strictEqual(
            trx.worldStateLockHeld,
            true
          );

          assert.strictEqual(
            trx.worldStateId,
            7
          );

          assert.deepStrictEqual(
            trx.playerIds,
            [
              "oyuncu_a",
              "oyuncu_b"
            ]
          );

          stateler.oyuncu_a
            .resources.money += 5;

          stateler.oyuncu_b
            .resources.money -= 7;

          return {
            success: true,
            deyisenPlayerIdleri: [
              "oyuncu_a",
              "oyuncu_b"
            ]
          };
        },
        {
          hovuz:
            fake.hovuz
        }
      );

    assert.strictEqual(
      result.success,
      true
    );

    const stateLockIndex =
      fake.sorqular.findIndex(
        x =>
          x.sql.startsWith(
            "SELECT pg_advisory_xact_lock"
          ) &&
          x.parametrler.length === 1 &&
          x.parametrler[0] ===
            WORLD_STATE_MUTATION_LOCK_NAME +
            ":7"
      );

    const firstPlayerLockIndex =
      fake.sorqular.findIndex(
        x =>
          x.sql.startsWith(
            "SELECT pg_advisory_xact_lock"
          ) &&
          x.parametrler.length === 2
      );

    assert.ok(
      stateLockIndex >= 0
    );

    assert.ok(
      firstPlayerLockIndex >
        stateLockIndex,
      "Shared-world iki-oyunçu transaction əvvəl Dövlət, sonra oyunçu lock-larını almalıdır."
    );

    assert.strictEqual(
      liveA.resources.money,
      105
    );

    assert.strictEqual(
      liveB.resources.money,
      193
    );

    assert.strictEqual(
      fake.releaseSayiniAl(),
      1
    );
  }

  {
    const liveA =
      stateHazirla(
        "oyuncu_a",
        7,
        1
      );

    const liveB =
      stateHazirla(
        "oyuncu_b",
        7,
        2
      );

    const fake =
      fakeHovuzHazirla({
        oyuncu_a:
          stateHazirla(
            "oyuncu_a",
            9,
            10
          ),
        oyuncu_b:
          stateHazirla(
            "oyuncu_b",
            9,
            20
          )
      });

    let operationCount = 0;

    await worldStateIkiOyuncuMutasiyasiniPostgresIleIcraEt(
      {
        playerId:
          "oyuncu_a",
        cariState:
          liveA
      },
      {
        playerId:
          "oyuncu_b",
        cariState:
          liveB
      },
      async (
        _stateler,
        trx
      ) => {
        operationCount += 1;

        assert.strictEqual(
          trx.worldStateId,
          9
        );

        return {
          success: true,
          deyisenPlayerIdleri: []
        };
      },
      {
        hovuz:
          fake.hovuz
      }
    );

    const stateLockKeys =
      fake.sorqular
        .filter(
          x =>
            x.sql.startsWith(
              "SELECT pg_advisory_xact_lock"
            ) &&
            x.parametrler.length === 1
        )
        .map(
          x =>
            x.parametrler[0]
        );

    assert.deepStrictEqual(
      stateLockKeys,
      [
        WORLD_STATE_MUTATION_LOCK_NAME +
          ":7",
        WORLD_STATE_MUTATION_LOCK_NAME +
          ":9"
      ]
    );

    assert.ok(
      fake.sorqular.some(
        x =>
          x.sql ===
            "ROLLBACK"
      )
    );

    assert.strictEqual(
      operationCount,
      1,
      "Business əməliyyatı yalnız authoritative Dövlət lock-u altında icra olunmalıdır."
    );

    assert.strictEqual(
      liveA.worldPlacement.stateId,
      9
    );

    assert.strictEqual(
      liveB.worldPlacement.stateId,
      9
    );
  }

  {
    const liveA =
      stateHazirla(
        "oyuncu_a",
        7,
        1
      );

    const fake =
      fakeHovuzHazirla({
        oyuncu_a:
          stateHazirla(
            "oyuncu_a",
            7,
            10
          ),
        oyuncu_b:
          stateHazirla(
            "oyuncu_b",
            8,
            20
          )
      });

    await assert.rejects(
      () =>
        worldStateIkiOyuncuMutasiyasiniPostgresIleIcraEt(
          {
            playerId:
              "oyuncu_a",
            cariState:
              liveA
          },
          {
            playerId:
              "oyuncu_b",
            cariState:
              null
          },
          async () => {
            throw new Error(
              "operation işləməməlidir"
            );
          },
          {
            hovuz:
              fake.hovuz
          }
        ),
      /eyni Dövlətdə deyil/
    );

    assert.ok(
      fake.sorqular.some(
        x =>
          x.sql ===
            "ROLLBACK"
      )
    );

    assert.ok(
      !fake.sorqular.some(
        x =>
          x.sql ===
            "COMMIT"
      )
    );
  }

  console.log(
    "PASS: shared-world two-player PostgreSQL transaction uses State-first lock order and authoritative State validation."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
