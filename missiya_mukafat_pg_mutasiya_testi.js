"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");
const {
  missiyaMukafatMutasiyasiniTetbiqEt
} = require("./missiya_handler");

function kopyala(deyer) {
  return deyer == null
    ? deyer
    : JSON.parse(JSON.stringify(deyer));
}

function stateHazirla(food) {
  return {
    playerId: "oyuncu_a",
    resources: {
      food,
      wood: 0,
      iron: 0,
      fuel: 0,
      water: 0,
      electricity: 0,
      money: 0,
      chips: 0
    },
    resourceCaps: {
      food: 1000
    },
    buildings: [
      {
        instanceId: "hq_1",
        buildingId: "hq",
        level: 1,
        isCompleted: true
      }
    ],
    missions: {
      version: 1,
      claimedRewardIds: [],
      eventCounters: {}
    }
  };
}

function fakeHovuzHazirla(secimler = {}) {
  const sorqular = [];
  const claimedIds = Array.isArray(secimler.claimedIds)
    ? secimler.claimedIds.map(x => String(x).toLowerCase())
    : [];
  const duplicateClaimIds = new Set(
    Array.isArray(secimler.duplicateClaimIds)
      ? secimler.duplicateClaimIds.map(x => String(x).toLowerCase())
      : []
  );
  let yazilanSnapshot = null;
  let auditYazmaSayi = 0;
  let releaseOlundu = false;

  const client = {
    async query(sql, parametrler = []) {
      const temizSql = String(sql || "")
        .replace(/\s+/g, " ")
        .trim();

      sorqular.push({
        sql: temizSql,
        parametrler: kopyala(parametrler)
      });

      if (temizSql.startsWith("SELECT detallar")) {
        return {
          rows: secimler.sonSnapshot
            ? [
                {
                  detallar: {
                    version: 1,
                    state: kopyala(secimler.sonSnapshot)
                  }
                }
              ]
            : []
        };
      }

      if (temizSql.startsWith("SELECT hadise_novu, detallar")) {
        return {
          rows: claimedIds.map(missionId => ({
            hadise_novu: "missiya_mukafat_alindi",
            detallar: { missionId }
          }))
        };
      }

      if (temizSql.startsWith("SELECT id")) {
        const missionId = String(parametrler[2] || "").toLowerCase();
        return {
          rows: duplicateClaimIds.has(missionId)
            ? [{ id: 1 }]
            : []
        };
      }

      if (temizSql.startsWith("INSERT INTO hesab_audit_jurnali")) {
        const hadiseNovu = parametrler[1];

        if (hadiseNovu === "missiya_mukafat_alindi") {
          if (secimler.auditInsertXetasi) {
            throw new Error("audit_insert_xetasi");
          }

          auditYazmaSayi += 1;
          return { rowCount: 1, rows: [] };
        }

        if (hadiseNovu === "oyun_state_snapshot_v1") {
          yazilanSnapshot = JSON.parse(parametrler[2]).state;
          return { rowCount: 1, rows: [] };
        }
      }

      return { rowCount: 0, rows: [] };
    },

    release() {
      releaseOlundu = true;
    }
  };

  return {
    hovuz: {
      async connect() {
        return client;
      }
    },
    sorqular,
    auditYazmaSayiniAl: () => auditYazmaSayi,
    yazilanSnapshotAl: () => kopyala(yazilanSnapshot),
    releaseOlundu: () => releaseOlundu
  };
}

async function claimEt(cariState, fake) {
  return await oyuncuStateMutasiyasiniPostgresIleIcraEt(
    "oyuncu_a",
    cariState,
    async (kilidliState, { client }) =>
      await missiyaMukafatMutasiyasiniTetbiqEt(
        kilidliState,
        "oyuncu_a",
        "M001",
        client
      ),
    { hovuz: fake.hovuz }
  );
}

(async function testleriIcraEt() {
  {
    const cariState = stateHazirla(5);
    const fake = fakeHovuzHazirla({
      sonSnapshot: stateHazirla(50)
    });

    const netice = await claimEt(cariState, fake);

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, true);
    assert.strictEqual(
      cariState.resources.food,
      250,
      "Reward köhnə RAM state-ə yox, kiliddən sonra oxunan son snapshot-a əlavə edilməlidir."
    );
    assert.ok(cariState.missions.claimedRewardIds.includes("m001"));
    assert.strictEqual(fake.auditYazmaSayiniAl(), 1);
    assert.strictEqual(fake.yazilanSnapshotAl().resources.food, 250);
    assert.strictEqual(fake.releaseOlundu(), true);

    const sql = fake.sorqular.map(x => x.sql);
    const lockIndeksi = sql.findIndex(x =>
      x.startsWith("SELECT pg_advisory_xact_lock")
    );
    const snapshotOxuIndeksi = sql.findIndex(x =>
      x.startsWith("SELECT detallar")
    );
    const auditYazIndeksi = fake.sorqular.findIndex(x =>
      x.sql.startsWith("INSERT INTO hesab_audit_jurnali") &&
      x.parametrler[1] === "missiya_mukafat_alindi"
    );
    const snapshotYazIndeksi = fake.sorqular.findIndex(x =>
      x.sql.startsWith("INSERT INTO hesab_audit_jurnali") &&
      x.parametrler[1] === "oyun_state_snapshot_v1"
    );
    const commitIndeksi = sql.indexOf("COMMIT");

    assert.ok(lockIndeksi >= 0);
    assert.ok(snapshotOxuIndeksi > lockIndeksi);
    assert.ok(auditYazIndeksi > snapshotOxuIndeksi);
    assert.ok(snapshotYazIndeksi > auditYazIndeksi);
    assert.ok(commitIndeksi > snapshotYazIndeksi);
  }

  {
    const cariState = stateHazirla(50);
    const fake = fakeHovuzHazirla({
      sonSnapshot: stateHazirla(50),
      duplicateClaimIds: ["m001"]
    });

    const netice = await claimEt(cariState, fake);

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.alreadyClaimed, true);
    assert.strictEqual(netice.deyisdi, false);
    assert.strictEqual(cariState.resources.food, 50);
    assert.strictEqual(fake.auditYazmaSayiniAl(), 0);
    assert.strictEqual(fake.yazilanSnapshotAl(), null);
    assert.ok(cariState.missions.claimedRewardIds.includes("m001"));
  }

  {
    const cariState = stateHazirla(5);
    const evvelkiState = kopyala(cariState);
    const fake = fakeHovuzHazirla({
      sonSnapshot: stateHazirla(50),
      auditInsertXetasi: true
    });

    await assert.rejects(
      async () => await claimEt(cariState, fake),
      /audit_insert_xetasi/
    );

    assert.deepStrictEqual(
      cariState,
      evvelkiState,
      "Audit və snapshot transaction rollback olanda canlı RAM state dəyişməməlidir."
    );
    assert.ok(fake.sorqular.some(x => x.sql === "ROLLBACK"));
    assert.ok(!fake.sorqular.some(x => x.sql === "COMMIT"));
    assert.strictEqual(fake.yazilanSnapshotAl(), null);
  }

  {
    const handlerKod = fs.readFileSync(
      path.join(__dirname, "missiya_handler.js"),
      "utf8"
    );

    assert.ok(
      handlerKod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
      "Mission reward ümumi PostgreSQL player mutation helper-i istifadə etməlidir."
    );
    assert.ok(
      !handlerKod.includes("missiyaMukafatVeSnapshotiniAtomikYaz"),
      "Köhnə stale-state reward snapshot yolu handler-dən çıxarılmalıdır."
    );
  }

  console.log("[MISSIYA_MUKAFAT_PG_MUTASIYA_TEST] OK");
})().catch(xeta => {
  console.error("[MISSIYA_MUKAFAT_PG_MUTASIYA_TEST] XETA", xeta);
  process.exitCode = 1;
});
