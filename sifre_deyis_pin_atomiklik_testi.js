"use strict";

const assert = require("assert");

const verilenlerBazasi = require("./verilenler_bazasi");
const esasHovuzAl = verilenlerBazasi.proqramHovuzunuAl;

const HESAB_ID = "hesab_sifre_pin_atomik_1";
const PLAYER_ID = "oyuncu_sifre_pin_atomik_1";
const RESET_TOKEN = "r".repeat(64);
const PIN_TOKEN = "p".repeat(64);
const YENI_SIFRE = "YeniSifre_123";

let aktivHovuz = null;

verilenlerBazasi.proqramHovuzunuAl = () => aktivHovuz;

const resetModulYolu = require.resolve(
  "./sifre_sifirlama_postgres"
);
const icazeModulYolu = require.resolve(
  "./hesab_pin_icaze_postgres"
);
const deyisModulYolu = require.resolve(
  "./sifre_deyis_pin_postgres"
);

delete require.cache[resetModulYolu];
delete require.cache[icazeModulYolu];
delete require.cache[deyisModulYolu];

const {
  pinQorumaliSifreDeyis
} = require("./sifre_deyis_pin_postgres");

function sqlTemizle(sql) {
  return String(sql || "")
    .replace(/\s+/g, " ")
    .trim();
}

function saxtaHovuzHazirla({
  resetTapildi = true,
  pinHash = "saxta-pin-hash",
  icazeBitmeVaxti = "2999-01-01T00:00:00.000Z",
  mutasiyaXetasi = false
} = {}) {
  const sorgular = [];
  let connectSayi = 0;
  let releaseSayi = 0;
  let poolQuerySayi = 0;

  const client = {
    async query(sql, parametrler = []) {
      const temizSql = sqlTemizle(sql);

      sorgular.push({
        sql: temizSql,
        parametrler: [...parametrler]
      });

      if (
        temizSql.includes("FROM sifre_sifirlama_sorqulari s") &&
        temizSql.includes("JOIN hesablar h") &&
        temizSql.includes("FOR UPDATE OF s, h")
      ) {
        return {
          rows: resetTapildi
            ? [{
                sorqu_id: "sorqu_sifre_pin_atomik_1",
                hesab_id: HESAB_ID,
                oyuncu_id: PLAYER_ID,
                esas_email: "sifre-pin@example.test",
                pin_hash: pinHash,
                status: "aktiv"
              }]
            : []
        };
      }

      if (
        temizSql.includes("FROM hesab_pin_icazeleri") &&
        temizSql.includes("FOR UPDATE")
      ) {
        return {
          rows: [{
            icaze_id: "icaze_sifre_pin_atomik_1",
            hesab_id: HESAB_ID,
            bitme_vaxti: icazeBitmeVaxti,
            istifade_vaxti: null
          }]
        };
      }

      if (
        mutasiyaXetasi &&
        temizSql.startsWith("UPDATE hesablar") &&
        temizSql.includes("sifre_hash = $2")
      ) {
        throw new Error("saxta şifrə mutasiya xətası");
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
        connectSayi++;
        return client;
      },

      async query() {
        poolQuerySayi++;
        throw new Error(
          "PIN-li şifrə dəyişmə transaction xaricində pool.query işlətməməlidir."
        );
      }
    },
    sorgular,
    connectSayiniAl: () => connectSayi,
    releaseSayiniAl: () => releaseSayi,
    poolQuerySayiniAl: () => poolQuerySayi
  };
}

function sorguIndeksi(saxta, yoxlama) {
  return saxta.sorgular.findIndex(x => yoxlama(x.sql));
}

function transactionQaydasiniYoxla(saxta) {
  assert.strictEqual(saxta.sorgular[0].sql, "BEGIN");
  assert.strictEqual(saxta.connectSayiniAl(), 1);
  assert.strictEqual(saxta.releaseSayiniAl(), 1);
  assert.strictEqual(saxta.poolQuerySayiniAl(), 0);
}

(async function testleriIcraEt() {
  try {
    {
      const saxta = saxtaHovuzHazirla();
      aktivHovuz = saxta.hovuz;

      const netice = await pinQorumaliSifreDeyis(
        PLAYER_ID,
        RESET_TOKEN,
        YENI_SIFRE,
        PIN_TOKEN
      );

      assert.strictEqual(netice.success, true);
      transactionQaydasiniYoxla(saxta);

      const resetKilidi = sorguIndeksi(saxta, sql =>
        sql.includes("FROM sifre_sifirlama_sorqulari s") &&
        sql.includes("FOR UPDATE OF s, h")
      );
      const pinKilidi = sorguIndeksi(saxta, sql =>
        sql.includes("FROM hesab_pin_icazeleri") &&
        sql.includes("FOR UPDATE")
      );
      const pinIstifadesi = sorguIndeksi(saxta, sql =>
        sql.startsWith("UPDATE hesab_pin_icazeleri")
      );
      const sifreMutasiyasi = sorguIndeksi(saxta, sql =>
        sql.startsWith("UPDATE hesablar") &&
        sql.includes("sifre_hash = $2")
      );

      assert.ok(resetKilidi > 0);
      assert.ok(pinKilidi > resetKilidi);
      assert.ok(pinIstifadesi > pinKilidi);
      assert.ok(sifreMutasiyasi > pinIstifadesi);
      assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    }

    {
      const saxta = saxtaHovuzHazirla({
        resetTapildi: false
      });
      aktivHovuz = saxta.hovuz;

      const netice = await pinQorumaliSifreDeyis(
        PLAYER_ID,
        RESET_TOKEN,
        YENI_SIFRE,
        PIN_TOKEN
      );

      assert.strictEqual(netice.success, false);
      transactionQaydasiniYoxla(saxta);
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.includes("FROM hesab_pin_icazeleri")
      ));
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.startsWith("UPDATE hesab_pin_icazeleri")
      ));
      assert.strictEqual(saxta.sorgular.at(-1).sql, "ROLLBACK");
    }

    {
      const saxta = saxtaHovuzHazirla({
        mutasiyaXetasi: true
      });
      aktivHovuz = saxta.hovuz;

      const esasConsoleError = console.error;
      console.error = () => {};

      let netice;

      try {
        netice = await pinQorumaliSifreDeyis(
          PLAYER_ID,
          RESET_TOKEN,
          YENI_SIFRE,
          PIN_TOKEN
        );
      }
      finally {
        console.error = esasConsoleError;
      }

      assert.strictEqual(netice.success, false);
      transactionQaydasiniYoxla(saxta);
      assert.ok(saxta.sorgular.some(x =>
        x.sql.startsWith("UPDATE hesab_pin_icazeleri")
      ));
      assert.ok(saxta.sorgular.some(x => x.sql === "ROLLBACK"));
      assert.ok(!saxta.sorgular.some(x => x.sql === "COMMIT"));
    }

    {
      const saxta = saxtaHovuzHazirla({
        icazeBitmeVaxti: "2000-01-01T00:00:00.000Z"
      });
      aktivHovuz = saxta.hovuz;

      const netice = await pinQorumaliSifreDeyis(
        PLAYER_ID,
        RESET_TOKEN,
        YENI_SIFRE,
        PIN_TOKEN
      );

      assert.strictEqual(netice.success, false);
      assert.strictEqual(netice.pinRequired, true);
      transactionQaydasiniYoxla(saxta);
      assert.ok(saxta.sorgular.some(x =>
        x.sql.startsWith("UPDATE hesab_pin_icazeleri")
      ));
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.startsWith("UPDATE hesablar") &&
        x.sql.includes("sifre_hash = $2")
      ));
      assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    }

    {
      const saxta = saxtaHovuzHazirla();
      aktivHovuz = saxta.hovuz;

      const netice = await pinQorumaliSifreDeyis(
        PLAYER_ID,
        RESET_TOKEN,
        "qisa",
        PIN_TOKEN
      );

      assert.strictEqual(netice.success, false);
      assert.strictEqual(saxta.connectSayiniAl(), 0);
      assert.strictEqual(saxta.sorgular.length, 0);
    }

    console.log(
      "[SIFRE_DEYIS_PIN_ATOMIKLIK_TEST] Reset tokeni, PIN icazəsi və şifrə mutasiyası eyni transaction-da qorunur."
    );
  }
  finally {
    verilenlerBazasi.proqramHovuzunuAl = esasHovuzAl;
    delete require.cache[resetModulYolu];
    delete require.cache[icazeModulYolu];
    delete require.cache[deyisModulYolu];
  }
})().catch(xeta => {
  console.error(
    "[SIFRE_DEYIS_PIN_ATOMIKLIK_TEST] Uğursuz:",
    xeta
  );
  process.exitCode = 1;
});
