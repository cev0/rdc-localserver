"use strict";

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const ICAZELI_PROVAYDERLER = new Set([
  "google",
  "apple",
  "facebook",
  "game_center"
]);

function metnAl(deyer, maksimum = 512) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

function provayderAdiniTemizle(deyer) {
  const temiz = metnAl(deyer, 32).toLowerCase();
  return ICAZELI_PROVAYDERLER.has(temiz) ? temiz : "";
}

async function hesabSetriniPlayerIdIleAl(client, playerId) {
  const netice = await client.query(
    `
    SELECT
      hesab_id,
      oyuncu_id,
      esas_email,
      sifre_hash,
      pin_hash,
      status
    FROM hesablar
    WHERE oyuncu_id = $1
    LIMIT 1
    FOR UPDATE
    `,
    [playerId]
  );

  return netice.rows && netice.rows.length === 1
    ? netice.rows[0]
    : null;
}

async function provayderleriAl(client, hesabId) {
  const netice = await client.query(
    `
    SELECT
      provayder,
      provayder_email,
      provayder_email_tesdiqlenib,
      profil_adi,
      yaradilma_vaxti,
      son_giris_vaxti
    FROM hesab_provayderleri
    WHERE hesab_id = $1
    ORDER BY yaradilma_vaxti ASC, id ASC
    `,
    [hesabId]
  );

  return (netice.rows || []).map(setr => ({
    provider: String(setr.provayder || ""),
    email: String(setr.provayder_email || ""),
    emailVerified: Boolean(setr.provayder_email_tesdiqlenib),
    displayName: String(setr.profil_adi || ""),
    linkedAtMs: setr.yaradilma_vaxti
      ? new Date(setr.yaradilma_vaxti).getTime()
      : 0,
    lastLoginAtMs: setr.son_giris_vaxti
      ? new Date(setr.son_giris_vaxti).getTime()
      : 0
  }));
}

async function provayderiHesabdanAyir(playerId, provider) {
  const temizPlayerId = metnAl(playerId, 128);
  const provayder = provayderAdiniTemizle(provider);

  if (!temizPlayerId || !provayder) {
    return {
      success: false,
      message: "Provayder ayırma sorğusu düzgün deyil."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const hesab = await hesabSetriniPlayerIdIleAl(
      client,
      temizPlayerId
    );

    if (!hesab || hesab.status !== "aktiv") {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Aktiv hesab tapılmadı."
      };
    }

    const provayderNeticesi = await client.query(
      `
      SELECT id
      FROM hesab_provayderleri
      WHERE hesab_id = $1
        AND provayder = $2
      LIMIT 1
      FOR UPDATE
      `,
      [hesab.hesab_id, provayder]
    );

    if (!provayderNeticesi.rows || provayderNeticesi.rows.length !== 1) {
      await client.query("ROLLBACK");
      return {
        success: false,
        notLinked: true,
        message: "Bu provayder hesaba bağlı deyil."
      };
    }

    const digerProvayderler = await client.query(
      `
      SELECT COUNT(*)::int AS say
      FROM hesab_provayderleri
      WHERE hesab_id = $1
        AND provayder <> $2
      `,
      [hesab.hesab_id, provayder]
    );

    const digerSay = Number(
      digerProvayderler.rows &&
      digerProvayderler.rows[0] &&
      digerProvayderler.rows[0].say || 0
    );

    const lokalSifreVar = Boolean(hesab.sifre_hash);

    if (!lokalSifreVar && digerSay <= 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        wouldLockAccount: true,
        message:
          "Bu provayder hesabın son giriş üsuludur. Əvvəl başqa giriş üsulu bağlayın."
      };
    }

    await client.query(
      `
      DELETE FROM hesab_provayderleri
      WHERE hesab_id = $1
        AND provayder = $2
      `,
      [hesab.hesab_id, provayder]
    );

    await client.query(
      `
      INSERT INTO hesab_audit_jurnali (
        hesab_id,
        oyuncu_id,
        hadise_novu,
        detallar
      )
      VALUES ($1, $2, 'provayder_hesabdan_ayrildi', $3::jsonb)
      `,
      [
        hesab.hesab_id,
        temizPlayerId,
        JSON.stringify({ provider: provayder })
      ]
    );

    const providers = await provayderleriAl(
      client,
      hesab.hesab_id
    );

    await client.query("COMMIT");

    return {
      success: true,
      provider: provayder,
      account: {
        accountId: hesab.hesab_id,
        playerId: temizPlayerId,
        primaryEmail: String(hesab.esas_email || ""),
        hasPassword: lokalSifreVar,
        hasPin: Boolean(hesab.pin_hash),
        providers
      },
      message: "Provayder hesabdan uğurla ayrıldı."
    };
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("[PROVAYDER_AYIR] DB xətası:", xeta);

    return {
      success: false,
      message: "Provayder hesabdan ayrıla bilmədi."
    };
  }
  finally {
    client.release();
  }
}

module.exports = {
  provayderiHesabdanAyir
};
