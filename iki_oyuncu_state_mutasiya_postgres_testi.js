"use strict";

const assert = require("assert");
const {
  ikiOyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./iki_oyuncu_state_mutasiya_postgres");

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function fakeHovuzHazirla(snapshotByPlayerId) {
  const sorqular = [];
  const yazilanSnapshotlar = {};
  let releaseSayi = 0;

  const client = {
    async query(sql, parametrler = []) {
      const temizSql = String(sql || "")
        .replace(/\s+/g, " ")
        .trim();

      sorqular.push({ sql: temizSql, parametrler: kopyala(parametrler) });

      if (temizSql === "BEGIN" || temizSql === "COMMIT" || temizSql === "ROLLBACK") {
        return { rows: [] };
      }

      if (temizSql.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rows: [{ pg_advisory_xact_lock: null }] };
      }

      if (temizSql.startsWith("SELECT detallar")) {
        const playerId = String(parametrler[0] || "").trim().toLowerCase();
        const snapshot = snapshotByPlayerId[playerId];
        return snapshot
          ? {
              rows: [
                {
                  detallar: {
                    version: 1,
                    state: kopyala(snapshot)
                  }
                }
              ]
            }
          : { rows: [] };
      }

      if (temizSql.startsWith("INSERT INTO hesab_audit_jurnali")) {
        const playerId = String(parametrler[0] || "").trim().toLowerCase();
        const detallar = JSON.parse(parametrler[2]);
        yazilanSnapshotlar[playerId] = kopyala(detallar.state);
        return { rowCount: 1, rows: [] };
      }

      if (temizSql.startsWith("DELETE FROM hesab_audit_jurnali")) {
        return { rowCount: 0, rows: [] };
      }

      throw new Error(`Gözlənilməyən SQL: ${temizSql}`);
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
    yazilanSnapshotlar,
    releaseSayiniAl: () => releaseSayi
  };
}

(async function testleriIcraEt() {
  {
    const canliA = {
      playerId: "oyuncu_a",
      resources: { money: 10 },
      yeniDefault: { enabled: true }
    };
    const canliB = {
      playerId: "oyuncu_b",
      resources: { money: 20 }
    };

    const fake = fakeHovuzHazirla({
      oyuncu_a: {
        playerId: "oyuncu_a",
        resources: { money: 100 }
      },
      oyuncu_b: {
        playerId: "oyuncu_b",
        resources: { money: 200 }
      }
    });

    const netice = await ikiOyuncuStateMutasiyasiniPostgresIleIcraEt(
      { playerId: "OYUNCU_B", cariState: canliB },
      { playerId: "oyuncu_a", cariState: canliA },
      async (stateler, transaction) => {
        assert.deepStrictEqual(
          transaction.playerIds,
          ["oyuncu_a", "oyuncu_b"]
        );

        // PostgreSQL snapshot authoritative qalmalı, canlı state-dən yalnız
        // çatışmayan default sahələr əlavə olunmalıdır.
        assert.strictEqual(stateler.oyuncu_a.resources.money, 100);
        assert.deepStrictEqual(
          stateler.oyuncu_a.yeniDefault,
          { enabled: true }
        );

        stateler.oyuncu_a.resources.money += 5;
        stateler.oyuncu_b.resources.money -= 7;

        return {
          success: true,
          deyisenPlayerIdleri: ["oyuncu_b", "oyuncu_a"]
        };
      },
      { hovuz: fake.hovuz }
    );

    assert.strictEqual(netice.success, true);

    const lockParametrleri = fake.sorqular
      .filter(x => x.sql.startsWith("SELECT pg_advisory_xact_lock"))
      .map(x => x.parametrler[1]);

    assert.deepStrictEqual(
      lockParametrleri,
      ["oyuncu_a", "oyuncu_b"],
      "Input B,A olsa belə lock sırası A,B olmalıdır."
    );

    assert.strictEqual(fake.yazilanSnapshotlar.oyuncu_a.resources.money, 105);
    assert.strictEqual(fake.yazilanSnapshotlar.oyuncu_b.resources.money, 193);

    const insertPlayerIds = fake.sorqular
      .filter(x => x.sql.startsWith("INSERT INTO hesab_audit_jurnali"))
      .map(x => x.parametrler[0]);

    assert.deepStrictEqual(insertPlayerIds, ["oyuncu_a", "oyuncu_b"]);

    const commitIndex = fake.sorqular.findIndex(x => x.sql === "COMMIT");
    const sonInsertIndex = fake.sorqular
      .map(x => x.sql)
      .lastIndexOf("INSERT INTO hesab_audit_jurnali ( hesab_id, oyuncu_id, hadise_novu, detallar ) VALUES ( NULL, $1, $2, $3::jsonb )");
    assert.ok(commitIndex > sonInsertIndex);

    assert.strictEqual(canliA.resources.money, 105);
    assert.strictEqual(canliB.resources.money, 193);
    assert.strictEqual(fake.releaseSayiniAl(), 1);
  }

  {
    const canliA = {
      playerId: "oyuncu_a",
      resources: { money: 5 }
    };

    const fake = fakeHovuzHazirla({
      oyuncu_a: {
        playerId: "oyuncu_a",
        resources: { money: 50 }
      },
      oyuncu_b: {
        playerId: "oyuncu_b",
        resources: { money: 80 },
        army: { troops: { fighter_lv1: 10 } }
      }
    });

    const netice = await ikiOyuncuStateMutasiyasiniPostgresIleIcraEt(
      { playerId: "oyuncu_a", cariState: canliA },
      { playerId: "oyuncu_b", cariState: null },
      async stateler => {
        assert.strictEqual(stateler.oyuncu_b.resources.money, 80);
        stateler.oyuncu_b.resources.money = 81;
        return {
          success: true,
          deyisenPlayerIdleri: ["oyuncu_b"]
        };
      },
      { hovuz: fake.hovuz }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(fake.yazilanSnapshotlar.oyuncu_b.resources.money, 81);
    assert.strictEqual(fake.yazilanSnapshotlar.oyuncu_a, undefined);
    assert.strictEqual(canliA.resources.money, 50);
  }

  {
    const canliA = {
      playerId: "oyuncu_a",
      resources: { money: 1 }
    };
    const canliB = {
      playerId: "oyuncu_b",
      resources: { money: 2 }
    };
    const evvelkiA = kopyala(canliA);
    const evvelkiB = kopyala(canliB);

    const fake = fakeHovuzHazirla({
      oyuncu_a: {
        playerId: "oyuncu_a",
        resources: { money: 10 }
      },
      oyuncu_b: {
        playerId: "oyuncu_b",
        resources: { money: 20 }
      }
    });

    let xeta = null;
    try {
      await ikiOyuncuStateMutasiyasiniPostgresIleIcraEt(
        { playerId: "oyuncu_a", cariState: canliA },
        { playerId: "oyuncu_b", cariState: canliB },
        async stateler => {
          stateler.oyuncu_a.resources.money = 999;
          throw new Error("qesdli_test_xetasi");
        },
        { hovuz: fake.hovuz }
      );
    }
    catch (err) {
      xeta = err;
    }

    assert.ok(xeta);
    assert.strictEqual(xeta.message, "qesdli_test_xetasi");
    assert.ok(fake.sorqular.some(x => x.sql === "ROLLBACK"));
    assert.ok(!fake.sorqular.some(x => x.sql === "COMMIT"));
    assert.deepStrictEqual(canliA, evvelkiA);
    assert.deepStrictEqual(canliB, evvelkiB);
  }

  {
    const fake = fakeHovuzHazirla({
      oyuncu_a: { playerId: "oyuncu_a", resources: {} },
      oyuncu_b: { playerId: "oyuncu_b", resources: {} }
    });

    let xeta = null;
    try {
      await ikiOyuncuStateMutasiyasiniPostgresIleIcraEt(
        { playerId: "oyuncu_a", cariState: null },
        { playerId: "oyuncu_b", cariState: null },
        async () => ({
          success: true,
          deyisenPlayerIdleri: ["oyuncu_c"]
        }),
        { hovuz: fake.hovuz }
      );
    }
    catch (err) {
      xeta = err;
    }

    assert.ok(xeta);
    assert.ok(xeta.message.includes("naməlum dəyişən playerId"));
    assert.ok(fake.sorqular.some(x => x.sql === "ROLLBACK"));
  }

  {
    let xeta = null;
    try {
      await ikiOyuncuStateMutasiyasiniPostgresIleIcraEt(
        { playerId: "oyuncu_a", cariState: {} },
        { playerId: "OYUNCU_A", cariState: {} },
        async () => ({ success: true }),
        { hovuz: { connect: async () => { throw new Error("connect olmamalıdır"); } } }
      );
    }
    catch (err) {
      xeta = err;
    }

    assert.ok(xeta);
    assert.ok(xeta.message.includes("fərqli playerId"));
  }

  console.log("[IKI_OYUNCU_STATE_MUTASIYA_TEST] OK");
})().catch(xeta => {
  console.error("[IKI_OYUNCU_STATE_MUTASIYA_TEST] XETA", xeta);
  process.exitCode = 1;
});
