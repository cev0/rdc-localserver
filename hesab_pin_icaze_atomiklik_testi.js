"use strict";

const assert = require("assert");
const crypto = require("crypto");
const {
  ICAZE_MUDDETI_MS,
  pinIcazesiYarat
} = require("./hesab_pin_icaze_postgres");

const INDI_MS = 1700000000000;
const DUZ = "pin-icaze-test-duzu";
const DUZGUN_PIN = "123456";

function sqlTemizle(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim();
}

function pinHashYarat(pin) {
  const hash = crypto
    .scryptSync(String(pin), DUZ, 64)
    .toString("hex");

  return DUZ + ":" + hash;
}

function saxtaHovuzHazirla({
  pinHash = pinHashYarat(DUZGUN_PIN),
  cehdSayi = 0
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
          rows: [{
            hesab_id: "hesab_pin_icaze_1",
            oyuncu_id: "oyuncu_pin_icaze_1",
            pin_hash: pinHash,
            pin_sehv_cehd_sayi: cehdSayi,
            pin_blok_vaxti: null,
            status: "aktiv"
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
          "PIN yoxlaması transaction xaricində pool.query işlətməməlidir."
        );
      }
    },
    sorgular,
    releaseSayiniAl: () => releaseSayi,
    poolQuerySayiniAl: () => poolQuerySayi
  };
}

function esasKilidQaydasiniYoxla(saxta) {
  assert.strictEqual(saxta.sorgular[0].sql, "BEGIN");

  const hesabKilidi = saxta.sorgular.findIndex(x =>
    x.sql.includes("FROM hesablar") &&
    x.sql.includes("FOR UPDATE")
  );

  assert.ok(hesabKilidi > 0);
  assert.strictEqual(saxta.poolQuerySayiniAl(), 0);
  assert.strictEqual(saxta.releaseSayiniAl(), 1);
}

(async function testleriIcraEt() {
  {
    const saxta = saxtaHovuzHazirla();

    const netice = await pinIcazesiYarat(
      "oyuncu_pin_icaze_1",
      "account_delete",
      DUZGUN_PIN,
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.hasPin, true);
    assert.strictEqual(netice.pinRequired, true);
    assert.ok(netice.authorizationToken.length >= 32);
    assert.strictEqual(
      netice.expiresAtMs,
      INDI_MS + ICAZE_MUDDETI_MS
    );

    const pinYoxlamaIndex = saxta.sorgular.findIndex(x =>
      x.sql.startsWith("UPDATE hesablar") &&
      x.sql.includes("pin_sehv_cehd_sayi = 0")
    );
    const icazeInsertIndex = saxta.sorgular.findIndex(x =>
      x.sql.startsWith("INSERT INTO hesab_pin_icazeleri")
    );

    assert.ok(pinYoxlamaIndex > 0);
    assert.ok(icazeInsertIndex > pinYoxlamaIndex);
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    esasKilidQaydasiniYoxla(saxta);
  }

  {
    const saxta = saxtaHovuzHazirla({
      cehdSayi: 1
    });

    const netice = await pinIcazesiYarat(
      "oyuncu_pin_icaze_1",
      "password_change",
      "654321",
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.attemptsRemaining, 3);
    assert.ok(saxta.sorgular.some(x =>
      x.sql.startsWith("UPDATE hesablar") &&
      x.sql.includes("pin_sehv_cehd_sayi = $2")
    ));
    assert.ok(!saxta.sorgular.some(x =>
      x.sql.startsWith("INSERT INTO hesab_pin_icazeleri")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    esasKilidQaydasiniYoxla(saxta);
  }

  {
    const saxta = saxtaHovuzHazirla({
      pinHash: null
    });

    const netice = await pinIcazesiYarat(
      "oyuncu_pin_icaze_1",
      "account_delete",
      "",
      {
        hovuz: saxta.hovuz,
        nowMs: INDI_MS
      }
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.hasPin, false);
    assert.strictEqual(netice.pinRequired, false);
    assert.strictEqual(netice.authorizationToken, "");
    assert.ok(!saxta.sorgular.some(x =>
      x.sql.startsWith("INSERT INTO hesab_pin_icazeleri")
    ));
    assert.strictEqual(saxta.sorgular.at(-1).sql, "COMMIT");
    esasKilidQaydasiniYoxla(saxta);
  }

  console.log(
    "[PIN_ICAZE_ATOMIKLIK_TEST] PIN yoxlaması və həssas əməliyyat icazəsi eyni transaction-da qorunur."
  );
})().catch(xeta => {
  console.error("[PIN_ICAZE_ATOMIKLIK_TEST] Uğursuz:", xeta);
  process.exitCode = 1;
});
