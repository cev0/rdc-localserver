"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const {
  yeniSifreTeyinEt
} = require("./sifre_sifirlama_postgres");

const {
  pinIcazesiniIstifadeEt
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

  const pinIcazesi = await pinIcazesiniIstifadeEt(
    temizPlayerId,
    "password_change",
    metnAl(pinAuthorizationToken, 512)
  );

  if (!pinIcazesi || pinIcazesi.success !== true) {
    return {
      success: false,
      pinRequired: true,
      message: pinIcazesi && pinIcazesi.message
        ? pinIcazesi.message
        : "Şifrəni dəyişmək üçün PIN təsdiqi tələb olunur."
    };
  }

  if (temizResetToken.length < 32) {
    return {
      success: false,
      message: "Şifrə dəyişmə icazəsi etibarsızdır."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const netice = await hovuz.query(
    `
    SELECT
      s.sorqu_id,
      h.oyuncu_id,
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
    `,
    [
      tokenHashYarat(temizResetToken),
      temizPlayerId
    ]
  );

  if (!netice.rows || netice.rows.length !== 1) {
    return {
      success: false,
      message: "Şifrə dəyişmə icazəsi bu hesaba aid deyil, bitib və ya etibarsızdır."
    };
  }

  return await yeniSifreTeyinEt(
    temizResetToken,
    yeniSifre
  );
}

module.exports = {
  pinQorumaliSifreDeyis
};
