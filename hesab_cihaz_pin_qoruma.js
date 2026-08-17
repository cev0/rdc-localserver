"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const {
  emailNormallasdir,
  emailDuzgundur,
  hesabEmailIleTap,
  sifreDuzgundur,
  clientHesabMelumati
} = require("./hesab_yaddasi_postgres");

const {
  pinDuzgundur,
  pinYoxlamaDaxili
} = require("./hesab_pin_postgres");

const PIN_SORQU_MUDDETI_MS = 10 * 60 * 1000;
const SESSIYA_MUDDETI_MS = 30 * 24 * 60 * 60 * 1000;
const MAKSIMUM_AKTIV_SESSIYA = 5;

function metnAl(deyer, maksimum = 512) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

function cihazIdTemizle(cihazId) {
  return metnAl(cihazId, 128);
}

function cihazHashYarat(cihazId) {
  const temiz = cihazIdTemizle(cihazId);
  if (!temiz) return "";

  return crypto
    .createHash("sha256")
    .update(temiz, "utf8")
    .digest("hex");
}

function tokenHashYarat(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""), "utf8")
    .digest("hex");
}

function yeniRefreshTokenYarat() {
  return crypto.randomBytes(48).toString("base64url");
}

function yeniSessiyaIdYarat() {
  return crypto.randomBytes(16).toString("hex");
}

function yeniSorquIdYarat() {
  return crypto.randomBytes(16).toString("hex");
}

function dbSetriniHesabaCevir(setr) {
  if (!setr) return null;

  return {
    accountId: setr.hesab_id,
    playerId: setr.oyuncu_id,
    primaryEmail: setr.esas_email,
    secondaryEmail: setr.ikinci_email || "",
    emailVerified: Boolean(setr.email_tesdiqlenib),
    passwordHash: setr.sifre_hash,
    pinHash: setr.pin_hash || "",
    status: setr.status,
    createdAtMs: setr.yaradilma_vaxti
      ? new Date(setr.yaradilma_vaxti).getTime()
      : 0,
    updatedAtMs: setr.yenilenme_vaxti
      ? new Date(setr.yenilenme_vaxti).getTime()
      : 0
  };
}

async function hesabIdPlayerIdIleTap(playerId) {
  const temizPlayerId = metnAl(playerId, 128);
  if (!temizPlayerId) return null;

  const hovuz = proqramHovuzunuAl();
  const netice = await hovuz.query(
    `
    SELECT hesab_id, oyuncu_id, pin_hash, status
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

async function cihazEtibarlidir(hesabId, cihazId) {
  const temizHesabId = metnAl(hesabId, 128);
  const cihazHash = cihazHashYarat(cihazId);

  if (!temizHesabId || !cihazHash) {
    return false;
  }

  const hovuz = proqramHovuzunuAl();
  const netice = await hovuz.query(
    `
    SELECT id
    FROM hesab_etibarli_cihazlar
    WHERE hesab_id = $1
      AND cihaz_hash = $2
      AND legv_vaxti IS NULL
    LIMIT 1
    `,
    [temizHesabId, cihazHash]
  );

  if (!netice.rows || netice.rows.length !== 1) {
    return false;
  }

  await hovuz.query(
    `
    UPDATE hesab_etibarli_cihazlar
    SET son_istifade_vaxti = NOW()
    WHERE id = $1
    `,
    [netice.rows[0].id]
  );

  return true;
}

async function cihaziEtibarliEtHesabIdIle(hesabId, cihazId) {
  const temizHesabId = metnAl(hesabId, 128);
  const cihazHash = cihazHashYarat(cihazId);

  if (!temizHesabId || !cihazHash) {
    return false;
  }

  const hovuz = proqramHovuzunuAl();

  await hovuz.query(
    `
    INSERT INTO hesab_etibarli_cihazlar (
      hesab_id,
      cihaz_hash,
      ilk_tesdiq_vaxti,
      son_istifade_vaxti,
      legv_vaxti
    )
    VALUES ($1, $2, NOW(), NOW(), NULL)
    ON CONFLICT (hesab_id, cihaz_hash)
    DO UPDATE SET
      son_istifade_vaxti = NOW(),
      legv_vaxti = NULL
    `,
    [temizHesabId, cihazHash]
  );

  return true;
}

async function cihaziEtibarliEtPlayerIdIle(playerId, cihazId) {
  const hesab = await hesabIdPlayerIdIleTap(playerId);
  if (!hesab) return false;

  return await cihaziEtibarliEtHesabIdIle(
    hesab.hesab_id,
    cihazId
  );
}

async function cihazEtibarlariniLegvEtHesabIdIle(hesabId) {
  const temizHesabId = metnAl(hesabId, 128);
  if (!temizHesabId) return false;

  const hovuz = proqramHovuzunuAl();
  await hovuz.query(
    `
    UPDATE hesab_etibarli_cihazlar
    SET legv_vaxti = COALESCE(legv_vaxti, NOW())
    WHERE hesab_id = $1
      AND legv_vaxti IS NULL
    `,
    [temizHesabId]
  );

  return true;
}

async function cihazEtibarlariniLegvEtPlayerIdIle(playerId) {
  const hesab = await hesabIdPlayerIdIleTap(playerId);
  if (!hesab) return false;

  return await cihazEtibarlariniLegvEtHesabIdIle(
    hesab.hesab_id
  );
}

async function hesabUcunPinTelebiLazimdir(hesab, cihazId) {
  if (!hesab || !hesab.accountId) {
    return false;
  }

  let pinVar = Boolean(hesab.pinHash);

  if (!Object.prototype.hasOwnProperty.call(hesab, "pinHash")) {
    const hovuz = proqramHovuzunuAl();
    const netice = await hovuz.query(
      `
      SELECT pin_hash, status
      FROM hesablar
      WHERE hesab_id = $1
      LIMIT 1
      `,
      [hesab.accountId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      return false;
    }

    if (netice.rows[0].status !== "aktiv") {
      return false;
    }

    pinVar = Boolean(netice.rows[0].pin_hash);
  }

  if (!pinVar) {
    return false;
  }

  return !(await cihazEtibarlidir(
    hesab.accountId,
    cihazId
  ));
}

async function cihazPinSorqusuYarat(hesab, cihazId, meqsed) {
  if (!hesab || !hesab.accountId || !hesab.playerId) {
    return {
      success: false,
      message: "Hesab məlumatı düzgün deyil."
    };
  }

  const cihazHash = cihazHashYarat(cihazId);
  if (!cihazHash) {
    return {
      success: false,
      message: "Cihaz müəyyən edilə bilmədi."
    };
  }

  const temizMeqsed = metnAl(meqsed, 32);
  if (!["login", "refresh", "recovery"].includes(temizMeqsed)) {
    return {
      success: false,
      message: "Cihaz PIN sorğusunun məqsədi düzgün deyil."
    };
  }

  const sorquId = yeniSorquIdYarat();
  const bitmeVaxtiMs = Date.now() + PIN_SORQU_MUDDETI_MS;
  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE hesab_cihaz_pin_sorqulari
      SET istifade_vaxti = NOW()
      WHERE hesab_id = $1
        AND cihaz_hash = $2
        AND istifade_vaxti IS NULL
      `,
      [hesab.accountId, cihazHash]
    );

    await client.query(
      `
      INSERT INTO hesab_cihaz_pin_sorqulari (
        sorqu_id,
        hesab_id,
        cihaz_hash,
        meqsed,
        bitme_vaxti
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        TO_TIMESTAMP($5 / 1000.0)
      )
      `,
      [
        sorquId,
        hesab.accountId,
        cihazHash,
        temizMeqsed,
        bitmeVaxtiMs
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      challengeId: sorquId,
      reason: temizMeqsed,
      expiresAtMs: bitmeVaxtiMs,
      message: "Bu cihaz üçün PIN təsdiqi tələb olunur."
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

async function kohneSessiyalariTemizle(client, hesabId) {
  await client.query(
    `
    DELETE FROM hesab_sessiyalari
    WHERE hesab_id = $1
      AND (
        bitme_vaxti <= NOW()
        OR legv_vaxti IS NOT NULL
      )
    `,
    [hesabId]
  );
}

async function artiqSessiyalariLegvEt(client, hesabId) {
  const netice = await client.query(
    `
    SELECT sessiya_id
    FROM hesab_sessiyalari
    WHERE hesab_id = $1
      AND legv_vaxti IS NULL
      AND bitme_vaxti > NOW()
    ORDER BY son_istifade_vaxti DESC, yaradilma_vaxti DESC
    `,
    [hesabId]
  );

  if (netice.rows.length < MAKSIMUM_AKTIV_SESSIYA) {
    return;
  }

  const legvEdilecek = netice.rows.slice(
    MAKSIMUM_AKTIV_SESSIYA - 1
  );

  if (legvEdilecek.length === 0) return;

  const idler = legvEdilecek.map(x => x.sessiya_id);

  await client.query(
    `
    UPDATE hesab_sessiyalari
    SET legv_vaxti = NOW()
    WHERE sessiya_id = ANY($1::text[])
    `,
    [idler]
  );
}

async function sessiyaYaratHesabUcunDaxili(client, hesab, cihazId) {
  if (!hesab || !hesab.accountId || !hesab.playerId) {
    return {
      success: false,
      message: "Hesab məlumatı düzgün deyil."
    };
  }

  const temizCihazId = cihazIdTemizle(cihazId);
  const sessiyaId = yeniSessiyaIdYarat();
  const refreshToken = yeniRefreshTokenYarat();
  const refreshTokenHash = tokenHashYarat(refreshToken);
  const bitmeVaxtiMs = Date.now() + SESSIYA_MUDDETI_MS;

  await kohneSessiyalariTemizle(client, hesab.accountId);

  if (temizCihazId) {
    await client.query(
      `
      UPDATE hesab_sessiyalari
      SET legv_vaxti = NOW()
      WHERE hesab_id = $1
        AND cihaz_id = $2
        AND legv_vaxti IS NULL
        AND bitme_vaxti > NOW()
      `,
      [hesab.accountId, temizCihazId]
    );
  }

  await artiqSessiyalariLegvEt(client, hesab.accountId);

  await client.query(
    `
    INSERT INTO hesab_sessiyalari (
      sessiya_id,
      hesab_id,
      refresh_token_hash,
      cihaz_id,
      bitme_vaxti
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      TO_TIMESTAMP($5 / 1000.0)
    )
    `,
    [
      sessiyaId,
      hesab.accountId,
      refreshTokenHash,
      temizCihazId || null,
      bitmeVaxtiMs
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
      hesab.accountId,
      hesab.playerId,
      "cihaz_pin_tesdiqi_ile_giris",
      JSON.stringify({
        sessiyaId,
        cihazHash: cihazHashYarat(temizCihazId)
      })
    ]
  );

  return {
    success: true,
    message: "Sessiya yaradıldı.",
    account: clientHesabMelumati(hesab),
    session: {
      sessionId: sessiyaId,
      refreshToken,
      expiresAtMs: bitmeVaxtiMs
    }
  };
}

async function sessiyaYaratHesabUcun(hesab, cihazId) {
  if (!hesab || !hesab.accountId || !hesab.playerId) {
    return {
      success: false,
      message: "Hesab məlumatı düzgün deyil."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const netice = await sessiyaYaratHesabUcunDaxili(
      client,
      hesab,
      cihazId
    );

    if (!netice || netice.success !== true) {
      await client.query("ROLLBACK");
      return netice;
    }

    await client.query("COMMIT");
    return netice;
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    throw xeta;
  }
  finally {
    client.release();
  }
}

async function emailSifreIleDaxilOlCihazQorumali(
  email,
  sifre,
  cihazId
) {
  const temizEmail = emailNormallasdir(email);

  if (!emailDuzgundur(temizEmail)) {
    return {
      success: false,
      message: "E-poçt və ya şifrə yanlışdır."
    };
  }

  if (
    typeof sifre !== "string" ||
    sifre.length < 8 ||
    sifre.length > 128
  ) {
    return {
      success: false,
      message: "E-poçt və ya şifrə yanlışdır."
    };
  }

  const hesab = await hesabEmailIleTap(temizEmail);

  if (!hesab || !sifreDuzgundur(sifre, hesab.passwordHash)) {
    return {
      success: false,
      message: "E-poçt və ya şifrə yanlışdır."
    };
  }

  if (hesab.status !== "aktiv") {
    return {
      success: false,
      message: "Bu hesaba giriş hazırda mümkün deyil."
    };
  }

  if (await hesabUcunPinTelebiLazimdir(hesab, cihazId)) {
    const sorqu = await cihazPinSorqusuYarat(
      hesab,
      cihazId,
      "login"
    );

    return {
      success: true,
      requiresPin: true,
      account: clientHesabMelumati(hesab),
      challenge: sorqu
    };
  }

  return await sessiyaYaratHesabUcun(
    hesab,
    cihazId
  );
}

async function refreshCihazQorumasiniYoxla(
  refreshToken,
  cihazId,
  secimler = {}
) {
  const token = metnAl(refreshToken, 512);
  const temizCihazId = cihazIdTemizle(cihazId);

  if (token.length < 32 || !temizCihazId) {
    return {
      valid: false,
      requiresPin: false
    };
  }

  const hovuzAl = typeof secimler.proqramHovuzunuAl === "function"
    ? secimler.proqramHovuzunuAl
    : proqramHovuzunuAl;
  const cihazEtibarlidirFn =
    typeof secimler.cihazEtibarlidir === "function"
      ? secimler.cihazEtibarlidir
      : cihazEtibarlidir;
  const cihaziEtibarliEtFn =
    typeof secimler.cihaziEtibarliEtHesabIdIle === "function"
      ? secimler.cihaziEtibarliEtHesabIdIle
      : cihaziEtibarliEtHesabIdIle;
  const cihazPinSorqusuYaratFn =
    typeof secimler.cihazPinSorqusuYarat === "function"
      ? secimler.cihazPinSorqusuYarat
      : cihazPinSorqusuYarat;

  const hovuz = hovuzAl();
  const netice = await hovuz.query(
    `
    SELECT
      s.sessiya_id,
      s.hesab_id,
      s.cihaz_id,
      h.*
    FROM hesab_sessiyalari s
    JOIN hesablar h
      ON h.hesab_id = s.hesab_id
    WHERE s.refresh_token_hash = $1
      AND s.legv_vaxti IS NULL
      AND s.bitme_vaxti > NOW()
    LIMIT 1
    `,
    [tokenHashYarat(token)]
  );

  if (!netice.rows || netice.rows.length !== 1) {
    return {
      valid: false,
      requiresPin: false
    };
  }

  const setr = netice.rows[0];
  const hesab = dbSetriniHesabaCevir(setr);

  if (!hesab || hesab.status !== "aktiv" || !hesab.pinHash) {
    return {
      valid: true,
      requiresPin: false,
      account: hesab
    };
  }

  if (
    metnAl(setr.cihaz_id, 128) === temizCihazId ||
    await cihazEtibarlidirFn(hesab.accountId, temizCihazId)
  ) {
    await cihaziEtibarliEtFn(
      hesab.accountId,
      temizCihazId
    );

    return {
      valid: true,
      requiresPin: false,
      account: hesab
    };
  }

  const sorqu = await cihazPinSorqusuYaratFn(
    hesab,
    temizCihazId,
    "refresh"
  );

  if (!sorqu || sorqu.success !== true) {
    throw new Error(
      sorqu && sorqu.message
        ? sorqu.message
        : "Cihaz PIN sorğusu yaradıla bilmədi."
    );
  }

  await hovuz.query(
    `
    UPDATE hesab_sessiyalari
    SET legv_vaxti = NOW()
    WHERE refresh_token_hash = $1
      AND legv_vaxti IS NULL
    `,
    [tokenHashYarat(token)]
  );

  return {
    valid: true,
    requiresPin: true,
    account: hesab,
    challenge: sorqu
  };
}

async function cihazPinSorqusunuYoxlaVeSessiyaYarat(
  challengeId,
  cihazId,
  pin,
  secimler = {}
) {
  const temizChallengeId = metnAl(challengeId, 128);
  const temizCihazId = cihazIdTemizle(cihazId);
  const cihazHash = cihazHashYarat(temizCihazId);

  if (!temizChallengeId || !cihazHash) {
    return {
      success: false,
      message: "Cihaz PIN sorğusu etibarsızdır."
    };
  }

  const hovuzAl = typeof secimler.proqramHovuzunuAl === "function"
    ? secimler.proqramHovuzunuAl
    : proqramHovuzunuAl;
  const pinDuzgundurFn = typeof secimler.pinDuzgundur === "function"
    ? secimler.pinDuzgundur
    : pinDuzgundur;
  const pinYoxlamaFn = typeof secimler.pinYoxlamaDaxili === "function"
    ? secimler.pinYoxlamaDaxili
    : pinYoxlamaDaxili;
  const sessiyaYaratFn =
    typeof secimler.sessiyaYaratHesabUcunDaxili === "function"
      ? secimler.sessiyaYaratHesabUcunDaxili
      : sessiyaYaratHesabUcunDaxili;

  const hovuz = hovuzAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const netice = await client.query(
      `
      SELECT
        c.sorqu_id,
        c.hesab_id,
        c.cihaz_hash,
        c.meqsed,
        c.bitme_vaxti,
        c.istifade_vaxti,
        h.*
      FROM hesab_cihaz_pin_sorqulari c
      JOIN hesablar h
        ON h.hesab_id = c.hesab_id
      WHERE c.sorqu_id = $1
      LIMIT 1
      FOR UPDATE OF c, h
      `,
      [temizChallengeId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "PIN təsdiq sorğusu tapılmadı."
      };
    }

    const setr = netice.rows[0];

    if (setr.istifade_vaxti) {
      await client.query("ROLLBACK");
      return {
        success: false,
        expired: true,
        message: "PIN təsdiq sorğusu artıq istifadə olunub."
      };
    }

    if (
      !setr.bitme_vaxti ||
      Date.now() > new Date(setr.bitme_vaxti).getTime()
    ) {
      await client.query(
        `
        UPDATE hesab_cihaz_pin_sorqulari
        SET istifade_vaxti = NOW()
        WHERE sorqu_id = $1
          AND istifade_vaxti IS NULL
        `,
        [temizChallengeId]
      );
      await client.query("COMMIT");

      return {
        success: false,
        expired: true,
        message: "PIN təsdiq sorğusunun vaxtı bitib. Yenidən daxil olun."
      };
    }

    if (setr.cihaz_hash !== cihazHash) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "PIN sorğusu bu cihaz üçün yaradılmayıb."
      };
    }

    const hesab = dbSetriniHesabaCevir(setr);

    if (!hesab || hesab.status !== "aktiv") {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Hesab aktiv deyil."
      };
    }

    if (!pinDuzgundurFn(pin)) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "PIN formatı düzgün deyil."
      };
    }

    const pinNeticesi = await pinYoxlamaFn(
      client,
      setr,
      pin
    );

    if (!pinNeticesi || pinNeticesi.success !== true) {
      await client.query("COMMIT");

      return {
        success: false,
        hasPin: pinNeticesi && pinNeticesi.hasPin === true,
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

    const sessiyaNeticesi = await sessiyaYaratFn(
      client,
      hesab,
      temizCihazId
    );

    if (!sessiyaNeticesi || sessiyaNeticesi.success !== true) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: sessiyaNeticesi && sessiyaNeticesi.message
          ? sessiyaNeticesi.message
          : "Sessiya yaradıla bilmədi."
      };
    }

    await client.query(
      `
      INSERT INTO hesab_etibarli_cihazlar (
        hesab_id,
        cihaz_hash,
        ilk_tesdiq_vaxti,
        son_istifade_vaxti,
        legv_vaxti
      )
      VALUES ($1, $2, NOW(), NOW(), NULL)
      ON CONFLICT (hesab_id, cihaz_hash)
      DO UPDATE SET
        son_istifade_vaxti = NOW(),
        legv_vaxti = NULL
      `,
      [hesab.accountId, cihazHash]
    );

    const istifadeNeticesi = await client.query(
      `
      UPDATE hesab_cihaz_pin_sorqulari
      SET istifade_vaxti = NOW()
      WHERE sorqu_id = $1
        AND istifade_vaxti IS NULL
      RETURNING sorqu_id
      `,
      [temizChallengeId]
    );

    if (
      !istifadeNeticesi.rows ||
      istifadeNeticesi.rows.length !== 1
    ) {
      await client.query("ROLLBACK");

      return {
        success: false,
        expired: true,
        message: "PIN təsdiq sorğusu artıq istifadə olunub."
      };
    }

    await client.query("COMMIT");

    return {
      success: true,
      reason: metnAl(setr.meqsed, 32),
      message: "PIN təsdiqləndi. Cihaz etibarlı kimi yadda saxlanıldı.",
      account: sessiyaNeticesi.account,
      session: sessiyaNeticesi.session
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
  cihazHashYarat,
  cihazEtibarlidir,
  cihaziEtibarliEtHesabIdIle,
  cihaziEtibarliEtPlayerIdIle,
  cihazEtibarlariniLegvEtHesabIdIle,
  cihazEtibarlariniLegvEtPlayerIdIle,
  hesabUcunPinTelebiLazimdir,
  cihazPinSorqusuYarat,
  emailSifreIleDaxilOlCihazQorumali,
  refreshCihazQorumasiniYoxla,
  cihazPinSorqusunuYoxlaVeSessiyaYarat
};