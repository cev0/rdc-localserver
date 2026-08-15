"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  konvoyEmeliyyatMutasiyasiniTetbiqEt
} = require("./konvoy_emeliyyat_handler");

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    worldPlacement: {
      stateId: 1,
      baseX: 10,
      baseZ: 10
    },
    konvoyEmeliyyatlari: {
      version: 3,
      activeByConvoy: {},
      history: []
    },
    serverSorquIdempotentliyi: {
      version: 1,
      items: []
    },
    army: {
      troops: {}
    },
    resources: {}
  };
}

function fakeClientHazirla() {
  const sorqular = [];
  let runtime = {
    version: 2,
    stateId: 1,
    items: {}
  };
  let yazmaSayi = 0;

  return {
    client: {
      async query(sql, parametrler = []) {
        const temizSql = String(sql || "")
          .replace(/\s+/g, " ")
          .trim();

        sorqular.push({ sql: temizSql, parametrler });

        if (temizSql.startsWith("SELECT pg_advisory_xact_lock")) {
          return { rows: [{ pg_advisory_xact_lock: null }] };
        }

        if (temizSql.startsWith("SELECT detallar")) {
          return {
            rows: [
              {
                detallar: {
                  version: 2,
                  runtime: kopyala(runtime)
                }
              }
            ]
          };
        }

        if (temizSql.startsWith("INSERT INTO hesab_audit_jurnali")) {
          const detallar = JSON.parse(parametrler[2]);
          runtime = kopyala(detallar.runtime);
          yazmaSayi += 1;
          return { rowCount: 1, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      }
    },
    sorqulariAl: () => sorqular.slice(),
    runtimeAl: () => kopyala(runtime),
    yazmaSayiniAl: () => yazmaSayi
  };
}

(async function testleriIcraEt() {
  {
    const state = stateHazirla();
    const fake = fakeClientHazirla();

    const netice = await konvoyEmeliyyatMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_operation_info_request",
      {},
      1000,
      fake.client
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, false);
    assert.ok(netice.info);

    const sql = fake.sorqulariAl().map(x => x.sql);
    assert.strictEqual(sql.length, 2);
    assert.ok(sql[0].startsWith("SELECT pg_advisory_xact_lock"));
    assert.ok(sql[1].startsWith("SELECT detallar"));
    assert.strictEqual(fake.yazmaSayiniAl(), 0);
  }

  {
    const state = stateHazirla();
    const fake = fakeClientHazirla();

    const ilk = await konvoyEmeliyyatMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_operation_start_request",
      {
        requestId: "REQ-START-001",
        convoyId: "KONVOY_1",
        targetType: "enemy",
        targetId: "state_1_enemy_1"
      },
      2000,
      fake.client
    );

    assert.strictEqual(ilk.success, true);
    assert.strictEqual(ilk.deyisdi, true);
    assert.strictEqual(ilk.requestId, "req-start-001");
    assert.strictEqual(ilk.idempotentReplay, false);
    assert.ok(ilk.operation);
    assert.strictEqual(ilk.operation.convoyId, "konvoy_1");
    assert.strictEqual(ilk.operation.targetType, "enemy");
    assert.ok(state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1);
    assert.strictEqual(state.serverSorquIdempotentliyi.items.length, 1);
    assert.strictEqual(fake.yazmaSayiniAl(), 1);

    const runtime = fake.runtimeAl();
    assert.ok(runtime.items["oyuncu_a:konvoy_1"]);

    const startdanSonra = kopyala(state);
    const yazmaSayiEvvel = fake.yazmaSayiniAl();

    const replay = await konvoyEmeliyyatMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_operation_start_request",
      {
        requestId: "req-start-001",
        convoyId: "konvoy_1",
        targetType: "enemy",
        targetId: "state_1_enemy_1"
      },
      2500,
      fake.client
    );

    assert.strictEqual(replay.success, true);
    assert.strictEqual(replay.deyisdi, false);
    assert.strictEqual(replay.idempotentReplay, true);
    assert.strictEqual(replay.requestId, "req-start-001");
    assert.deepStrictEqual(
      state,
      startdanSonra,
      "Replay ikinci dəfə konvoy əməliyyatı yaratmamalıdır."
    );
    assert.strictEqual(
      fake.yazmaSayiniAl(),
      yazmaSayiEvvel,
      "Eyni shared runtime replay zamanı yenidən yazılmamalıdır."
    );
  }

  {
    const state = stateHazirla();
    const fake = fakeClientHazirla();
    const evvelki = kopyala(state);

    const netice = await konvoyEmeliyyatMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_operation_start_request",
      {
        requestId: "",
        convoyId: "konvoy_2",
        targetType: "enemy",
        targetId: "yanlis_hedef"
      },
      3000,
      fake.client
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.deyisdi, false);
    assert.ok(netice.message);
    assert.deepStrictEqual(
      state,
      evvelki,
      "Uğursuz start state-də qismən dəyişiklik saxlamamalıdır."
    );
    assert.strictEqual(fake.sorqulariAl().length, 0);
    assert.strictEqual(fake.yazmaSayiniAl(), 0);
  }

  {
    const kod = fs.readFileSync(
      path.join(__dirname, "konvoy_emeliyyat_handler.js"),
      "utf8"
    );

    assert.ok(
      kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
      "Handler PostgreSQL player mutation helper istifadə etməlidir."
    );

    assert.ok(
      kod.includes("oyuncuKonvoylariniSinxronEtClient"),
      "Handler shared convoy runtime-ı transaction client ilə sync etməlidir."
    );

    assert.ok(
      !kod.includes("oyunStateIniYaddaSaxla"),
      "Köhnə ayrıca player snapshot save yolu handler-də qalmamalıdır."
    );

    assert.ok(
      !kod.includes("sharedKonvoylariSinxronEtTehlukesiz"),
      "Köhnə post-commit shared runtime sync yolu handler-də qalmamalıdır."
    );

    assert.ok(
      kod.includes("transaction && transaction.client"),
      "Shared runtime eyni player transaction client-i ilə işləməlidir."
    );
  }

  console.log("[KONVOY_EMELIYYAT_PG_MUTASIYA_TEST] OK");
})().catch(xeta => {
  console.error("[KONVOY_EMELIYYAT_PG_MUTASIYA_TEST] XETA", xeta);
  process.exitCode = 1;
});
