"use strict";

const assert = require("assert");
const crypto = require("crypto");
const {
  emailTesdiqKodunuYoxla
} = require("./hesab_yaddasi_postgres");

const INDI_MS = 1700000000000;
const DUZ = "email-tesdiq-test-duzu";
const DUZGUN_KOD = "123456";

function sqlTemizle(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim();
}

function kodHashYarat(kod) {
  return crypto
    .scryptSync(String(kod), DUZ, 32)
    .toString("hex");
}

function hesabSetri(overrides = {}) {
  return {
    hesab_id: "hesab_email_1",
    oyuncu_id: "oyuncu_email_1",
    esas_email: "email@example.com",
    ikinci_email: null,
    email_tesdiqlenib: false,
    sifre_hash: "duz:hash",
    pin_hash: null,
    status: "aktiv",
    yaradilma_vaxti: new Date(INDI_MS - 100000),
    yenilenme_vaxti: new Date(INDI_MS - 100000),
    ...overrides
  };
}

function saxtaHovuzHazirla({
  hesab = hesabSetri(),
  cehdSayi = 0,
  bitmeVaxtiMs = INDI_MS + 60000
} = {}) {
  const sorgular = [];
  let releaseSayi = 0;
  let poolQuerySayi = 0;
  let cariCehdSayi = cehdSayi;

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
          rows: hesab ? [{ ...hesab }] : []
        };
      }

      if (
        temizSql.includes("FROM email_tesdiqleri") &&
        temizSql.includes("FOR UPDATE")
      ) {
        return {
          rows: [{
            kod_hash: kodHashYarat(DUZGUN_KOD),
            duz: DUZ,
            bitme_vaxti: new Date(bitmeVaxtiMs),
            cehd_sayi: cariCehdSayi
          }]
        };
      }

      if (
        temizSql.startsWith("UPDATE email_tesdiqleri") &&
        temizSql.includes("cehd_sayi = cehd_sayi + 1")
      ) {
        cariCehdSayi++;
        return {
          rows: [{
            cehd_sayi: cariCehdSayi
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
        return client;
      },
      async query() {
        poolQuerySayi++;
        throw new Error(
          "Email təsdiqi transaction xaricində pool.query işlətməməlidir."
        );
      }
    },
    sorgular,
    releaseSayiniAl: () => releaseSayi,
    poolQuerySayiniAl: () => poolQuerySayi
  };
}

function kilidSirasiniYoxla(saxta) {
  assert.strictEqual(saxta.sorgular[0].sql, "BEGIN");

  const hesabKilidi = saxta.sorgular.findIndex(x =>
    x.sql.includes("FROM hesablar") &&
    x.sql.includes("FOR UPDATE")
  );
  const kodKilidi = saxta.sorgular.findIndex(x =>
    x.sql.includes("FROM email_tesdiqleri") &&
    x.sql.includes("FOR UPDATE")
  );

  assert.ok(hesabKilidi > 0);
  assert.ok(kodKilidi > hesabKilidi);
  assert.strictEqual(saxta.poolQuerySayiniAl(), 0);
  assert.strictEqual(saxta.releaseSayiniAl(), 1);
}

(async function testleriIcraEt() {
  {
    const saxta = saxtaHovuzHazirla({
      cehdSayi: 2
    });

    const netice = await emailTesdiqKodunuYoxla(
      "oyuncu_email_1",
      "654321",
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.attemptsRemaining, 2);
    assert.ok(saxta.sorgular.some(x =>
      x.sql.includes("cehd_sayi = cehd_sayi + 1") &&
      x.sql.includes("RETURNING cehd_sayi")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    kilidSirasiniYoxla(saxta);
  }

  {
    const saxta = saxtaHovuzHazirla();
    const esasLog = console.log;
    console.log = () => {};
    let netice;

    try {
      netice = await emailTesdiqKodunuYoxla(
        "oyuncu_email_1",
        DUZGUN_KOD,
        {
          hovuz: saxta.hovuz,
          nowMs: INDI_MS
        }
      );
    }
    finally {
      console.log = esasLog;
    }

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.account.emailVerified, true);
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("UPDATE hesablar") &&
      x.sql.includes("email_tesdiqlenib = TRUE")
    ));
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("DELETE FROM email_tesdiqleri")
    ));
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("INSERT INTO hesab_audit_jurnali")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    kilidSirasiniYoxla(saxta);
  }

  {
    const saxta = saxtaHovuzHazirla({
      bitmeVaxtiMs: INDI_MS - 1
    });

    const netice = await emailTesdiqKodunuYoxla(
      "oyuncu_email_1",
      DUZGUN_KOD,
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.expired, true);
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("DELETE FROM email_tesdiqleri")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    kilidSirasiniYoxla(saxta);
  }

  {
    const saxta = saxtaHovuzHazirla({
      hesab: hesabSetri({
        email_tesdiqlenib: true
      })
    });

    const netice = await emailTesdiqKodunuYoxla(
      "oyuncu_email_1",
      DUZGUN_KOD,
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.alreadyVerified, true);
    assert.strictEqual(saxta.sorgular.at(-1).sql, "ROLLBACK");
    assert.ok(!saxta.sorgular.some(x =>
      x.sql.includes("FROM email_tesdiqleri")
    ));
    assert.strictEqual(saxta.poolQuerySayiniAl(), 0);
    assert.strictEqual(saxta.releaseSayiniAl(), 1);
  }

  console.log(
    "[EMAIL_TESDIQ_YOXLAMA_KILIDI_TEST] Transaction və cəhd kilidi qorunur."
  );
})().catch(xeta => {
  console.error("[EMAIL_TESDIQ_YOXLAMA_KILIDI_TEST] Uğursuz:", xeta);
  process.exitCode = 1;
});
