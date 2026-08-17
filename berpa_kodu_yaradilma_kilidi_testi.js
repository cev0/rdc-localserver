"use strict";

const assert = require("assert");
const {
  pinBerpaKodunuHazirla
} = require("./hesab_pin_berpa_postgres");
const {
  sifreSifirlamaKodunuHazirla
} = require("./sifre_sifirlama_postgres");

const INDI_MS = 1700000000000;

function sqlTemizle(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim();
}

function saxtaHovuzHazirla({
  hesabSetri,
  sorquCedveli,
  sonSorquVaxtiMs = 0
}) {
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
          rows: hesabSetri ? [{ ...hesabSetri }] : []
        };
      }

      if (
        temizSql.includes(`FROM ${sorquCedveli}`) &&
        temizSql.includes("SELECT yaradilma_vaxti")
      ) {
        return {
          rows: sonSorquVaxtiMs > 0
            ? [{ yaradilma_vaxti: new Date(sonSorquVaxtiMs) }]
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
          "Bərpa kodu yaradılması transaction xaricində pool.query işlətməməlidir."
        );
      }
    },
    sorgular,
    releaseSayiniAl: () => releaseSayi,
    poolQuerySayiniAl: () => poolQuerySayi
  };
}

function transactionQaydasiniYoxla(saxta, sorquCedveli) {
  assert.strictEqual(saxta.sorgular[0].sql, "BEGIN");

  const hesabKilidiIndex = saxta.sorgular.findIndex(x =>
    x.sql.includes("FROM hesablar") &&
    x.sql.includes("FOR UPDATE")
  );
  const cooldownIndex = saxta.sorgular.findIndex(x =>
    x.sql.includes(`FROM ${sorquCedveli}`) &&
    x.sql.includes("SELECT yaradilma_vaxti")
  );

  assert.ok(hesabKilidiIndex > 0, "Hesab sətri transaction daxilində kilidlənməlidir.");
  assert.ok(
    cooldownIndex > hesabKilidiIndex,
    "Cooldown yoxlaması hesab kilidindən sonra aparılmalıdır."
  );
  assert.strictEqual(saxta.poolQuerySayiniAl(), 0);
  assert.strictEqual(saxta.releaseSayiniAl(), 1);
}

(async function testleriIcraEt() {
  {
    const saxta = saxtaHovuzHazirla({
      hesabSetri: {
        hesab_id: "hesab_1",
        oyuncu_id: "oyuncu_1",
        esas_email: "test@example.com",
        status: "aktiv"
      },
      sorquCedveli: "sifre_sifirlama_sorqulari"
    });

    const esasLog = console.log;
    console.log = () => {};
    let netice;
    try {
      netice = await sifreSifirlamaKodunuHazirla(
        "TEST@example.com",
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
    assert.strictEqual(netice.emailGonderilmeli, true);
    assert.match(netice.kod, /^\d{6}$/);
    assert.strictEqual(netice.expiresAtMs, INDI_MS + 10 * 60 * 1000);
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("INSERT INTO sifre_sifirlama_sorqulari")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    transactionQaydasiniYoxla(saxta, "sifre_sifirlama_sorqulari");
  }

  {
    const saxta = saxtaHovuzHazirla({
      hesabSetri: {
        hesab_id: "hesab_1",
        oyuncu_id: "oyuncu_1",
        esas_email: "test@example.com",
        status: "aktiv"
      },
      sorquCedveli: "sifre_sifirlama_sorqulari",
      sonSorquVaxtiMs: INDI_MS - 1000
    });

    const netice = await sifreSifirlamaKodunuHazirla(
      "test@example.com",
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.cooldown, true);
    assert.strictEqual(netice.emailGonderilmeli, false);
    assert.strictEqual(netice.retryAfterMs, 59000);
    assert.strictEqual(saxta.sorgular.at(-1).sql, "ROLLBACK");
    assert.ok(!saxta.sorgular.some(x => x.sql.startsWith("INSERT INTO")));
    transactionQaydasiniYoxla(saxta, "sifre_sifirlama_sorqulari");
  }

  {
    const saxta = saxtaHovuzHazirla({
      hesabSetri: {
        hesab_id: "hesab_pin_1",
        oyuncu_id: "oyuncu_pin_1",
        esas_email: "pin@example.com",
        email_tesdiqlenib: true,
        pin_hash: "duz:hash",
        status: "aktiv"
      },
      sorquCedveli: "hesab_pin_berpa_sorqulari"
    });

    const netice = await pinBerpaKodunuHazirla(
      "oyuncu_pin_1",
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.emailGonderilmeli, true);
    assert.strictEqual(netice.cooldown, false);
    assert.match(netice.kod, /^\d{6}$/);
    assert.strictEqual(netice.expiresAtMs, INDI_MS + 10 * 60 * 1000);
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("INSERT INTO hesab_pin_berpa_sorqulari")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    transactionQaydasiniYoxla(saxta, "hesab_pin_berpa_sorqulari");
  }

  {
    const saxta = saxtaHovuzHazirla({
      hesabSetri: {
        hesab_id: "hesab_pin_1",
        oyuncu_id: "oyuncu_pin_1",
        esas_email: "pin@example.com",
        email_tesdiqlenib: true,
        pin_hash: "duz:hash",
        status: "aktiv"
      },
      sorquCedveli: "hesab_pin_berpa_sorqulari",
      sonSorquVaxtiMs: INDI_MS - 1000
    });

    const netice = await pinBerpaKodunuHazirla(
      "oyuncu_pin_1",
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.cooldown, true);
    assert.strictEqual(netice.emailGonderilmeli, false);
    assert.strictEqual(netice.retryAfterMs, 59000);
    assert.strictEqual(saxta.sorgular.at(-1).sql, "ROLLBACK");
    assert.ok(!saxta.sorgular.some(x => x.sql.startsWith("INSERT INTO")));
    transactionQaydasiniYoxla(saxta, "hesab_pin_berpa_sorqulari");
  }

  console.log(
    "[BERPA_KODU_KILID_TEST] Şifrə və PIN recovery code yaradılması atomikdir."
  );
})().catch(xeta => {
  console.error("[BERPA_KODU_KILID_TEST] Uğursuz:", xeta);
  process.exitCode = 1;
});
