"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl,
  hovuzlariBagla
} = require("./verilenler_bazasi");

const {
  provayderiHesabdanAyir
} = require("./hesab_provayder_idare_postgres");

const TEST_ID = crypto.randomBytes(8).toString("hex");
const HESAB_ID = `hesab_provider_test_${TEST_ID}`;
const PLAYER_ID = `player_provider_test_${TEST_ID}`;
const PROVIDER_USER_ID = `google_user_${TEST_ID}`;

async function temizle() {
  const hovuz = proqramHovuzunuAl();

  await hovuz.query(
    `DELETE FROM hesab_audit_jurnali WHERE oyuncu_id = $1`,
    [PLAYER_ID]
  );

  await hovuz.query(
    `DELETE FROM hesablar WHERE hesab_id = $1`,
    [HESAB_ID]
  );
}

async function testiBaslat() {
  const hovuz = proqramHovuzunuAl();

  try {
    await temizle();

    await hovuz.query(
      `
      INSERT INTO hesablar (
        hesab_id,
        oyuncu_id,
        esas_email,
        ikinci_email,
        email_tesdiqlenib,
        sifre_hash,
        pin_hash,
        status
      )
      VALUES ($1, $2, NULL, NULL, FALSE, NULL, NULL, 'aktiv')
      `,
      [HESAB_ID, PLAYER_ID]
    );

    await hovuz.query(
      `
      INSERT INTO hesab_provayderleri (
        hesab_id,
        provayder,
        provayder_istifadeci_id,
        provayder_email_tesdiqlenib
      )
      VALUES ($1, 'google', $2, TRUE)
      `,
      [HESAB_ID, PROVIDER_USER_ID]
    );

    const sonGirisUsulu = await provayderiHesabdanAyir(
      PLAYER_ID,
      "google"
    );

    if (
      !sonGirisUsulu ||
      sonGirisUsulu.success !== false ||
      sonGirisUsulu.wouldLockAccount !== true
    ) {
      throw new Error(
        `Son giriş üsulu qorunmadı: ${JSON.stringify(sonGirisUsulu)}`
      );
    }

    console.log("[PROVAYDER_IDARE_TEST] Son giriş üsulu düzgün qorundu.");

    await hovuz.query(
      `
      UPDATE hesablar
      SET sifre_hash = 'test_salt:test_hash'
      WHERE hesab_id = $1
      `,
      [HESAB_ID]
    );

    const ayirma = await provayderiHesabdanAyir(
      PLAYER_ID,
      "google"
    );

    if (!ayirma || ayirma.success !== true) {
      throw new Error(
        `Provayder ayrıla bilmədi: ${JSON.stringify(ayirma)}`
      );
    }

    const sayNeticesi = await hovuz.query(
      `
      SELECT COUNT(*)::int AS say
      FROM hesab_provayderleri
      WHERE hesab_id = $1
        AND provayder = 'google'
      `,
      [HESAB_ID]
    );

    if (Number(sayNeticesi.rows[0].say) !== 0) {
      throw new Error("Provayder sətri DB-dən silinməyib.");
    }

    console.log("[PROVAYDER_IDARE_TEST] Provayder təhlükəsiz ayrıldı.");
    console.log("[PROVAYDER_IDARE_TEST] Bütün testlər uğurludur.");
  }
  catch (xeta) {
    console.error("[PROVAYDER_IDARE_TEST] Test uğursuz oldu:", xeta);
    process.exitCode = 1;
  }
  finally {
    try {
      await temizle();
    }
    catch (xeta) {
      console.error("[PROVAYDER_IDARE_TEST] Təmizləmə xətası:", xeta.message);
    }

    try {
      await hovuzlariBagla();
    }
    catch {}
  }
}

testiBaslat();
