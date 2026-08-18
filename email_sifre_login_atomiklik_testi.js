"use strict";

const assert = require("assert");
const crypto = require("crypto");

const verilenlerBazasi = require("./verilenler_bazasi");
const esasHovuzAl = verilenlerBazasi.proqramHovuzunuAl;

const HESAB_ID = "hesab_login_atomik_1";
const PLAYER_ID = "oyuncu_login_atomik_1";
const EMAIL = "login-atomik@example.test";
const SIFRE = "LoginSifre_123";
const CIHAZ_ID = "login-atomik-cihaz";
const SIFRE_DUZU = "login-atomik-test-duzu";

let aktivHovuz = null;

verilenlerBazasi.proqramHovuzunuAl = () => aktivHovuz;

const yaddasModulYolu = require.resolve(
  "./hesab_yaddasi_postgres"
);
const pinModulYolu = require.resolve(
  "./hesab_pin_postgres"
);
const cihazModulYolu = require.resolve(
  "./hesab_cihaz_pin_qoruma"
);

delete require.cache[yaddasModulYolu];
delete require.cache[pinModulYolu];
delete require.cache[cihazModulYolu];

const {
  emailSifreIleDaxilOlCihazQorumali
} = require("./hesab_cihaz_pin_qoruma");

function sqlTemizle(sql) {
  return String(sql || "")
    .replace(/\s+/g, " ")
    .trim();
}

function sifreHashYarat(sifre) {
  const hash = crypto
    .scryptSync(sifre, SIFRE_DUZU, 64)
    .toString("hex");

  return `${SIFRE_DUZU}:${hash}`;
}

function saxtaHovuzHazirla({
  pinHash = "saxta-pin-hash",
  challengeInsertXetasi = false
} = {}) {
  const sorgular = [];
  let connectSayi = 0;
  let releaseSayi = 0;
  let poolQuerySayi = 0;
  let transactionAktivdir = false;

  const client = {
    async query(sql, parametrler = []) {
      const temizSql = sqlTemizle(sql);

      sorgular.push({
        sql: temizSql,
        parametrler: [...parametrler]
      });

      if (temizSql === "BEGIN") {
        assert.strictEqual(transactionAktivdir, false);
        transactionAktivdir = true;
        return { rows: [] };
      }

      if (temizSql === "COMMIT" || temizSql === "ROLLBACK") {
        assert.strictEqual(transactionAktivdir, true);
        transactionAktivdir = false;
        return { rows: [] };
      }

      assert.strictEqual(
        transactionAktivdir,
        true,
        "Login SQL-i transaction xaricinə çıxmamalıdır."
      );

      if (
        temizSql.includes("FROM hesablar") &&
        temizSql.includes("LOWER(esas_email) = $1") &&
        temizSql.includes("FOR UPDATE")
      ) {
        return {
          rows: [{
            hesab_id: HESAB_ID,
            oyuncu_id: PLAYER_ID,
            esas_email: EMAIL,
            ikinci_email: null,
            email_tesdiqlenib: true,
            sifre_hash: sifreHashYarat(SIFRE),
            pin_hash: pinHash,
            status: "aktiv",
            yaradilma_vaxti: new Date(),
            yenilenme_vaxti: new Date()
          }]
        };
      }

      if (
        temizSql.includes("FROM hesab_etibarli_cihazlar") &&
        temizSql.includes("FOR UPDATE")
      ) {
        return { rows: [] };
      }

      if (
        challengeInsertXetasi &&
        temizSql.startsWith(
          "INSERT INTO hesab_cihaz_pin_sorqulari"
        )
      ) {
        throw new Error("saxta challenge insert xətası");
      }

      if (
        temizSql.startsWith("SELECT sessiya_id") &&
        temizSql.includes("FROM hesab_sessiyalari")
      ) {
        return { rows: [] };
      }

      return { rows: [] };
    },

    release() {
      assert.strictEqual(transactionAktivdir, false);
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
          "Email/şifrə login pool.query işlətməməlidir."
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

function umumiQaydalariYoxla(saxta) {
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

      const netice = await emailSifreIleDaxilOlCihazQorumali(
        EMAIL,
        SIFRE,
        CIHAZ_ID
      );

      assert.strictEqual(netice.success, true);
      assert.strictEqual(netice.requiresPin, true);
      umumiQaydalariYoxla(saxta);

      const hesabKilidi = sorguIndeksi(saxta, sql =>
        sql.includes("FROM hesablar") &&
        sql.includes("FOR UPDATE")
      );
      const challengeInsert = sorguIndeksi(saxta, sql =>
        sql.startsWith("INSERT INTO hesab_cihaz_pin_sorqulari")
      );

      assert.ok(hesabKilidi > 0);
      assert.ok(challengeInsert > hesabKilidi);
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.startsWith("INSERT INTO hesab_sessiyalari")
      ));
      assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    }

    {
      const saxta = saxtaHovuzHazirla();
      aktivHovuz = saxta.hovuz;

      const netice = await emailSifreIleDaxilOlCihazQorumali(
        EMAIL,
        "YanlisSifre_123",
        CIHAZ_ID
      );

      assert.strictEqual(netice.success, false);
      umumiQaydalariYoxla(saxta);
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.includes("hesab_cihaz_pin_sorqulari")
      ));
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.startsWith("INSERT INTO hesab_sessiyalari")
      ));
      assert.strictEqual(saxta.sorgular.at(-1).sql, "ROLLBACK");
    }

    {
      const saxta = saxtaHovuzHazirla({
        pinHash: null
      });
      aktivHovuz = saxta.hovuz;

      const netice = await emailSifreIleDaxilOlCihazQorumali(
        EMAIL,
        SIFRE,
        CIHAZ_ID
      );

      assert.strictEqual(netice.success, true);
      assert.ok(netice.session && netice.session.sessionId);
      umumiQaydalariYoxla(saxta);
      assert.ok(saxta.sorgular.some(x =>
        x.sql.startsWith("INSERT INTO hesab_sessiyalari")
      ));
      assert.ok(!saxta.sorgular.some(x =>
        x.sql.includes("hesab_cihaz_pin_sorqulari")
      ));
      assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    }

    {
      const saxta = saxtaHovuzHazirla({
        challengeInsertXetasi: true
      });
      aktivHovuz = saxta.hovuz;

      await assert.rejects(
        emailSifreIleDaxilOlCihazQorumali(
          EMAIL,
          SIFRE,
          CIHAZ_ID
        ),
        /saxta challenge insert xətası/
      );

      umumiQaydalariYoxla(saxta);
      assert.ok(saxta.sorgular.some(x => x.sql === "ROLLBACK"));
      assert.ok(!saxta.sorgular.some(x => x.sql === "COMMIT"));
    }

    console.log(
      "[EMAIL_SIFRE_LOGIN_ATOMIKLIK_TEST] Şifrə yoxlaması və sessiya/challenge qərarı eyni transaction-da qorunur."
    );
  }
  finally {
    verilenlerBazasi.proqramHovuzunuAl = esasHovuzAl;
    delete require.cache[yaddasModulYolu];
    delete require.cache[pinModulYolu];
    delete require.cache[cihazModulYolu];
  }
})().catch(xeta => {
  console.error(
    "[EMAIL_SIFRE_LOGIN_ATOMIKLIK_TEST] Uğursuz:",
    xeta
  );
  process.exitCode = 1;
});
