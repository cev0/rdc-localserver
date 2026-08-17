"use strict";

const assert = require("assert");

const {
  refreshCihazQorumasiniYoxla
} = require("./hesab_cihaz_pin_qoruma");

async function testiIslet() {
  const refreshToken = "refresh-token-123456789012345678901234567890";
  let sessiyaLegvSayi = 0;
  let challengeYaratmaSayi = 0;
  let challengeUgurludur = false;

  const saxtaHovuz = {
    async query(sql) {
      const emr = String(sql || "");

      if (emr.includes("FROM hesab_sessiyalari s")) {
        return {
          rows: [
            {
              sessiya_id: "session-1",
              hesab_id: "account-1",
              cihaz_id: "old-device",
              oyuncu_id: "player-1",
              esas_email: "",
              ikinci_email: "",
              email_tesdiqlenib: false,
              sifre_hash: "test",
              pin_hash: "pin-var",
              status: "aktiv",
              yaradilma_vaxti: new Date(),
              yenilenme_vaxti: new Date()
            }
          ]
        };
      }

      if (
        emr.includes("UPDATE hesab_sessiyalari") &&
        emr.includes("SET legv_vaxti = NOW()")
      ) {
        sessiyaLegvSayi++;
        return { rows: [], rowCount: 1 };
      }

      throw new Error(
        "Gözlənilməyən SQL: " + emr.trim().replace(/\s+/g, " ")
      );
    }
  };

  const secimler = {
    proqramHovuzunuAl() {
      return saxtaHovuz;
    },

    async cihazEtibarlidir() {
      return false;
    },

    async cihaziEtibarliEtHesabIdIle() {
      throw new Error("Yeni cihaz əvvəlcədən etibarlı edilməməlidir.");
    },

    async cihazPinSorqusuYarat() {
      challengeYaratmaSayi++;

      if (!challengeUgurludur) {
        return {
          success: false,
          message: "Cihaz PIN sorğusu yaradıla bilmədi."
        };
      }

      return {
        success: true,
        challengeId: "challenge-1",
        reason: "refresh",
        expiresAtMs: Date.now() + 60_000,
        message: "PIN tələb olunur."
      };
    }
  };

  await assert.rejects(
    () => refreshCihazQorumasiniYoxla(
      refreshToken,
      "new-device",
      secimler
    ),
    /Cihaz PIN sorğusu yaradıla bilmədi/
  );

  assert.strictEqual(challengeYaratmaSayi, 1);
  assert.strictEqual(
    sessiyaLegvSayi,
    0,
    "Challenge yaranmadıqda refresh yolu davam etməməlidir."
  );

  challengeUgurludur = true;

  const netice = await refreshCihazQorumasiniYoxla(
    refreshToken,
    "new-device",
    secimler
  );

  assert.strictEqual(netice.valid, true);
  assert.strictEqual(netice.requiresPin, true);
  assert.strictEqual(netice.challenge.challengeId, "challenge-1");
  assert.strictEqual(challengeYaratmaSayi, 2);
  assert.strictEqual(
    sessiyaLegvSayi,
    1,
    "Yalnız uğurlu challenge-dən sonra köhnə refresh sessiyası ləğv edilməlidir."
  );
}

testiIslet()
  .then(() => {
    console.log(
      "[CIHAZ_PIN_REFRESH_FAIL_CLOSED_TEST] Refresh PIN qoruması fail-closed işləyir."
    );
  })
  .catch(xeta => {
    console.error(xeta);
    process.exitCode = 1;
  });
