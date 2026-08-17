"use strict";

const assert = require("assert");

const {
  hesabBerpaSorqusuHazirla
} = require("./hesab_berpa_postgres");

const INDI_MS = 1700000000000;

function sqlTemizle(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim();
}

function saxtaHovuzHazirla(sonSorqu = null) {
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
              hesab_id: "hesab_berpa_1",
              oyuncu_id: "oyuncu_berpa_1",
              esas_email: "berpa@example.com",
              email_tesdiqlenib: true,
              status: "aktiv"
            }
          ]
        };
      }

      if (
        temizSql.includes("FROM hesab_berpa_sorqulari") &&
        temizSql.includes("son_gonderilme_vaxti")
      ) {
        return {
          rows: sonSorqu ? [{ ...sonSorqu }] : []
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
          "Uğurlu email yolunda transaction xaricində pool.query işləməməlidir."
        );
      }
    },
    sorgular,
    releaseSayiniAl: () => releaseSayi,
    poolQuerySayiniAl: () => poolQuerySayi
  };
}

function secimlerHazirla(saxta, emailGondermeSayi) {
  return {
    hovuz: saxta.hovuz,
    nowMs: INDI_MS,

    async hesabNamizediniTap() {
      return {
        accountId: "hesab_berpa_1",
        playerId: "oyuncu_berpa_1",
        primaryEmail: "berpa@example.com",
        emailVerified: true,
        status: "aktiv"
      };
    },

    async tesdiqKoduEmailiGonder(email, kod) {
      emailGondermeSayi.say++;
      assert.strictEqual(email, "berpa@example.com");
      assert.match(kod, /^\d{6}$/);

      return {
        success: true,
        emailId: "email-test"
      };
    }
  };
}

function transactionQaydasiniYoxla(saxta) {
  assert.strictEqual(saxta.sorgular[0].sql, "BEGIN");

  const hesabKilidiIndex = saxta.sorgular.findIndex(x =>
    x.sql.includes("FROM hesablar") &&
    x.sql.includes("FOR UPDATE")
  );
  const cooldownIndex = saxta.sorgular.findIndex(x =>
    x.sql.includes("FROM hesab_berpa_sorqulari") &&
    x.sql.includes("son_gonderilme_vaxti")
  );

  assert.ok(
    hesabKilidiIndex > 0,
    "Hesab sətri transaction daxilində kilidlənməlidir."
  );
  assert.ok(
    cooldownIndex > hesabKilidiIndex,
    "Cooldown hesab kilidindən sonra yoxlanmalıdır."
  );
  assert.strictEqual(saxta.poolQuerySayiniAl(), 0);
  assert.strictEqual(saxta.releaseSayiniAl(), 1);
}

(async function testleriIcraEt() {
  {
    const saxta = saxtaHovuzHazirla();
    const emailGondermeSayi = { say: 0 };

    const netice = await hesabBerpaSorqusuHazirla(
      {
        email: "BERPA@example.com",
        oyuncuId: "oyuncu_berpa_1",
        komandirAdi: "Komandir",
        elaveMelumat: "Test"
      },
      secimlerHazirla(saxta, emailGondermeSayi)
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.emailGonderilmeli, true);
    assert.strictEqual(netice.expiresAtMs, INDI_MS + 10 * 60 * 1000);
    assert.match(netice.berpaSorquId, /^[a-f0-9]{32}$/);
    assert.strictEqual(emailGondermeSayi.say, 1);
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("INSERT INTO hesab_berpa_sorqulari")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    transactionQaydasiniYoxla(saxta);
  }

  {
    const saxta = saxtaHovuzHazirla({
      sorqu_id: "movcud_sorqu",
      son_gonderilme_vaxti: new Date(INDI_MS - 1000)
    });
    const emailGondermeSayi = { say: 0 };

    const netice = await hesabBerpaSorqusuHazirla(
      {
        email: "berpa@example.com",
        oyuncuId: "",
        komandirAdi: "",
        elaveMelumat: ""
      },
      secimlerHazirla(saxta, emailGondermeSayi)
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.cooldown, true);
    assert.strictEqual(netice.emailGonderilmeli, false);
    assert.strictEqual(netice.berpaSorquId, "movcud_sorqu");
    assert.strictEqual(netice.retryAfterMs, 59000);
    assert.strictEqual(emailGondermeSayi.say, 0);
    assert.strictEqual(saxta.sorgular.at(-1).sql, "ROLLBACK");
    assert.ok(!saxta.sorgular.some(x =>
      x.sql.startsWith("INSERT INTO hesab_berpa_sorqulari")
    ));
    transactionQaydasiniYoxla(saxta);
  }

  console.log(
    "[HESAB_BERPA_KODU_KILID_TEST] Hesab bərpa kodu yaradılması atomikdir."
  );
})().catch(xeta => {
  console.error("[HESAB_BERPA_KODU_KILID_TEST] Uğursuz:", xeta);
  process.exitCode = 1;
});
