"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const {
  pinDuzgundur,
  pinYoxlamaDaxili
} = require("./hesab_pin_postgres");

const ICAZE_MUDDETI_MS = 2 * 60 * 1000;

const ICAZELI_EMELIYYATLAR = new Set([
  "account_delete",
  "password_change"
]);

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

function tokenYarat() {
  return crypto.randomBytes(48).toString("base64url");
}

async function hesabSetriniPlayerIdIleAl(client, playerId, kilidle = false) {
  const netice = await client.query(
    `
    SELECT
      hesab_id,
      oyuncu_id,
      pin_hash,
      pin_sehv_cehd_sayi,
      pin_blok_vaxti,
      status
    FROM hesablar
    WHERE oyuncu_id = $1
    LIMIT 1
    ${kilidle ? "FOR UPDATE" : ""}
    `,
    [playerId]
  );

  if (!netice.rows || netice.rows.length !== 1) {
    return null;
  }

  return netice.rows[0];
}

async function pinIcazesiYarat(
  playerId,
  emeliyyatNovu,
  pin,
  secimler = {}
) {
  const temizPlayerId = metnAl(playerId, 128);
  const temizEmeliyyat = metnAl(emeliyyatNovu, 64);

  if (!temizPlayerId) {
    return {
      success: false,
      message: "Oyunçu ID müəyyən edilməyib."
    };
  }

  if (!ICAZELI_EMELIYYATLAR.has(temizEmeliyyat)) {
    return {
      success: false,
      message: "PIN icazə əməliyyatı düzgün deyil."
    };
  }

  const hovuz =
    secimler.hovuz ||
    proqramHovuzunuAl();

  const secilmisVaxt = Number(secimler.nowMs);
  const indi =
    Number.isFinite(secilmisVaxt) &&
    secilmisVaxt > 0
      ? Math.trunc(secilmisVaxt)
      : Date.now();

  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    // PIN yoxlaması və icazə tokeninin yaradılması eyni hesab kilidi
    // altında aparılır. Beləliklə PIN paralel dəyişdirilərsə köhnə PIN-lə
    // həssas əməliyyat icazəsi yaradıla bilməz.
    const hesab = await hesabSetriniPlayerIdIleAl(
      client,
      temizPlayerId,
      true
    );

    if (!hesab || hesab.status !== "aktiv") {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Hesab aktiv deyil."
      };
    }

    if (!hesab.pin_hash) {
      await client.query("COMMIT");
      return {
        success: true,
        hasPin: false,
        pinRequired: false,
        operation: temizEmeliyyat,
        authorizationToken: "",
        expiresAtMs: 0,
        message: "Hesabda PIN aktiv deyil. Əlavə PIN təsdiqi tələb olunmur."
      };
    }

    const temizPin = metnAl(pin, 16);

    if (!pinDuzgundur(temizPin)) {
      await client.query("ROLLBACK");
      return {
        success: false,
        hasPin: true,
        pinRequired: true,
        attemptsRemaining: 0,
        retryAfterMs: 0,
        message: "PIN formatı düzgün deyil."
      };
    }

    const pinNeticesi = await pinYoxlamaDaxili(
      client,
      hesab,
      temizPin
    );

    if (!pinNeticesi || pinNeticesi.success !== true) {
      // Səhv cəhd sayı və mümkün blok vaxtı pinYoxlamaDaxili-də
      // yeniləndiyi üçün uğursuz yoxlama da commit olunur.
      await client.query("COMMIT");

      return {
        success: false,
        hasPin: pinNeticesi && pinNeticesi.hasPin === true,
        pinRequired: true,
        locked: pinNeticesi && pinNeticesi.locked === true,
        tooManyAttempts:
          pinNeticesi && pinNeticesi.tooManyAttempts === true,
        attemptsRemaining:
          Number(pinNeticesi && pinNeticesi.attemptsRemaining || 0),
        retryAfterMs:
          Number(pinNeticesi && pinNeticesi.retryAfterMs || 0),
        message: pinNeticesi && pinNeticesi.message
          ? pinNeticesi.message
          : "PIN yanlışdır."
      };
    }

    await client.query(
      `
      UPDATE hesab_pin_icazeleri
      SET istifade_vaxti = NOW()
      WHERE hesab_id = $1
        AND emeliyyat_novu = $2
        AND istifade_vaxti IS NULL
      `,
      [hesab.hesab_id, temizEmeliyyat]
    );

    const icazeId = crypto.randomBytes(16).toString("hex");
    const token = tokenYarat();
    const tokenHash = tokenHashYarat(token);
    const bitmeVaxtiMs = indi + ICAZE_MUDDETI_MS;

    await client.query(
      `
      INSERT INTO hesab_pin_icazeleri (
        icaze_id,
        hesab_id,
        emeliyyat_novu,
        token_hash,
        bitme_vaxti,
        yaradilma_vaxti,
        istifade_vaxti
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        TO_TIMESTAMP($5 / 1000.0),
        NOW(),
        NULL
      )
      `,
      [
        icazeId,
        hesab.hesab_id,
        temizEmeliyyat,
        tokenHash,
        bitmeVaxtiMs
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      hasPin: true,
      pinRequired: true,
      operation: temizEmeliyyat,
      authorizationToken: token,
      expiresAtMs: bitmeVaxtiMs,
      message: "PIN təsdiqləndi. Əməliyyat üçün qısa müddətli icazə yaradıldı."
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

async function pinIcazesiniIstifadeEt(
  playerId,
  emeliyyatNovu,
  authorizationToken
) {
  const temizPlayerId = metnAl(playerId, 128);
  const temizEmeliyyat = metnAl(emeliyyatNovu, 64);
  const temizToken = metnAl(authorizationToken, 512);

  if (
    !temizPlayerId ||
    !ICAZELI_EMELIYYATLAR.has(temizEmeliyyat)
  ) {
    return {
      success: false,
      message: "PIN icazəsi etibarsızdır."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const hesab = await hesabSetriniPlayerIdIleAl(
      client,
      temizPlayerId,
      true
    );

    const daxiliNetice =
      await pinIcazesiniKilidliHesabIleIstifadeEt(
        client,
        hesab,
        temizPlayerId,
        temizEmeliyyat,
        temizToken
      );

    if (
      daxiliNetice.netice.success !== true &&
      daxiliNetice.ugursuzTransactionuCommitEt !== true
    ) {
      await client.query("ROLLBACK");
      return daxiliNetice.netice;
    }

    await client.query("COMMIT");
    return daxiliNetice.netice;
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    throw xeta;
  }
  finally {
    client.release();
  }
}

// Caller hesab sətrini artıq FOR UPDATE ilə kilidləməli və açıq
// transaction verməlidir. Bu daxili variant PIN icazəsinin istifadəsini
// həssas mutasiya ilə eyni transaction-da saxlamağa imkan verir.
async function pinIcazesiniKilidliHesabIleIstifadeEt(
  client,
  hesab,
  playerId,
  emeliyyatNovu,
  authorizationToken,
  secimler = {}
) {
  const temizPlayerId = metnAl(playerId, 128);
  const temizEmeliyyat = metnAl(emeliyyatNovu, 64);
  const temizToken = metnAl(authorizationToken, 512);

  if (
    !client ||
    typeof client.query !== "function" ||
    !hesab ||
    hesab.status !== "aktiv" ||
    metnAl(hesab.oyuncu_id, 128) !== temizPlayerId ||
    !ICAZELI_EMELIYYATLAR.has(temizEmeliyyat)
  ) {
    return {
      netice: {
        success: false,
        message: "Hesab aktiv deyil."
      },
      ugursuzTransactionuCommitEt: false
    };
  }

  if (!hesab.pin_hash) {
    return {
      netice: {
        success: true,
        hasPin: false,
        pinRequired: false,
        accountId: hesab.hesab_id,
        playerId: temizPlayerId,
        operation: temizEmeliyyat,
        message: "Hesabda PIN aktiv deyil. Əlavə PIN icazəsi tələb olunmur."
      },
      ugursuzTransactionuCommitEt: false
    };
  }

  if (temizToken.length < 32) {
    return {
      netice: {
        success: false,
        hasPin: true,
        pinRequired: true,
        message: "Bu əməliyyat üçün PIN təsdiqi tələb olunur."
      },
      ugursuzTransactionuCommitEt: false
    };
  }

  const netice = await client.query(
    `
    SELECT
      icaze_id,
      hesab_id,
      bitme_vaxti,
      istifade_vaxti
    FROM hesab_pin_icazeleri
    WHERE token_hash = $1
      AND emeliyyat_novu = $2
      AND hesab_id = $3
    LIMIT 1
    FOR UPDATE
    `,
    [
      tokenHashYarat(temizToken),
      temizEmeliyyat,
      hesab.hesab_id
    ]
  );

  if (!netice.rows || netice.rows.length !== 1) {
    return {
      netice: {
        success: false,
        hasPin: true,
        pinRequired: true,
        message: "PIN icazəsi tapılmadı və ya bu hesaba aid deyil."
      },
      ugursuzTransactionuCommitEt: false
    };
  }

  const setr = netice.rows[0];

  if (setr.istifade_vaxti) {
    return {
      netice: {
        success: false,
        hasPin: true,
        pinRequired: true,
        message: "PIN icazəsi artıq istifadə olunub."
      },
      ugursuzTransactionuCommitEt: false
    };
  }

  const secilmisVaxt = Number(secimler.nowMs);
  const indi =
    Number.isFinite(secilmisVaxt) &&
    secilmisVaxt > 0
      ? Math.trunc(secilmisVaxt)
      : Date.now();

  if (
    !setr.bitme_vaxti ||
    indi > new Date(setr.bitme_vaxti).getTime()
  ) {
    await client.query(
      `
      UPDATE hesab_pin_icazeleri
      SET istifade_vaxti = NOW()
      WHERE icaze_id = $1
      `,
      [setr.icaze_id]
    );

    return {
      netice: {
        success: false,
        hasPin: true,
        pinRequired: true,
        expired: true,
        message: "PIN icazəsinin vaxtı bitib. PIN-i yenidən daxil edin."
      },
      // Vaxtı bitmiş tokenin istifadəsiz qalmasını ayrıca saxlamırıq.
      ugursuzTransactionuCommitEt: true
    };
  }

  await client.query(
    `
    UPDATE hesab_pin_icazeleri
    SET istifade_vaxti = NOW()
    WHERE icaze_id = $1
    `,
    [setr.icaze_id]
  );

  return {
    netice: {
      success: true,
      hasPin: true,
      pinRequired: true,
      accountId: hesab.hesab_id,
      playerId: temizPlayerId,
      operation: temizEmeliyyat,
      message: "PIN icazəsi qəbul edildi."
    },
    ugursuzTransactionuCommitEt: false
  };
}

module.exports = {
  ICAZE_MUDDETI_MS,
  pinIcazesiYarat,
  pinIcazesiniIstifadeEt,
  pinIcazesiniKilidliHesabIleIstifadeEt
};
