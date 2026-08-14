"use strict";

const assert = require("assert");
const {
  KILID_ADI,
  dovletYerdeyismeKilidiniAlClient
} = require("./baza_yerdeyisme_dovlet_kilidi_postgres");

(async function testleriIcraEt() {
  assert.strictEqual(KILID_ADI, "dovlet_baza_yerdeyisme_v1");

  {
    const sorqular = [];
    const client = {
      async query(sql, parametrler = []) {
        sorqular.push({
          sql: String(sql || "").replace(/\s+/g, " ").trim(),
          parametrler
        });
        return { rows: [] };
      }
    };

    const stateId = await dovletYerdeyismeKilidiniAlClient(
      client,
      7
    );

    assert.strictEqual(stateId, 7);
    assert.strictEqual(sorqular.length, 1);
    assert.ok(
      sorqular[0].sql.startsWith("SELECT pg_advisory_xact_lock")
    );
    assert.deepStrictEqual(
      sorqular[0].parametrler,
      ["dovlet_baza_yerdeyisme_v1", 7]
    );
  }

  {
    const sorqular = [];
    const client = {
      async query(sql, parametrler = []) {
        sorqular.push({ sql, parametrler });
        return { rows: [] };
      }
    };

    const stateId = await dovletYerdeyismeKilidiniAlClient(
      client,
      0
    );

    assert.strictEqual(stateId, 1);
    assert.deepStrictEqual(
      sorqular[0].parametrler,
      ["dovlet_baza_yerdeyisme_v1", 1]
    );
  }

  {
    let xetaAtildi = false;

    try {
      await dovletYerdeyismeKilidiniAlClient(null, 1);
    }
    catch (xeta) {
      xetaAtildi = true;
      assert.ok(xeta.message.includes("PostgreSQL client"));
    }

    assert.strictEqual(xetaAtildi, true);
  }

  console.log("[DOVLET_YERDEYISME_KILIDI_CLIENT_TEST] OK");
})().catch(xeta => {
  console.error("[DOVLET_YERDEYISME_KILIDI_CLIENT_TEST] XETA", xeta);
  process.exitCode = 1;
});
