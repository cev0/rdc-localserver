"use strict";

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

function metnAl(deyer, maksimum = 512) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

async function provayderTesdiqiniEsasHesabaSinxronEt(playerId) {
  const temizPlayerId = metnAl(playerId, 128);

  if (!temizPlayerId) {
    return {
      success: false,
      changed: false,
      message: "Oyunçu ID müəyyən edilməyib."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const hesabNeticesi = await client.query(
      `
      SELECT
        hesab_id,
        esas_email,
        email_tesdiqlenib
      FROM hesablar
      WHERE oyuncu_id = $1
        AND status = 'aktiv'
      LIMIT 1
      FOR UPDATE
      `,
      [temizPlayerId]
    );

    if (!hesabNeticesi.rows || hesabNeticesi.rows.length !== 1) {
      await client.query("ROLLBACK");

      return {
        success: true,
        changed: false,
        message: "Aktiv hesab tapılmadı."
      };
    }

    const hesab = hesabNeticesi.rows[0];

    if (hesab.email_tesdiqlenib === true) {
      await client.query("COMMIT");

      return {
        success: true,
        changed: false,
        alreadyVerified: true,
        message: "Hesab artıq təsdiqlənib."
      };
    }

    const provayderNeticesi = await client.query(
      `
      SELECT
        provayder,
        provayder_email
      FROM hesab_provayderleri
      WHERE hesab_id = $1
        AND provayder_email_tesdiqlenib = TRUE
        AND NULLIF(TRIM(provayder_email), '') IS NOT NULL
      ORDER BY
        CASE WHEN provayder = 'google' THEN 0 ELSE 1 END,
        son_giris_vaxti DESC NULLS LAST,
        yaradilma_vaxti DESC
      LIMIT 1
      `,
      [hesab.hesab_id]
    );

    if (!provayderNeticesi.rows || provayderNeticesi.rows.length !== 1) {
      await client.query("COMMIT");

      return {
        success: true,
        changed: false,
        message: "Təsdiqlənmiş provayder e-poçtu tapılmadı."
      };
    }

    const provayderSetri = provayderNeticesi.rows[0];
    const provayderEmail = metnAl(provayderSetri.provayder_email, 320).toLowerCase();

    await client.query(
      `
      UPDATE hesablar
      SET
        esas_email = CASE
          WHEN NULLIF(TRIM(esas_email), '') IS NULL THEN $2
          ELSE esas_email
        END,
        email_tesdiqlenib = TRUE,
        yenilenme_vaxti = NOW()
      WHERE hesab_id = $1
      `,
      [
        hesab.hesab_id,
        provayderEmail
      ]
    );

    await client.query(
      `
      INSERT INTO hesab_audit_jurnali (
        hesab_id,
        oyuncu_id,
        hadise_novu,
        detallar
      )
      VALUES ($1, $2, $3, $4::jsonb)
      `,
      [
        hesab.hesab_id,
        temizPlayerId,
        "provayder_tesdiqi_esas_hesaba_sinxronlandi",
        JSON.stringify({
          provider: metnAl(provayderSetri.provayder, 32).toLowerCase(),
          primaryEmailFilled: !metnAl(hesab.esas_email, 320)
        })
      ]
    );

    await client.query("COMMIT");

    console.log("[PROVAYDER_TESDIQ_SINXRON] Hesab təsdiqləndi:", {
      playerId: temizPlayerId,
      accountId: hesab.hesab_id,
      provider: metnAl(provayderSetri.provayder, 32).toLowerCase()
    });

    return {
      success: true,
      changed: true,
      message: "Provayder təsdiqi əsas hesaba sinxronlandı."
    };
  }
  catch (xeta) {
    try {
      await client.query("ROLLBACK");
    }
    catch {
    }

    console.error("[PROVAYDER_TESDIQ_SINXRON] Xəta:", xeta);

    return {
      success: false,
      changed: false,
      message: "Provayder təsdiqi əsas hesaba yazıla bilmədi."
    };
  }
  finally {
    client.release();
  }
}

module.exports = {
  provayderTesdiqiniEsasHesabaSinxronEt
};
