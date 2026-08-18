"use strict";

const assert = require("assert");

const verilenlerBazasi = require("./verilenler_bazasi");
const esasHovuzAl = verilenlerBazasi.proqramHovuzunuAl;

async function testiIslet() {
  let transactionAktivdir = false;
  let hesabKilidiGoruldu = false;
  let releaseSayi = 0;

  const client = {
    async query(sql) {
      const emr = String(sql || "");
      const yigcam = emr.trim().replace(/\s+/g, " ");

      if (yigcam === "BEGIN") {
        assert.strictEqual(transactionAktivdir, false);
        transactionAktivdir = true;
        return { rows: [] };
      }

      if (yigcam === "COMMIT" || yigcam === "ROLLBACK") {
        assert.strictEqual(transactionAktivdir, true);
        transactionAktivdir = false;
        return { rows: [] };
      }

      assert.strictEqual(
        transactionAktivdir,
        true,
        "Sessiya yeniləmə SQL-i transaction xaricinə çıxmamalıdır."
      );

      if (emr.includes("FROM hesab_sessiyalari s")) {
        assert.match(
          emr,
          /FOR UPDATE OF s, h/,
          "Refresh rotasiyası həm sessiyanı, həm hesabı kilidləməlidir."
        );
        hesabKilidiGoruldu = true;

        return {
          rows: [{
            sessiya_id: "session-1",
            hesab_id: "account-1",
            cihaz_id: "device-1",
            oyuncu_id: "player-1",
            esas_email: "player@example.test",
            ikinci_email: null,
            email_tesdiqlenib: true,
            sifre_hash: "test",
            pin_hash: "pin-var",
            status: "aktiv",
            yaradilma_vaxti: new Date(),
            yenilenme_vaxti: new Date()
          }]
        };
      }

      if (
        emr.includes("UPDATE hesab_sessiyalari") &&
        emr.includes("refresh_token_hash = $2")
      ) {
        return { rows: [], rowCount: 1 };
      }

      if (emr.includes("INSERT INTO hesab_audit_jurnali")) {
        return { rows: [], rowCount: 1 };
      }

      throw new Error("Gözlənilməyən SQL: " + yigcam);
    },

    release() {
      assert.strictEqual(transactionAktivdir, false);
      releaseSayi++;
    }
  };

  verilenlerBazasi.proqramHovuzunuAl = () => ({
    async connect() {
      return client;
    }
  });

  const modulYolu = require.resolve("./hesab_sessiya_postgres");
  delete require.cache[modulYolu];

  try {
    const {
      sessiyaniYenile
    } = require("./hesab_sessiya_postgres");

    const netice = await sessiyaniYenile(
      "refresh-token-123456789012345678901234567890",
      "device-1"
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(hesabKilidiGoruldu, true);
    assert.strictEqual(releaseSayi, 1);
    assert.strictEqual(transactionAktivdir, false);
  }
  finally {
    verilenlerBazasi.proqramHovuzunuAl = esasHovuzAl;
    delete require.cache[modulYolu];
  }
}

testiIslet()
  .then(() => {
    console.log(
      "[SESSIYA_REFRESH_HESAB_KILIDI_TEST] " +
      "Refresh token rotasiyası hesab statusu ilə atomikdir."
    );
  })
  .catch(xeta => {
    console.error(xeta);
    process.exitCode = 1;
  });
