"use strict";

const assert = require("assert");

const verilenlerBazasi = require("./verilenler_bazasi");
const esasHovuzAl = verilenlerBazasi.proqramHovuzunuAl;

const HESAB_ID = "hesab_silme_atomik_1";
const PLAYER_ID = "oyuncu_silme_atomik_1";
const PIN_TOKEN = "a".repeat(64);

let aktivHovuz = null;

verilenlerBazasi.proqramHovuzunuAl = () => aktivHovuz;

const icazeModulYolu = require.resolve(
  "./hesab_pin_icaze_postgres"
);
const silmeModulYolu = require.resolve(
  "./hesab_silme_postgres"
);

delete require.cache[icazeModulYolu];
delete require.cache[silmeModulYolu];

const {
  hesabiSil
} = require("./hesab_silme_postgres");

function sqlTemizle(sql) {
  return String(sql || "")
    .replace(/\s+/g, " ")
    .trim();
}

function saxtaHovuzHazirla({
  pinHash = "saxta-pin-hash",
  icazeBitmeVaxti = "2999-01-01T00:00:00.000Z",
  silmeXetasi = false
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
        temizSql.includes("FROM hesablar") &&
        temizSql.includes("FOR UPDATE")
      ) {
        return {
          rows: [{
            hesab_id: HESAB_ID,
            oyuncu_id: PLAYER_ID,
            esas_email: "silme-atomik@example.test",
            pin_hash: pinHash,
            status: "aktiv"
          }]
        };
      }

      if (
        temizSql.includes("FROM hesab_pin_icazeleri") &&
        temizSql.includes("FOR UPDATE")
      ) {
        return {
          rows: [{
            icaze_id: "icaze_silme_atomik_1",
            hesab_id: HESAB_ID,
            bitme_vaxti: icazeBitmeVaxti,
            istifade_vaxti: null
          }]
        };
      }

      if (temizSql.startsWith("DELETE FROM hesablar")) {
        if (silmeXetasi) {
          throw new Error("saxta hesab silmə xətası");
        }

        return {
          rows: [{
            hesab_id: HESAB_ID,
            oyuncu_id: PLAYER_ID
          }]
        };
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
          "Hesab silmə transaction xaricində pool.query işlətməməlidir."
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

function umumiTransactionQaydasiniYoxla(saxta) {
  assert.strictEqual(saxta.sorgular[0].sql, "BEGIN");
  assert.strictEqual(saxta.connectSayiniAl(), 1);
  assert.strictEqual(saxta.releaseSayiniAl(), 1);
  assert.strictEqual(saxta.poolQuerySayiniAl(), 0);

  const hesabKilidi = sorguIndeksi(saxta, sql =>
    sql.includes("FROM hesablar") &&
    sql.includes("FOR UPDATE")
  );

  assert.ok(hesabKilidi > 0);
}

(async function testleriIcraEt() {
  try {
    {
      const saxta = saxtaHovuzHazirla();
      aktivHovuz = saxta.hovuz;

      const netice = await hesabiSil(
        PLAYER_ID,
        PIN_TOKEN
      );

      assert.strictEqual(netice.success, true);
      umumiTransactionQaydasiniYoxla(saxta);

      const hesabKilidi = sorguIndeksi(saxta, sql =>
        sql.includes("FROM hesablar") &&
        sql.includes("FOR UPDATE")
      );
      const icazeKilidi = sorguIndeksi(saxta, sql =>
        sql.includes("FROM hesab_pin_icazeleri") &&
        sql.includes("FOR UPDATE")
      );
      const icazeIstifadesi = sorguIndeksi(saxta, sql =>
        sql.startsWith("UPDATE hesab_pin_icazeleri")
      );
      const hesabSilinmesi = sorguIndeksi(saxta, sql =>
        sql.startsWith("DELETE FROM hesablar")
      );

      assert.ok(icazeKilidi > hesabKilidi);
      assert.ok(icazeIstifadesi > icazeKilidi);
      assert.ok(hesabSilinmesi > icazeIstifadesi);
      assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    }

    {
      const saxta = saxtaHovuzHazirla({
        silmeXetasi: true
      });
      aktivHovuz = saxta.hovuz;

      const esasConsoleError = console.error;
      console.error = () => {};

      let netice;

      try {
        netice = await hesabiSil(
          PLAYER_ID,
          PIN_TOKEN
        );
      }
      finally {
        console.error = esasConsoleError;
      }

      assert.strictEqual(netice.success, false);
      umumiTransactionQaydasiniYoxla(saxta);
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

      const netice = await hesabiSil(
        PLAYER_ID,
        PIN_TOKEN
      );

      assert.strictEqual(netice.success, false);
      assert.strictEqual(netice.pinRequired, true);
      umumiTransactionQaydasiniYoxla(saxta);
      assert.ok(saxta.sorgular.some(x =>
        x.sql.startsWith("UPDATE hesab_pin_icazeleri")
      ));
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.startsWith("DELETE FROM hesablar")
      ));
      assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    }

    {
      const saxta = saxtaHovuzHazirla({
        pinHash: null
      });
      aktivHovuz = saxta.hovuz;

      const netice = await hesabiSil(
        PLAYER_ID,
        ""
      );

      assert.strictEqual(netice.success, true);
      umumiTransactionQaydasiniYoxla(saxta);
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.includes("FROM hesab_pin_icazeleri")
      ));
      assert.ok(saxta.sorgular.some(x =>
        x.sql.startsWith("DELETE FROM hesablar")
      ));
      assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    }

    console.log(
      "[HESAB_SILME_PIN_ATOMIKLIK_TEST] PIN icazəsi və hesab silmə eyni transaction-da qorunur."
    );
  }
  finally {
    verilenlerBazasi.proqramHovuzunuAl = esasHovuzAl;
    delete require.cache[icazeModulYolu];
    delete require.cache[silmeModulYolu];
  }
})().catch(xeta => {
  console.error(
    "[HESAB_SILME_PIN_ATOMIKLIK_TEST] Uğursuz:",
    xeta
  );
  process.exitCode = 1;
});
