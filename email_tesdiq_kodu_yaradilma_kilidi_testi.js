"use strict";

const assert = require("assert");
const {
  emailTesdiqKoduHazirla
} = require("./hesab_yaddasi_postgres");

const INDI_MS = 1700000000000;

function sqlTemizle(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim();
}

function saxtaHovuzHazirla({
  emailTesdiqlenib = false,
  sonGonderilmeVaxtiMs = 0
} = {}) {
  const sorgular = [];
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
          rows: [
            {
              hesab_id: "hesab_email_1",
              oyuncu_id: "oyuncu_email_1",
              esas_email: "verify@example.com",
              ikinci_email: null,
              email_tesdiqlenib: emailTesdiqlenib,
              yaradilma_vaxti: new Date(INDI_MS - 100000),
              yenilenme_vaxti: new Date(INDI_MS - 100000)
            }
          ]
        };
      }

      if (
        temizSql.includes("SELECT son_gonderilme_vaxti") &&
        temizSql.includes("FROM email_tesdiqleri")
      ) {
        return {
          rows: sonGonderilmeVaxtiMs > 0
            ? [
                {
                  son_gonderilme_vaxti:
                    new Date(sonGonderilmeVaxtiMs)
                }
              ]
            : []
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
          "Email təsdiq kodu transaction xaricində pool.query işlətməməlidir."
        );
      }
    },
    sorgular,
    releaseSayiniAl: () => releaseSayi,
    poolQuerySayiniAl: () => poolQuerySayi
  };
}

function transactionQaydasiniYoxla(saxta) {
  assert.strictEqual(saxta.sorgular[0].sql, "BEGIN");

  const hesabKilidiIndex = saxta.sorgular.findIndex(x =>
    x.sql.includes("FROM hesablar") &&
    x.sql.includes("FOR UPDATE")
  );
  const cooldownIndex = saxta.sorgular.findIndex(x =>
    x.sql.includes("FROM email_tesdiqleri") &&
    x.sql.includes("SELECT son_gonderilme_vaxti")
  );

  assert.ok(hesabKilidiIndex > 0, "Hesab sətri əvvəlcə kilidlənməlidir.");
  assert.ok(
    cooldownIndex > hesabKilidiIndex,
    "Email cooldown yoxlaması hesab kilidindən sonra aparılmalıdır."
  );
  assert.strictEqual(saxta.poolQuerySayiniAl(), 0);
  assert.strictEqual(saxta.releaseSayiniAl(), 1);
}

(async function testleriIcraEt() {
  {
    const saxta = saxtaHovuzHazirla();
    const esasLog = console.log;
    console.log = () => {};
    let netice;

    try {
      netice = await emailTesdiqKoduHazirla(
        "oyuncu_email_1",
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
    assert.strictEqual(netice.alreadyVerified, false);
    assert.match(netice.kod, /^\d{6}$/);
    assert.strictEqual(netice.expiresAtMs, INDI_MS + 10 * 60 * 1000);
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("INSERT INTO email_tesdiqleri")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    transactionQaydasiniYoxla(saxta);
  }

  {
    const saxta = saxtaHovuzHazirla({
      sonGonderilmeVaxtiMs: INDI_MS - 1000
    });

    const netice = await emailTesdiqKoduHazirla(
      "oyuncu_email_1",
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.cooldown, true);
    assert.strictEqual(netice.retryAfterMs, 59000);
    assert.strictEqual(saxta.sorgular.at(-1).sql, "ROLLBACK");
    assert.ok(!saxta.sorgular.some(x => x.sql.startsWith("INSERT INTO")));
    transactionQaydasiniYoxla(saxta);
  }

  {
    const saxta = saxtaHovuzHazirla({
      emailTesdiqlenib: true
    });

    const netice = await emailTesdiqKoduHazirla(
      "oyuncu_email_1",
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
    "[EMAIL_TESDIQ_KILID_TEST] Email təsdiq kodu yaradılması atomikdir."
  );
})().catch(xeta => {
  console.error("[EMAIL_TESDIQ_KILID_TEST] Uğursuz:", xeta);
  process.exitCode = 1;
});
