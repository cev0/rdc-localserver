"use strict";

const assert = require("assert");
const {
  oyuncuPublicSnapshotlariniHazirla,
  oyuncuKonvoylariniSinxronEtClient
} = require("./dovlet_konvoy_runtime_postgres");

function operationHazirla() {
  return {
    convoyId: "konvoy_1",
    playerId: "oyuncu_a",
    stateId: 1,
    targetType: "enemy",
    targetId: "state_1_enemy_1",
    targetLevel: 2,
    zoneId: "outer",
    fromX: 10,
    fromZ: 20,
    targetX: 30,
    targetZ: 40,
    startedAtMs: 1000,
    arrivalAtMs: 5000,
    actionEndsAtMs: 0,
    returnStartedAtMs: 0,
    returnEndsAtMs: 0,
    plannedActionEndsAtMs: 7000,
    plannedReturnEndsAtMs: 11000,
    travelDurationMs: 4000,
    status: "marching"
  };
}

function fakeClientHazirla(ilkinRuntime) {
  const sorqular = [];
  let yazilanRuntime = null;

  return {
    sorqular,
    yazilanRuntimeAl: () => yazilanRuntime,
    client: {
      async query(sql, parametrler = []) {
        const temizSql = String(sql || "").replace(/\s+/g, " ").trim();
        sorqular.push({ sql: temizSql, parametrler });

        if (temizSql.startsWith("SELECT detallar")) {
          return ilkinRuntime
            ? {
                rows: [
                  {
                    detallar: {
                      version: 2,
                      runtime: JSON.parse(JSON.stringify(ilkinRuntime))
                    }
                  }
                ]
              }
            : { rows: [] };
        }

        if (temizSql.startsWith("INSERT INTO hesab_audit_jurnali")) {
          const detallar = JSON.parse(parametrler[2]);
          yazilanRuntime = detallar.runtime;
          return { rowCount: 1, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      }
    }
  };
}

(async function testleriIcraEt() {
  {
    const fake = fakeClientHazirla(null);
    const netice = await oyuncuKonvoylariniSinxronEtClient(
      fake.client,
      1,
      "OYUNCU_A",
      {
        konvoy_1: operationHazirla()
      },
      2000
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, true);
    assert.strictEqual(netice.count, 1);

    const sql = fake.sorqular.map(x => x.sql);
    assert.ok(sql[0].startsWith("SELECT pg_advisory_xact_lock"));
    assert.ok(sql[1].startsWith("SELECT detallar"));
    assert.ok(sql[2].startsWith("INSERT INTO hesab_audit_jurnali"));
    assert.ok(sql[3].startsWith("DELETE FROM hesab_audit_jurnali"));
    assert.ok(!sql.includes("BEGIN"));
    assert.ok(!sql.includes("COMMIT"));
    assert.ok(!sql.includes("ROLLBACK"));

    assert.deepStrictEqual(
      fake.sorqular[0].parametrler,
      ["dovlet_konvoy_runtime_v1", 1]
    );

    const runtime = fake.yazilanRuntimeAl();
    assert.ok(runtime);
    assert.strictEqual(runtime.stateId, 1);
    assert.ok(runtime.items["oyuncu_a:konvoy_1"]);
    assert.strictEqual(
      runtime.items["oyuncu_a:konvoy_1"].targetId,
      "state_1_enemy_1"
    );
  }

  {
    const hazir = oyuncuPublicSnapshotlariniHazirla(
      1,
      "oyuncu_a",
      { konvoy_1: operationHazirla() },
      1000
    );

    assert.strictEqual(hazir.success, true);

    const ilkinRuntime = {
      version: 2,
      stateId: 1,
      items: {
        "oyuncu_a:konvoy_1": hazir.snapshots[0],
        "oyuncu_b:konvoy_1": {
          publicId: "oyuncu_b:konvoy_1",
          playerId: "oyuncu_b",
          convoyId: "konvoy_1",
          stateId: 1,
          status: "marching",
          updatedAtMs: 500
        }
      }
    };

    const fake = fakeClientHazirla(ilkinRuntime);
    const netice = await oyuncuKonvoylariniSinxronEtClient(
      fake.client,
      1,
      "oyuncu_a",
      { konvoy_1: operationHazirla() },
      9000
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, false);
    assert.strictEqual(netice.count, 1);
    assert.strictEqual(fake.yazilanRuntimeAl(), null);

    const sql = fake.sorqular.map(x => x.sql);
    assert.strictEqual(sql.length, 2);
    assert.ok(sql[0].startsWith("SELECT pg_advisory_xact_lock"));
    assert.ok(sql[1].startsWith("SELECT detallar"));
  }

  {
    const hazir = oyuncuPublicSnapshotlariniHazirla(
      1,
      "oyuncu_a",
      { konvoy_1: operationHazirla() },
      1000
    );

    const ilkinRuntime = {
      version: 2,
      stateId: 1,
      items: {
        "oyuncu_a:konvoy_1": hazir.snapshots[0],
        "oyuncu_b:konvoy_1": {
          publicId: "oyuncu_b:konvoy_1",
          playerId: "oyuncu_b",
          convoyId: "konvoy_1",
          stateId: 1,
          status: "marching",
          updatedAtMs: 500
        }
      }
    };

    const fake = fakeClientHazirla(ilkinRuntime);
    const netice = await oyuncuKonvoylariniSinxronEtClient(
      fake.client,
      1,
      "oyuncu_a",
      {},
      10000
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, true);
    assert.strictEqual(netice.count, 0);

    const runtime = fake.yazilanRuntimeAl();
    assert.ok(runtime);
    assert.strictEqual(runtime.items["oyuncu_a:konvoy_1"], undefined);
    assert.ok(runtime.items["oyuncu_b:konvoy_1"]);
  }

  {
    let xetaAtildi = false;
    try {
      await oyuncuKonvoylariniSinxronEtClient(
        null,
        1,
        "oyuncu_a",
        {},
        1000
      );
    }
    catch (xeta) {
      xetaAtildi = true;
      assert.ok(xeta.message.includes("PostgreSQL client"));
    }
    assert.strictEqual(xetaAtildi, true);
  }

  console.log("[DOVLET_KONVOY_RUNTIME_CLIENT_SYNC_TEST] OK");
})().catch(xeta => {
  console.error("[DOVLET_KONVOY_RUNTIME_CLIENT_SYNC_TEST] XETA", xeta);
  process.exitCode = 1;
});
