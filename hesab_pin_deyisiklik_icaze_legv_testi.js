"use strict";

const assert = require("assert");
const crypto = require("crypto");

const verilenlerBazasi = require("./verilenler_bazasi");
const esasHovuzAl = verilenlerBazasi.proqramHovuzunuAl;

const HESAB_ID = "hesab_pin_deyisiklik_1";
const PLAYER_ID = "oyuncu_pin_deyisiklik_1";
const CARI_PIN = "123456";
const YENI_PIN = "654321";
const PIN_DUZU = "pin-deyisiklik-test-duzu";

let aktivHovuz = null;

verilenlerBazasi.proqramHovuzunuAl = () => aktivHovuz;

const pinModulYolu = require.resolve("./hesab_pin_postgres");
delete require.cache[pinModulYolu];

const {
  pinTeyinEt,
  pinSil
} = require("./hesab_pin_postgres");

function sqlTemizle(sql) {
  return String(sql || "")
    .replace(/\s+/g, " ")
    .trim();
}

function pinHashYarat(pin) {
  const hash = crypto
    .scryptSync(String(pin), PIN_DUZU, 64)
    .toString("hex");

  return PIN_DUZU + ":" + hash;
}

function saxtaHovuzHazirla({
  icazeLegvindeXeta = false
} = {}) {
  const sorgular = [];
  let releaseSayi = 0;

  const client = {
    async query(sql, parametrler = []) {
      const temizSql = sqlTemizle(sql);

      sorgular.push({
        sql: temizSql,
        parametrler: [...parametrler]
      });

      if (
        temizSql.includes("FROM hesablar") &&
        temizSql.includes("FOR UPDATE")
      ) {
        return {
          rows: [{
            hesab_id: HESAB_ID,
            pin_hash: pinHashYarat(CARI_PIN),
            pin_sehv_cehd_sayi: 0,
            pin_blok_vaxti: null,
            status: "aktiv"
          }]
        };
      }

      if (
        icazeLegvindeXeta &&
        temizSql.startsWith(
          "UPDATE hesab_pin_icazeleri"
        )
      ) {
        throw new Error("saxta PIN icazə ləğv xətası");
      }

      return { rows: [] };
    },

    release() {
      releaseSayi++;
    }
  };

  return {
    hovuz: {
      async connect() {
        return client;
      }
    },
    sorgular,
    releaseSayiniAl: () => releaseSayi
  };
}

function legvSirasiYoxla(saxta, pinMutasiyaQaydasi) {
  const pinMutasiyaIndeksi = saxta.sorgular.findIndex(x =>
    x.sql.startsWith("UPDATE hesablar") &&
    x.sql.includes(pinMutasiyaQaydasi)
  );
  const berpaLegvIndeksi = saxta.sorgular.findIndex(x =>
    x.sql.startsWith("UPDATE hesab_pin_berpa_sorqulari")
  );
  const icazeLegvIndeksi = saxta.sorgular.findIndex(x =>
    x.sql.startsWith("UPDATE hesab_pin_icazeleri")
  );
  const commitIndeksi = saxta.sorgular.findIndex(x =>
    x.sql === "COMMIT"
  );

  assert.ok(pinMutasiyaIndeksi > 0);
  assert.ok(berpaLegvIndeksi > pinMutasiyaIndeksi);
  assert.ok(icazeLegvIndeksi > berpaLegvIndeksi);
  assert.ok(commitIndeksi > icazeLegvIndeksi);

  const berpaLegvi = saxta.sorgular[berpaLegvIndeksi];
  const icazeLegvi = saxta.sorgular[icazeLegvIndeksi];

  assert.ok(berpaLegvi.sql.includes("reset_token_hash = NULL"));
  assert.ok(
    berpaLegvi.sql.includes(
      "reset_token_bitme_vaxti = NULL"
    )
  );
  assert.deepStrictEqual(berpaLegvi.parametrler, [HESAB_ID]);
  assert.deepStrictEqual(icazeLegvi.parametrler, [HESAB_ID]);
  assert.strictEqual(saxta.releaseSayiniAl(), 1);
}

(async function testleriIcraEt() {
  try {
    {
      const saxta = saxtaHovuzHazirla();
      aktivHovuz = saxta.hovuz;

      const netice = await pinTeyinEt(
        PLAYER_ID,
        CARI_PIN,
        YENI_PIN
      );

      assert.strictEqual(netice.success, true);
      assert.strictEqual(netice.hasPin, true);
      legvSirasiYoxla(saxta, "pin_hash = $2");
    }

    {
      const saxta = saxtaHovuzHazirla();
      aktivHovuz = saxta.hovuz;

      const netice = await pinSil(
        PLAYER_ID,
        CARI_PIN
      );

      assert.strictEqual(netice.success, true);
      assert.strictEqual(netice.hasPin, false);
      legvSirasiYoxla(saxta, "pin_hash = NULL");
    }

    {
      const saxta = saxtaHovuzHazirla({
        icazeLegvindeXeta: true
      });
      aktivHovuz = saxta.hovuz;

      await assert.rejects(
        pinTeyinEt(
          PLAYER_ID,
          CARI_PIN,
          YENI_PIN
        ),
        /saxta PIN icazə ləğv xətası/
      );

      assert.ok(saxta.sorgular.some(x => x.sql === "ROLLBACK"));
      assert.ok(!saxta.sorgular.some(x => x.sql === "COMMIT"));
      assert.strictEqual(saxta.releaseSayiniAl(), 1);
    }

    console.log(
      "[PIN_DEYISIKLIK_ICAZE_LEGV_TEST] Köhnə PIN bərpa və həssas əməliyyat icazələri transaction daxilində ləğv olunur."
    );
  }
  finally {
    verilenlerBazasi.proqramHovuzunuAl = esasHovuzAl;
    delete require.cache[pinModulYolu];
  }
})().catch(xeta => {
  console.error(
    "[PIN_DEYISIKLIK_ICAZE_LEGV_TEST] Uğursuz:",
    xeta
  );
  process.exitCode = 1;
});
