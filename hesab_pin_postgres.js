"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const MAKSIMUM_CEHD = 5;
const BLOK_MUDDETI_MS = 15 * 60 * 1000;

function pinDuzgundur(pin) {
  return /^\d{6}$/.test(String(pin || ""));
}

function pinHashYarat(pin) {
  if (!pinDuzgundur(pin)) {
    throw new Error("PIN 6 rəqəmdən ibarət olmalıdır.");
  }

  const duz = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(String(pin), duz, 64)
    .toString("hex");

  return `${duz}:${hash}`;
}

function pinHashDuzgundur(pin, saxlanmisHash) {
  if (!pinDuzgundur(pin) || typeof saxlanmisHash !== "string") {
    return false;
  }

  const hisseler = saxlanmisHash.split(":");
  if (hisseler.length !== 2) {
    return false;
  }

  const duz = hisseler[0];
  const hashHex = hisseler[1];

  let saxlanmisBuffer;

  try {
    saxlanmisBuffer = Buffer.from(hashHex, "hex");
  }
  catch {
    return false;
  }

  const yeniBuffer = crypto.scryptSync(String(pin), duz, 64);

  if (saxlanmisBuffer.length !== yeniBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(saxlanmisBuffer, yeniBuffer);
}

function blokQaligiMs(setr) {
  if (!setr || !setr.pin_blok_vaxti) {
    return 0;
  }

  const blokVaxti = new Date(setr.pin_blok_vaxti).getTime();
  return Math.max(0, blokVaxti - Date.now());
}

async function pinStatusunuAl(playerId) {
  const temizPlayerId = String(playerId || "").trim();

  if (!temizPlayerId) {
    return {
      success: false,
      message: "Oyunçu ID müəyyən edilməyib."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const netice = await hovuz.query(
    `
    SELECT
      pin_hash,
      pin_sehv_cehd_sayi,
      pin_blok_vaxti,
      status
    FROM hesablar
    WHERE oyuncu_id = $1
    LIMIT 1
    `,
    [temizPlayerId]
  );

  if (!netice.rows || netice.rows.length !== 1) {
    return {
      success: false,
      message: "Hesab tapılmadı."
    };
  }

  const setr = netice.rows[0];
  const qaliqMs = blokQaligiMs(setr);

  return {
    success: true,
    hasPin: Boolean(setr.pin_hash),
    locked: qaliqMs > 0,
    retryAfterMs: qaliqMs,
    attemptsRemaining: Math.max(
      0,
      MAKSIMUM_CEHD - Number(setr.pin_sehv_cehd_sayi || 0)
    ),
    message: Boolean(setr.pin_hash)
      ? "PIN aktivdir."
      : "PIN təyin edilməyib."
  };
}

async function pinYoxlamaDaxili(client, setr, pin) {
  const qaliqMs = blokQaligiMs(setr);

  if (qaliqMs > 0) {
    return {
      success: false,
      locked: true,
      retryAfterMs: qaliqMs,
      attemptsRemaining: 0,
      message: "Çox sayda səhv PIN cəhdi edildi. Bir qədər sonra yenidən yoxlayın."
    };
  }

  if (!setr.pin_hash) {
    return {
      success: false,
      hasPin: false,
      message: "PIN təyin edilməyib."
    };
  }

  if (pinHashDuzgundur(pin, setr.pin_hash)) {
    await client.query(
      `
      UPDATE hesablar
      SET
        pin_sehv_cehd_sayi = 0,
        pin_blok_vaxti = NULL
      WHERE hesab_id = $1
      `,
      [setr.hesab_id]
    );

    return {
      success: true,
      hasPin: true,
      attemptsRemaining: MAKSIMUM_CEHD,
      message: "PIN düzgündür."
    };
  }

  const yeniCehd = Number(setr.pin_sehv_cehd_sayi || 0) + 1;

  if (yeniCehd >= MAKSIMUM_CEHD) {
    const blokBitmeMs = Date.now() + BLOK_MUDDETI_MS;

    await client.query(
      `
      UPDATE hesablar
      SET
        pin_sehv_cehd_sayi = 0,
        pin_blok_vaxti = TO_TIMESTAMP($2 / 1000.0)
      WHERE hesab_id = $1
      `,
      [setr.hesab_id, blokBitmeMs]
    );

    return {
      success: false,
      hasPin: true,
      locked: true,
      tooManyAttempts: true,
      retryAfterMs: BLOK_MUDDETI_MS,
      attemptsRemaining: 0,
      message: "Çox sayda səhv PIN cəhdi edildi. PIN 15 dəqiqəlik bloklandı."
    };
  }

  await client.query(
    `
    UPDATE hesablar
    SET pin_sehv_cehd_sayi = $2
    WHERE hesab_id = $1
    `,
    [setr.hesab_id, yeniCehd]
  );

  return {
    success: false,
    hasPin: true,
    attemptsRemaining: MAKSIMUM_CEHD - yeniCehd,
    message: "PIN yanlışdır."
  };
}

async function pinYoxla(playerId, pin) {
  const temizPlayerId = String(playerId || "").trim();

  if (!temizPlayerId || !pinDuzgundur(pin)) {
    return {
      success: false,
      message: "PIN formatı düzgün deyil."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const netice = await client.query(
      `
      SELECT
        hesab_id,
        pin_hash,
        pin_sehv_cehd_sayi,
        pin_blok_vaxti,
        status
      FROM hesablar
      WHERE oyuncu_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [temizPlayerId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");
      return { success: false, message: "Hesab tapılmadı." };
    }

    const setr = netice.rows[0];

    if (setr.status !== "aktiv") {
      await client.query("ROLLBACK");
      return { success: false, message: "Hesab aktiv deyil." };
    }

    const yoxlama = await pinYoxlamaDaxili(client, setr, pin);
    await client.query("COMMIT");
    return yoxlama;
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    throw xeta;
  }
  finally {
    client.release();
  }
}

async function pinTeyinEt(playerId, cariPin, yeniPin) {
  const temizPlayerId = String(playerId || "").trim();

  if (!temizPlayerId) {
    return { success: false, message: "Oyunçu ID müəyyən edilməyib." };
  }

  if (!pinDuzgundur(yeniPin)) {
    return { success: false, message: "Yeni PIN 6 rəqəmdən ibarət olmalıdır." };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const netice = await client.query(
      `
      SELECT
        hesab_id,
        pin_hash,
        pin_sehv_cehd_sayi,
        pin_blok_vaxti,
        status
      FROM hesablar
      WHERE oyuncu_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [temizPlayerId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");
      return { success: false, message: "Hesab tapılmadı." };
    }

    const setr = netice.rows[0];

    if (setr.status !== "aktiv") {
      await client.query("ROLLBACK");
      return { success: false, message: "Hesab aktiv deyil." };
    }

    if (setr.pin_hash) {
      const yoxlama = await pinYoxlamaDaxili(client, setr, cariPin);

      if (!yoxlama.success) {
        await client.query("COMMIT");
        return yoxlama;
      }
    }

    const yeniHash = pinHashYarat(yeniPin);

    await client.query(
      `
      UPDATE hesablar
      SET
        pin_hash = $2,
        pin_sehv_cehd_sayi = 0,
        pin_blok_vaxti = NULL,
        pin_yenilenme_vaxti = NOW(),
        yenilenme_vaxti = NOW()
      WHERE hesab_id = $1
      `,
      [setr.hesab_id, yeniHash]
    );

    await client.query("COMMIT");

    return {
      success: true,
      hasPin: true,
      message: setr.pin_hash
        ? "PIN uğurla dəyişdirildi."
        : "PIN uğurla təyin edildi."
    };
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    throw xeta;
  }
  finally {
    client.release();
  }
}

async function pinSil(playerId, cariPin) {
  const temizPlayerId = String(playerId || "").trim();

  if (!temizPlayerId) {
    return { success: false, message: "Oyunçu ID müəyyən edilməyib." };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const netice = await client.query(
      `
      SELECT
        hesab_id,
        pin_hash,
        pin_sehv_cehd_sayi,
        pin_blok_vaxti,
        status
      FROM hesablar
      WHERE oyuncu_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [temizPlayerId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");
      return { success: false, message: "Hesab tapılmadı." };
    }

    const setr = netice.rows[0];

    if (!setr.pin_hash) {
      await client.query("ROLLBACK");
      return { success: true, hasPin: false, message: "PIN artıq aktiv deyil." };
    }

    const yoxlama = await pinYoxlamaDaxili(client, setr, cariPin);

    if (!yoxlama.success) {
      await client.query("COMMIT");
      return yoxlama;
    }

    await client.query(
      `
      UPDATE hesablar
      SET
        pin_hash = NULL,
        pin_sehv_cehd_sayi = 0,
        pin_blok_vaxti = NULL,
        pin_yenilenme_vaxti = NOW(),
        yenilenme_vaxti = NOW()
      WHERE hesab_id = $1
      `,
      [setr.hesab_id]
    );

    await client.query("COMMIT");

    return {
      success: true,
      hasPin: false,
      message: "PIN uğurla silindi."
    };
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    throw xeta;
  }
  finally {
    client.release();
  }
}

module.exports = {
  pinStatusunuAl,
  pinTeyinEt,
  pinSil,
  pinYoxla
};
