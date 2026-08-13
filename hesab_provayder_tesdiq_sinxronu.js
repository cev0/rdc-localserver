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
    const cariEsasEmail = metnAl(hesab.esas_email, 320).toLowerCase();

    // Əsas hesab həm təsdiqlənib, həm də e-poçtu varsa artıq iş yoxdur.
    if (hesab.email_tesdiqlenib === true && cariEsasEmail) {
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
        provayder_email,
        provayder_email_tesdiqlenib
      FROM hesab_provayderleri
      WHERE hesab_id = $1
        AND NULLIF(TRIM(provayder_email), '') IS NOT NULL
        AND (
          provayder_email_tesdiqlenib = TRUE
          OR provayder = 'google'
        )
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

      console.warn(
        "[PROVAYDER_TESDIQ_SINXRON] Hesab üçün e-poçtlu provayder tapılmadı:",
        {
          playerId: temizPlayerId,
          accountId: hesab.hesab_id
        }
      );

      return {
        success: true,
        changed: false,
        message: "Provayder e-poçtu tapılmadı."
      };
    }

    const provayderSetri = provayderNeticesi.rows[0];
    const provayder = metnAl(provayderSetri.provayder, 32).toLowerCase();
    const provayderEmail = metnAl(
      provayderSetri.provayder_email,
      320
    ).toLowerCase();

    if (!provayderEmail) {
      await client.query("COMMIT");

      return {
        success: true,
        changed: false,
        message: "Provayder e-poçtu boşdur."
      };
    }

    // Google provayder sətri yalnız server Google ID tokenini uğurla
    // kriptoqrafik yoxladıqdan sonra yaradılır. Buna görə Google-dan
    // gələn e-poçt əsas hesab boşdursa etibarlı əsas e-poçt kimi yazılır.
    // Mövcud əsas e-poçt fərqlidirsə onu avtomatik təsdiqləmirik.
    const esasEmailBosdur = !cariEsasEmail;
    const eyniEmaildir = cariEsasEmail === provayderEmail;
    const tesdiqEtmekOlar =
      esasEmailBosdur ||
      eyniEmaildir;

    const yenilemeNeticesi = await client.query(
      `
      UPDATE hesablar
      SET
        esas_email = CASE
          WHEN NULLIF(TRIM(esas_email), '') IS NULL THEN $2
          ELSE esas_email
        END,
        email_tesdiqlenib = CASE
          WHEN $3 = TRUE THEN TRUE
          ELSE email_tesdiqlenib
        END,
        yenilenme_vaxti = NOW()
      WHERE hesab_id = $1
      RETURNING
        esas_email,
        email_tesdiqlenib
      `,
      [
        hesab.hesab_id,
        provayderEmail,
        tesdiqEtmekOlar
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
          provider: provayder,
          providerEmailVerified:
            provayderSetri.provayder_email_tesdiqlenib === true,
          primaryEmailFilled: esasEmailBosdur,
          primaryEmailMatched: eyniEmaildir,
          accountMarkedVerified: tesdiqEtmekOlar
        })
      ]
    );

    await client.query("COMMIT");

    const yenilenmis =
      yenilemeNeticesi.rows &&
      yenilemeNeticesi.rows.length === 1
        ? yenilemeNeticesi.rows[0]
        : null;

    console.log("[PROVAYDER_TESDIQ_SINXRON] Əsas hesab yeniləndi:", {
      playerId: temizPlayerId,
      accountId: hesab.hesab_id,
      provider: provayder,
      primaryEmail: yenilenmis && yenilenmis.esas_email
        ? yenilenmis.esas_email
        : "",
      emailVerified: Boolean(
        yenilenmis && yenilenmis.email_tesdiqlenib
      )
    });

    return {
      success: true,
      changed: true,
      emailVerified: Boolean(
        yenilenmis && yenilenmis.email_tesdiqlenib
      ),
      primaryEmail: yenilenmis && yenilenmis.esas_email
        ? String(yenilenmis.esas_email)
        : "",
      message: "Provayder e-poçtu əsas hesaba sinxronlandı."
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
