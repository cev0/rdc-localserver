"use strict";

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const {
  pinIcazesiniKilidliHesabIleIstifadeEt
} = require("./hesab_pin_icaze_postgres");

function metnAl(deyer) {
  return typeof deyer === "string" ? deyer.trim() : "";
}

async function hesabiSil(
  playerId,
  pinAuthorizationToken
) {
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
        pin_hash,
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

    // PIN icazəsi hesab kilidi və silmə ilə eyni transaction-da istifadə
    // olunur. Silmə uğursuz olarsa token istifadəsi də rollback edilir.
    const daxiliPinNeticesi =
      await pinIcazesiniKilidliHesabIleIstifadeEt(
        client,
        hesab,
        temizPlayerId,
        "account_delete",
        metnAl(pinAuthorizationToken)
      );
    const pinIcazesi = daxiliPinNeticesi.netice;

    if (!pinIcazesi || pinIcazesi.success !== true) {
      if (
        daxiliPinNeticesi.ugursuzTransactionuCommitEt === true
      ) {
        await client.query("COMMIT");
      }
      else {
        await client.query("ROLLBACK");
      }

      return {
        success: false,
        pinRequired: true,
        message: pinIcazesi && pinIcazesi.message
          ? pinIcazesi.message
          : "Hesabı silmək üçün PIN təsdiqi tələb olunur."
      };
    }

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

    console.log("[HESAB_SIL] Hesab PIN icazəsi ilə silindi, gameplay playerId saxlanıldı:", {
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
