"use strict";

const assert = require("assert");
const {
  OYUNCU_STATE_KILID_ADI,
  oyuncuIdleriniKilidSirasiIleHazirla,
  postgresOyuncuKilidleriniSiraliAl
} = require("./oyun_state_mutasiya_postgres");

(async function testleriIcraEt() {
  assert.deepStrictEqual(
    oyuncuIdleriniKilidSirasiIleHazirla([
      " OYUNCU_B ",
      "oyuncu_a",
      "OYUNCU_B",
      "",
      null,
      "oyuncu_c"
    ]),
    ["oyuncu_a", "oyuncu_b", "oyuncu_c"]
  );

  {
    const sorqular = [];
    const client = {
      async query(sql, parametrler) {
        sorqular.push({
          sql: String(sql || "").replace(/\s+/g, " ").trim(),
          parametrler
        });
        return { rows: [] };
      }
    };

    const siralanmis = await postgresOyuncuKilidleriniSiraliAl(
      client,
      ["oyuncu_z", "OYUNCU_A", "oyuncu_m", "oyuncu_a"]
    );

    assert.deepStrictEqual(
      siralanmis,
      ["oyuncu_a", "oyuncu_m", "oyuncu_z"]
    );
    assert.strictEqual(sorqular.length, 3);

    assert.deepStrictEqual(
      sorqular.map(x => x.parametrler),
      [
        [OYUNCU_STATE_KILID_ADI, "oyuncu_a"],
        [OYUNCU_STATE_KILID_ADI, "oyuncu_m"],
        [OYUNCU_STATE_KILID_ADI, "oyuncu_z"]
      ]
    );

    for (const item of sorqular) {
      assert.ok(item.sql.startsWith("SELECT pg_advisory_xact_lock"));
    }
  }

  {
    let xeta = null;
    try {
      await postgresOyuncuKilidleriniSiraliAl(null, ["oyuncu_a"]);
    }
    catch (err) {
      xeta = err;
    }
    assert.ok(xeta);
    assert.ok(xeta.message.includes("client"));
  }

  {
    const client = {
      async query() {
        throw new Error("Boş playerId siyahısında SQL çağırılmamalıdır.");
      }
    };

    let xeta = null;
    try {
      await postgresOyuncuKilidleriniSiraliAl(client, ["", null, "   "]);
    }
    catch (err) {
      xeta = err;
    }
    assert.ok(xeta);
    assert.ok(xeta.message.includes("playerId"));
  }

  console.log("[OYUNCU_COX_KILID_TEST] OK");
})().catch(xeta => {
  console.error("[OYUNCU_COX_KILID_TEST] XETA", xeta);
  process.exitCode = 1;
});
