"use strict";

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

function metnAl(deyer) {
  return typeof deyer === "string" ? deyer.trim() : "";
}

async function hesabiSil(playerId) {
  const temizPlayerId = metnAl(playerId);

  if (!temizPlayerId) {
    return {
      success: false,
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
        oyuncu_id,
        esas_email,
        status
      FROM hesablar
      WHERE oyuncu_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [temizPlayerId]
    );

    if (!hesabNeticesi.rows || hesabNeticesi.rows.length !== 1) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Silinəcək hesab tapılmadı."
      };
    }

    const hesab = hesabNeticesi.rows[0];
    const hesabId = hesab.hesab_id;

    // Hesaba aid bütün giriş / təhlükəsizlik məlumatları silinir.
    // Gameplay playerId və oyun state-i silinmir.
    await client.query(
      `DELETE FROM sifre_sifirlama_sorqulari WHERE hesab_id = $1`,
      [hesabId]
    );

    await client.query(
      `DELETE FROM email_tesdiqleri WHERE hesab_id = $1`,
      [hesabId]
    );

    await client.query(
      `DELETE FROM hesab_sessiyalari WHERE hesab_id = $1`,
      [hesabId]
    );

    await client.query(
      `DELETE FROM hesab_provayderleri WHERE hesab_id = $1`,
      [hesabId]
    );

    await client.query(
      `DELETE FROM hesab_audit_jurnali WHERE hesab_id = $1`,
      [hesabId]
    );

    const silmeNeticesi = await client.query(
      `
      DELETE FROM hesablar
      WHERE hesab_id = $1
        AND oyuncu_id = $2
      RETURNING hesab_id, oyuncu_id
      `,
      [hesabId, temizPlayerId]
    );

    if (!silmeNeticesi.rows || silmeNeticesi.rows.length !== 1) {
      throw new Error("Hesab sətri silinmədi.");
    }

    await client.query("COMMIT");

    console.log("[HESAB_SIL] Hesab silindi, gameplay playerId saxlanıldı:", {
      accountId: hesabId,
      playerId: temizPlayerId
    });

    return {
      success: true,
      playerId: temizPlayerId,
      message: "Hesab uğurla silindi. Oyun tərəqqisi bu cihazda saxlanıldı."
    };
  }
  catch (xeta) {
    try {
      await client.query("ROLLBACK");
    }
    catch {
    }

    console.error("[HESAB_SIL] Hesab silinmədi:", xeta);

    return {
      success: false,
      message: "Hesab serverdə silinə bilmədi."
    };
  }
  finally {
    client.release();
  }
}

module.exports = {
  hesabiSil
};
