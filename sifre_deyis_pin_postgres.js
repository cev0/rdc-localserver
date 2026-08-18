"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const {
  yeniSifreTeyinEtDaxili
} = require("./sifre_sifirlama_postgres");

const {
  SIFRE_MINIMUM_UZUNLUQ,
  SIFRE_MAKSIMUM_UZUNLUQ
} = require("./hesab_yaddasi_postgres");

const {
  pinIcazesiniKilidliHesabIleIstifadeEt
} = require("./hesab_pin_icaze_postgres");

function metnAl(deyer, maksimum = 512) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

function tokenHashYarat(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""), "utf8")
    .digest("hex");
}

async function pinQorumaliSifreDeyis(
  playerId,
  resetToken,
  yeniSifre,
  pinAuthorizationToken
) {
  const temizPlayerId = metnAl(playerId, 128);
  const temizResetToken = metnAl(resetToken, 512);

  if (!temizPlayerId) {
    return {
      success: false,
      message: "Şifrə dəyişmək üçün aktiv hesab sessiyası tələb olunur."
    };
  }

  if (temizResetToken.length < 32) {
    return {
      success: false,
      message: "Şifrə dəyişmə icazəsi etibarsızdır."
    };
  }

  if (
    typeof yeniSifre !== "string" ||
    yeniSifre.length < SIFRE_MINIMUM_UZUNLUQ ||
    yeniSifre.length > SIFRE_MAKSIMUM_UZUNLUQ
  ) {
    return {
      success: false,
      message: "Yeni şifrə 8-64 simvol arasında olmalıdır."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    // Reset sorğusu və hesab eyni anda kilidlənir. Bundan sonra PIN
    // icazəsi və şifrə mutasiyası da bu transaction daxilində aparılır.
    const netice = await client.query(
      `
      SELECT
        s.sorqu_id,
        s.hesab_id,
        h.oyuncu_id,
        h.esas_email,
        h.pin_hash,
        h.status
      FROM sifre_sifirlama_sorqulari s
      JOIN hesablar h
        ON h.hesab_id = s.hesab_id
      WHERE s.reset_token_hash = $1
        AND s.tesdiq_vaxti IS NOT NULL
        AND s.istifade_vaxti IS NULL
        AND s.reset_token_bitme_vaxti > NOW()
        AND h.oyuncu_id = $2
        AND h.status = 'aktiv'
      LIMIT 1
      FOR UPDATE OF s, h
      `,
      [
        tokenHashYarat(temizResetToken),
        temizPlayerId
      ]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Şifrə dəyişmə icazəsi bu hesaba aid deyil, bitib və ya etibarsızdır."
      };
    }

    const setr = netice.rows[0];
    const daxiliPinNeticesi =
      await pinIcazesiniKilidliHesabIleIstifadeEt(
        client,
        setr,
        temizPlayerId,
        "password_change",
        metnAl(pinAuthorizationToken, 512)
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
          : "Şifrəni dəyişmək üçün PIN təsdiqi tələb olunur."
      };
    }

    await yeniSifreTeyinEtDaxili(
      client,
      setr,
      yeniSifre
    );

    await client.query("COMMIT");

    console.log("[SIFRE_SIFIRLAMA] Şifrə uğurla dəyişdirildi:", {
      accountId: setr.hesab_id,
      playerId: setr.oyuncu_id
    });

    return {
      success: true,
      message: "Şifrəniz uğurla yeniləndi. Yenidən daxil olun."
    };
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}

    console.error(
      "[SIFRE_SIFIRLAMA_PIN] Yeni şifrə təyin edilmədi:",
      xeta
    );

    return {
      success: false,
      message: "Yeni şifrə təyin edilərkən server xətası baş verdi."
    };
  }
  finally {
    client.release();
  }
}

module.exports = {
  pinQorumaliSifreDeyis
};
