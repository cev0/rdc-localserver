"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const KOD_MUDDETI_MS = 10 * 60 * 1000;
const TOKEN_MUDDETI_MS = 10 * 60 * 1000;
const YENIDEN_GONDERME_MS = 60 * 1000;
const MAKSIMUM_CEHD = 5;

function metnAl(deyer, maksimum = 512) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

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

function kodYarat() {
  return crypto
    .randomInt(0, 1000000)
    .toString()
    .padStart(6, "0");
}

function kodHashYarat(kod, duz) {
  return crypto
    .scryptSync(String(kod), String(duz), 32)
    .toString("hex");
}

function tokenYarat() {
  return crypto.randomBytes(48).toString("base64url");
}

function tokenHashYarat(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""), "utf8")
    .digest("hex");
}

function emailMaskala(email) {
  const temiz = metnAl(email, 320);
  const hisse = temiz.split("@");

  if (hisse.length !== 2) {
    return "qeydiyyat e-poçtu";
  }

  const ad = hisse[0];
  const domen = hisse[1];

  if (!ad) {
    return "***@" + domen;
  }

  const ilk = ad.slice(0, 1);
  const son = ad.length > 1 ? ad.slice(-1) : "";

  return ilk + "***" + son + "@" + domen;
}

async function hesabSetriniAl(playerId) {
  const temizPlayerId = metnAl(playerId, 128);
  if (!temizPlayerId) return null;

  const hovuz = proqramHovuzunuAl();
  const netice = await hovuz.query(
    `
    SELECT
      hesab_id,
      oyuncu_id,
      esas_email,
      email_tesdiqlenib,
      pin_hash,
      status
    FROM hesablar
    WHERE oyuncu_id = $1
    LIMIT 1
    `,
    [temizPlayerId]
  );

  if (!netice.rows || netice.rows.length !== 1) {
    return null;
  }

  return netice.rows[0];
}

async function pinBerpaKodunuHazirla(playerId) {
  const hesab = await hesabSetriniAl(playerId);

  if (!hesab || hesab.status !== "aktiv") {
    return {
      success: false,
      message: "Aktiv hesab tapılmadı."
    };
  }

  if (!hesab.pin_hash) {
    return {
      success: false,
      hasPin: false,
      message: "Bu hesabda PIN aktiv deyil."
    };
  }

  if (!hesab.email_tesdiqlenib || !hesab.esas_email) {
    return {
      success: false,
      hasPin: true,
      message: "PIN bərpası üçün təsdiqlənmiş e-poçt tələb olunur."
    };
  }

  const hovuz = proqramHovuzunuAl();

  const sonSorqu = await hovuz.query(
    `
    SELECT yaradilma_vaxti
    FROM hesab_pin_berpa_sorqulari
    WHERE hesab_id = $1
      AND istifade_vaxti IS NULL
    ORDER BY yaradilma_vaxti DESC
    LIMIT 1
    `,
    [hesab.hesab_id]
  );

  if (sonSorqu.rows && sonSorqu.rows.length > 0) {
    const sonVaxt = new Date(
      sonSorqu.rows[0].yaradilma_vaxti
    ).getTime();

    const kecen = Date.now() - sonVaxt;

    if (kecen >= 0 && kecen < YENIDEN_GONDERME_MS) {
      return {
        success: true,
        hasPin: true,
        cooldown: true,
        retryAfterMs: YENIDEN_GONDERME_MS - kecen,
        maskedEmail: emailMaskala(hesab.esas_email),
        emailGonderilmeli: false,
        message: "Yeni kod istəmək üçün bir qədər gözləyin."
      };
    }
  }

  const sorquId = crypto.randomBytes(16).toString("hex");
  const kod = kodYarat();
  const duz = crypto.randomBytes(16).toString("hex");
  const kodHash = kodHashYarat(kod, duz);
  const bitmeVaxtiMs = Date.now() + KOD_MUDDETI_MS;

  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE hesab_pin_berpa_sorqulari
      SET istifade_vaxti = NOW()
      WHERE hesab_id = $1
        AND istifade_vaxti IS NULL
      `,
      [hesab.hesab_id]
    );

    await client.query(
      `
      INSERT INTO hesab_pin_berpa_sorqulari (
        sorqu_id,
        hesab_id,
        kod_hash,
        duz,
        bitme_vaxti,
        cehd_sayi,
        yaradilma_vaxti,
        tesdiq_vaxti,
        reset_token_hash,
        reset_token_bitme_vaxti,
        istifade_vaxti
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        TO_TIMESTAMP($5 / 1000.0),
        0,
        NOW(),
        NULL,
        NULL,
        NULL,
        NULL
      )
      `,
      [
        sorquId,
        hesab.hesab_id,
        kodHash,
        duz,
        bitmeVaxtiMs
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      hasPin: true,
      cooldown: false,
      emailGonderilmeli: true,
      email: hesab.esas_email,
      maskedEmail: emailMaskala(hesab.esas_email),
      kod,
      sorquId,
      expiresAtMs: bitmeVaxtiMs,
      message: "PIN bərpa kodu e-poçta göndəriləcək."
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

async function pinBerpaSorqusunuLegvEt(sorquId) {
  const temizSorquId = metnAl(sorquId, 128);
  if (!temizSorquId) return;

  const hovuz = proqramHovuzunuAl();
  await hovuz.query(
    `
    UPDATE hesab_pin_berpa_sorqulari
    SET istifade_vaxti = NOW()
    WHERE sorqu_id = $1
      AND istifade_vaxti IS NULL
    `,
    [temizSorquId]
  );
}

async function pinBerpaKodunuYoxla(playerId, sorquId, kod) {
  const temizPlayerId = metnAl(playerId, 128);
  const temizSorquId = metnAl(sorquId, 128);
  const temizKod = metnAl(kod, 16);

  if (!temizPlayerId || !temizSorquId || !/^\d{6}$/.test(temizKod)) {
    return {
      success: false,
      message: "PIN bərpa kodu düzgün deyil."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const netice = await client.query(
      `
      SELECT
        p.sorqu_id,
        p.hesab_id,
        p.kod_hash,
        p.duz,
        p.bitme_vaxti,
        p.cehd_sayi,
        p.tesdiq_vaxti,
        p.istifade_vaxti,
        h.oyuncu_id,
        h.pin_hash,
        h.status
      FROM hesab_pin_berpa_sorqulari p
      JOIN hesablar h
        ON h.hesab_id = p.hesab_id
      WHERE p.sorqu_id = $1
        AND h.oyuncu_id = $2
      LIMIT 1
      FOR UPDATE OF p
      `,
      [temizSorquId, temizPlayerId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Aktiv PIN bərpa sorğusu tapılmadı."
      };
    }

    const setr = netice.rows[0];

    if (setr.status !== "aktiv" || !setr.pin_hash) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Bu hesab üçün PIN bərpası mümkün deyil."
      };
    }

    if (setr.istifade_vaxti || setr.tesdiq_vaxti) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Bu PIN bərpa kodu artıq istifadə olunub."
      };
    }

    if (!setr.bitme_vaxti || Date.now() > new Date(setr.bitme_vaxti).getTime()) {
      await client.query(
        `
        UPDATE hesab_pin_berpa_sorqulari
        SET istifade_vaxti = NOW()
        WHERE sorqu_id = $1
        `,
        [temizSorquId]
      );

      await client.query("COMMIT");

      return {
        success: false,
        expired: true,
        message: "PIN bərpa kodunun vaxtı bitib. Yeni kod istəyin."
      };
    }

    const cehdSayi = Math.max(
      0,
      Math.trunc(Number(setr.cehd_sayi) || 0)
    );

    if (cehdSayi >= MAKSIMUM_CEHD) {
      await client.query("ROLLBACK");
      return {
        success: false,
        tooManyAttempts: true,
        attemptsRemaining: 0,
        message: "Çox sayda səhv kod daxil edilib. Yeni kod istəyin."
      };
    }

    const yeniHash = kodHashYarat(temizKod, setr.duz);
    const saxlanmis = Buffer.from(String(setr.kod_hash || ""), "hex");
    const daxilEdilen = Buffer.from(yeniHash, "hex");

    const kodDuzgundur =
      saxlanmis.length > 0 &&
      saxlanmis.length === daxilEdilen.length &&
      crypto.timingSafeEqual(saxlanmis, daxilEdilen);

    if (!kodDuzgundur) {
      const yeniCehd = cehdSayi + 1;

      await client.query(
        `
        UPDATE hesab_pin_berpa_sorqulari
        SET cehd_sayi = $2
        WHERE sorqu_id = $1
        `,
        [temizSorquId, yeniCehd]
      );

      await client.query("COMMIT");

      return {
        success: false,
        attemptsRemaining: Math.max(0, MAKSIMUM_CEHD - yeniCehd),
        tooManyAttempts: yeniCehd >= MAKSIMUM_CEHD,
        message: "Təsdiq kodu yanlışdır."
      };
    }

    const resetToken = tokenYarat();
    const resetTokenHash = tokenHashYarat(resetToken);
    const tokenBitmeVaxtiMs = Date.now() + TOKEN_MUDDETI_MS;

    await client.query(
      `
      UPDATE hesab_pin_berpa_sorqulari
      SET
        tesdiq_vaxti = NOW(),
        reset_token_hash = $2,
        reset_token_bitme_vaxti = TO_TIMESTAMP($3 / 1000.0),
        cehd_sayi = 0
      WHERE sorqu_id = $1
      `,
      [
        temizSorquId,
        resetTokenHash,
        tokenBitmeVaxtiMs
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      resetToken,
      expiresAtMs: tokenBitmeVaxtiMs,
      message: "Kod təsdiqləndi. Yeni PIN təyin edin."
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

async function pinBerpasiniTamamla(
  playerId,
  resetToken,
  yeniPin,
  cariSessiyaId
) {
  const temizPlayerId = metnAl(playerId, 128);
  const temizToken = metnAl(resetToken, 512);
  const temizSessiyaId = metnAl(cariSessiyaId, 128);

  if (!temizPlayerId || temizToken.length < 32) {
    return {
      success: false,
      message: "PIN bərpa icazəsi etibarsızdır."
    };
  }

  if (!pinDuzgundur(yeniPin)) {
    return {
      success: false,
      message: "Yeni PIN 6 rəqəmdən ibarət olmalıdır."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const netice = await client.query(
      `
      SELECT
        p.sorqu_id,
        p.hesab_id,
        p.istifade_vaxti,
        p.reset_token_bitme_vaxti,
        h.oyuncu_id,
        h.status
      FROM hesab_pin_berpa_sorqulari p
      JOIN hesablar h
        ON h.hesab_id = p.hesab_id
      WHERE p.reset_token_hash = $1
        AND p.tesdiq_vaxti IS NOT NULL
        AND p.istifade_vaxti IS NULL
        AND h.oyuncu_id = $2
      LIMIT 1
      FOR UPDATE OF p, h
      `,
      [tokenHashYarat(temizToken), temizPlayerId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "PIN bərpa icazəsi bitib və ya etibarsızdır."
      };
    }

    const setr = netice.rows[0];

    if (setr.status !== "aktiv") {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Hesab aktiv deyil."
      };
    }

    if (
      !setr.reset_token_bitme_vaxti ||
      Date.now() > new Date(setr.reset_token_bitme_vaxti).getTime()
    ) {
      await client.query(
        `
        UPDATE hesab_pin_berpa_sorqulari
        SET istifade_vaxti = NOW()
        WHERE sorqu_id = $1
        `,
        [setr.sorqu_id]
      );

      await client.query("COMMIT");

      return {
        success: false,
        expired: true,
        message: "PIN bərpa icazəsinin vaxtı bitib."
      };
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

    await client.query(
      `
      UPDATE hesab_pin_berpa_sorqulari
      SET
        istifade_vaxti = NOW(),
        reset_token_hash = NULL,
        reset_token_bitme_vaxti = NULL
      WHERE hesab_id = $1
        AND istifade_vaxti IS NULL
      `,
      [setr.hesab_id]
    );

    await client.query(
      `
      UPDATE hesab_pin_icazeleri
      SET istifade_vaxti = NOW()
      WHERE hesab_id = $1
        AND istifade_vaxti IS NULL
      `,
      [setr.hesab_id]
    );

    await client.query(
      `
      UPDATE hesab_etibarli_cihazlar
      SET legv_vaxti = COALESCE(legv_vaxti, NOW())
      WHERE hesab_id = $1
        AND legv_vaxti IS NULL
      `,
      [setr.hesab_id]
    );

    if (temizSessiyaId) {
      await client.query(
        `
        UPDATE hesab_sessiyalari
        SET legv_vaxti = NOW()
        WHERE hesab_id = $1
          AND sessiya_id <> $2
          AND legv_vaxti IS NULL
        `,
        [setr.hesab_id, temizSessiyaId]
      );
    }

    await client.query(
      `
      INSERT INTO hesab_audit_jurnali (
        hesab_id,
        oyuncu_id,
        hadise_novu,
        detallar
      )
      VALUES ($1, $2, 'pin_email_berpa_ile_yenilendi', $3::jsonb)
      `,
      [
        setr.hesab_id,
        temizPlayerId,
        JSON.stringify({
          digerSessiyalarLegvEdildi: Boolean(temizSessiyaId)
        })
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      hasPin: true,
      accountId: setr.hesab_id,
      playerId: temizPlayerId,
      message: "PIN uğurla yeniləndi."
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
  pinBerpaKodunuHazirla,
  pinBerpaSorqusunuLegvEt,
  pinBerpaKodunuYoxla,
  pinBerpasiniTamamla
};
