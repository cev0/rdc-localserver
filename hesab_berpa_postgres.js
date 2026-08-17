"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const {
  emailNormallasdir,
  emailDuzgundur,
  hesabEmailIleTap,
  hesabPlayerIdIleTap,
  clientHesabMelumati
} = require("./hesab_yaddasi_postgres");

const {
  tesdiqKoduEmailiGonder
} = require("./email_gonderici");

const KOD_MUDDETI_MS = 10 * 60 * 1000;
const YENIDEN_GONDERME_MS = 60 * 1000;
const MAKSIMUM_CEHD = 5;
const SESSIYA_MUDDETI_MS = 30 * 24 * 60 * 60 * 1000;
const MAKSIMUM_AKTIV_SESSIYA = 5;

function metnTemizle(deyer, maksimum = 256) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

function sabitMesaj() {
  return "Əgər məlumatlar hesabla uyğun gəlirsə, qeydiyyat e-poçtuna təsdiq kodu göndəriləcək.";
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

function cihazIdTemizle(cihazId) {
  return metnTemizle(cihazId, 128);
}

async function hesabNamizediniTap(email, oyuncuId) {
  const temizEmail = emailNormallasdir(email);
  const temizOyuncuId = metnTemizle(oyuncuId, 128);

  if (!temizEmail && !temizOyuncuId) {
    return null;
  }

  if (temizEmail && !emailDuzgundur(temizEmail)) {
    return null;
  }

  let emailHesabi = null;
  let oyuncuHesabi = null;

  if (temizEmail) {
    emailHesabi = await hesabEmailIleTap(temizEmail);
  }

  if (temizOyuncuId) {
    oyuncuHesabi = await hesabPlayerIdIleTap(temizOyuncuId);
  }

  if (temizEmail && temizOyuncuId) {
    if (!emailHesabi || !oyuncuHesabi) {
      return null;
    }

    if (emailHesabi.accountId !== oyuncuHesabi.accountId) {
      return null;
    }

    return emailHesabi;
  }

  return emailHesabi || oyuncuHesabi || null;
}

async function hesabBerpaSorqusuHazirla(
  {
    email,
    oyuncuId,
    komandirAdi,
    elaveMelumat
  },
  secimler = {}
) {
  const temizEmail = emailNormallasdir(email);
  const temizOyuncuId = metnTemizle(oyuncuId, 128);
  const temizKomandirAdi = metnTemizle(komandirAdi, 64);
  const temizElaveMelumat = metnTemizle(elaveMelumat, 1000);

  if (!temizEmail && !temizOyuncuId) {
    return {
      success: false,
      message: "E-poçt və ya oyunçu ID-sindən ən azı birini daxil edin."
    };
  }

  if (temizEmail && !emailDuzgundur(temizEmail)) {
    return {
      success: false,
      message: "Düzgün e-poçt ünvanı daxil edin."
    };
  }

  const namizediniTap =
    typeof secimler.hesabNamizediniTap === "function"
      ? secimler.hesabNamizediniTap
      : hesabNamizediniTap;
  const emailGonder =
    typeof secimler.tesdiqKoduEmailiGonder === "function"
      ? secimler.tesdiqKoduEmailiGonder
      : tesdiqKoduEmailiGonder;
  const hovuz = secimler.hovuz || proqramHovuzunuAl();
  const secilmisVaxt = Number(secimler.nowMs);
  const indiMs = Number.isFinite(secilmisVaxt) && secilmisVaxt > 0
    ? Math.trunc(secilmisVaxt)
    : Date.now();

  const saxtaSorquId = crypto.randomBytes(16).toString("hex");
  const namizedHesab = await namizediniTap(
    temizEmail,
    temizOyuncuId
  );

  if (
    !namizedHesab ||
    namizedHesab.status !== "aktiv" ||
    namizedHesab.emailVerified !== true ||
    !namizedHesab.primaryEmail
  ) {
    return {
      success: true,
      berpaSorquId: saxtaSorquId,
      emailGonderilmeli: false,
      message: sabitMesaj()
    };
  }

  const client = await hovuz.connect();
  let hesab = null;
  let sorquId = "";
  let kod = "";
  let bitmeVaxtiMs = 0;

  try {
    await client.query("BEGIN");

    const hesabNeticesi = await client.query(
      `
      SELECT
        hesab_id,
        oyuncu_id,
        esas_email,
        email_tesdiqlenib,
        status
      FROM hesablar
      WHERE hesab_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [namizedHesab.accountId]
    );

    if (
      !hesabNeticesi.rows ||
      hesabNeticesi.rows.length !== 1 ||
      hesabNeticesi.rows[0].status !== "aktiv" ||
      hesabNeticesi.rows[0].email_tesdiqlenib !== true ||
      !hesabNeticesi.rows[0].esas_email
    ) {
      await client.query("ROLLBACK");

      return {
        success: true,
        berpaSorquId: saxtaSorquId,
        emailGonderilmeli: false,
        message: sabitMesaj()
      };
    }

    const hesabSetri = hesabNeticesi.rows[0];
    hesab = {
      accountId: hesabSetri.hesab_id,
      playerId: hesabSetri.oyuncu_id,
      primaryEmail: hesabSetri.esas_email
    };

    const sonSorqu = await client.query(
      `
      SELECT
        sorqu_id,
        son_gonderilme_vaxti
      FROM hesab_berpa_sorqulari
      WHERE hesab_id = $1
        AND istifade_vaxti IS NULL
      ORDER BY yaradilma_vaxti DESC
      LIMIT 1
      `,
      [hesab.accountId]
    );

    if (sonSorqu.rows && sonSorqu.rows.length > 0) {
      const setr = sonSorqu.rows[0];
      const sonGonderilmeMs =
        new Date(setr.son_gonderilme_vaxti).getTime();
      const kecen = indiMs - sonGonderilmeMs;

      if (kecen >= 0 && kecen < YENIDEN_GONDERME_MS) {
        await client.query("ROLLBACK");

        return {
          success: true,
          berpaSorquId: setr.sorqu_id,
          cooldown: true,
          retryAfterMs: YENIDEN_GONDERME_MS - kecen,
          emailGonderilmeli: false,
          message: sabitMesaj()
        };
      }
    }

    sorquId = crypto.randomBytes(16).toString("hex");
    kod = kodYarat();
    const duz = crypto.randomBytes(16).toString("hex");
    const kodHash = kodHashYarat(kod, duz);
    bitmeVaxtiMs = indiMs + KOD_MUDDETI_MS;

    await client.query(
      `
      UPDATE hesab_berpa_sorqulari
      SET istifade_vaxti = NOW()
      WHERE hesab_id = $1
        AND istifade_vaxti IS NULL
      `,
      [hesab.accountId]
    );

    await client.query(
      `
      INSERT INTO hesab_berpa_sorqulari (
        sorqu_id,
        hesab_id,
        kod_hash,
        duz,
        bitme_vaxti,
        cehd_sayi,
        son_gonderilme_vaxti,
        yaradilma_vaxti,
        istifade_vaxti,
        teleb_email,
        teleb_oyuncu_id,
        komandir_adi,
        elave_melumat
      )
      VALUES (
        $1, $2, $3, $4,
        TO_TIMESTAMP($5 / 1000.0),
        0, NOW(), NOW(), NULL,
        NULLIF($6, ''),
        NULLIF($7, ''),
        NULLIF($8, ''),
        NULLIF($9, '')
      )
      `,
      [
        sorquId,
        hesab.accountId,
        kodHash,
        duz,
        bitmeVaxtiMs,
        temizEmail,
        temizOyuncuId,
        temizKomandirAdi,
        temizElaveMelumat
      ]
    );

    await client.query("COMMIT");
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("[HESAB_BERPA] Sorğu yaradıla bilmədi:", xeta);

    return {
      success: false,
      message: "Hesab bərpa sorğusu yaradıla bilmədi."
    };
  }
  finally {
    client.release();
  }

  const emailNeticesi = await emailGonder(
    hesab.primaryEmail,
    kod
  );

  if (!emailNeticesi || emailNeticesi.success !== true) {
    await hovuz.query(
      `
      UPDATE hesab_berpa_sorqulari
      SET istifade_vaxti = NOW()
      WHERE sorqu_id = $1
      `,
      [sorquId]
    );

    return {
      success: false,
      message: emailNeticesi && emailNeticesi.message
        ? emailNeticesi.message
        : "Təsdiq kodu göndərilə bilmədi."
    };
  }

  return {
    success: true,
    berpaSorquId: sorquId,
    emailGonderilmeli: true,
    expiresAtMs: bitmeVaxtiMs,
    message: sabitMesaj()
  };
}

async function hesabBerpaKodunuYenidenGonder(berpaSorquId) {
  const sorquId = metnTemizle(berpaSorquId, 128);

  if (!sorquId) {
    return {
      success: false,
      message: "Bərpa sorğusu müəyyən edilməyib."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  let email = "";
  let kod = "";
  let bitmeVaxtiMs = 0;

  try {
    await client.query("BEGIN");

    const netice = await client.query(
      `
      SELECT
        b.sorqu_id,
        b.son_gonderilme_vaxti,
        b.istifade_vaxti,
        h.esas_email,
        h.email_tesdiqlenib,
        h.status
      FROM hesab_berpa_sorqulari b
      JOIN hesablar h
        ON h.hesab_id = b.hesab_id
      WHERE b.sorqu_id = $1
      LIMIT 1
      FOR UPDATE OF b
      `,
      [sorquId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");

      return {
        success: true,
        berpaSorquId: sorquId,
        emailGonderilmeli: false,
        message: sabitMesaj()
      };
    }

    const setr = netice.rows[0];

    if (
      setr.istifade_vaxti ||
      setr.status !== "aktiv" ||
      Boolean(setr.email_tesdiqlenib) !== true ||
      !setr.esas_email
    ) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Bərpa sorğusu artıq etibarlı deyil."
      };
    }

    const sonGonderilmeMs = new Date(setr.son_gonderilme_vaxti).getTime();
    const kecen = Date.now() - sonGonderilmeMs;

    if (kecen >= 0 && kecen < YENIDEN_GONDERME_MS) {
      await client.query("ROLLBACK");

      return {
        success: true,
        berpaSorquId: sorquId,
        cooldown: true,
        retryAfterMs: YENIDEN_GONDERME_MS - kecen,
        emailGonderilmeli: false,
        message: sabitMesaj()
      };
    }

    kod = kodYarat();
    const duz = crypto.randomBytes(16).toString("hex");
    const kodHash = kodHashYarat(kod, duz);
    bitmeVaxtiMs = Date.now() + KOD_MUDDETI_MS;
    email = setr.esas_email;

    await client.query(
      `
      UPDATE hesab_berpa_sorqulari
      SET
        kod_hash = $2,
        duz = $3,
        bitme_vaxti = TO_TIMESTAMP($4 / 1000.0),
        cehd_sayi = 0,
        son_gonderilme_vaxti = NOW()
      WHERE sorqu_id = $1
      `,
      [
        sorquId,
        kodHash,
        duz,
        bitmeVaxtiMs
      ]
    );

    await client.query("COMMIT");
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("[HESAB_BERPA] Kod yenidən hazırlanmadı:", xeta);

    return {
      success: false,
      message: "Yeni təsdiq kodu hazırlana bilmədi."
    };
  }
  finally {
    client.release();
  }

  const emailNeticesi = await tesdiqKoduEmailiGonder(email, kod);

  if (!emailNeticesi || emailNeticesi.success !== true) {
    return {
      success: false,
      message: emailNeticesi && emailNeticesi.message
        ? emailNeticesi.message
        : "Yeni təsdiq kodu göndərilə bilmədi."
    };
  }

  return {
    success: true,
    berpaSorquId: sorquId,
    expiresAtMs: bitmeVaxtiMs,
    emailGonderilmeli: true,
    message: "Yeni təsdiq kodu göndərildi."
  };
}

async function auditYaz(client, hesab, hadiseNovu, detallar = {}) {
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
      hesab ? hesab.accountId : null,
      hesab ? hesab.playerId : null,
      String(hadiseNovu || "hesab_hadisesi"),
      JSON.stringify(detallar || {})
    ]
  );
}

async function hesabBerpaKodunuYoxlaVeSessiyaYarat(
  berpaSorquId,
  kod,
  cihazId = ""
) {
  const sorquId = metnTemizle(berpaSorquId, 128);
  const temizKod = metnTemizle(kod, 16);
  const temizCihazId = cihazIdTemizle(cihazId);

  if (!sorquId) {
    return {
      success: false,
      message: "Bərpa sorğusu müəyyən edilməyib."
    };
  }

  if (!/^\d{6}$/.test(temizKod)) {
    return {
      success: false,
      message: "6 rəqəmli təsdiq kodu daxil edin."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const netice = await client.query(
      `
      SELECT
        b.sorqu_id,
        b.hesab_id,
        b.kod_hash,
        b.duz,
        b.bitme_vaxti,
        b.cehd_sayi,
        b.istifade_vaxti,
        h.*
      FROM hesab_berpa_sorqulari b
      JOIN hesablar h
        ON h.hesab_id = b.hesab_id
      WHERE b.sorqu_id = $1
      LIMIT 1
      FOR UPDATE OF b, h
      `,
      [sorquId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Təsdiq kodu və ya bərpa sorğusu yanlışdır."
      };
    }

    const setr = netice.rows[0];

    if (setr.istifade_vaxti) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Bu bərpa sorğusu artıq istifadə olunub."
      };
    }

    if (setr.status !== "aktiv") {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Bu hesabı bərpa etmək mümkün deyil."
      };
    }

    const bitmeVaxtiMs = new Date(setr.bitme_vaxti).getTime();

    if (Date.now() > bitmeVaxtiMs) {
      await client.query(
        `
        UPDATE hesab_berpa_sorqulari
        SET istifade_vaxti = NOW()
        WHERE sorqu_id = $1
        `,
        [sorquId]
      );

      await client.query("COMMIT");

      return {
        success: false,
        expired: true,
        message: "Təsdiq kodunun vaxtı bitib. Yeni kod istəyin."
      };
    }

    const cehdSayi = Math.max(0, Math.trunc(Number(setr.cehd_sayi) || 0));

    if (cehdSayi >= MAKSIMUM_CEHD) {
      await client.query("ROLLBACK");

      return {
        success: false,
        tooManyAttempts: true,
        message: "Çox sayda səhv cəhd edildi. Yeni bərpa sorğusu başladın."
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
        UPDATE hesab_berpa_sorqulari
        SET cehd_sayi = $2
        WHERE sorqu_id = $1
        `,
        [sorquId, yeniCehd]
      );

      await client.query("COMMIT");

      return {
        success: false,
        attemptsRemaining: Math.max(0, MAKSIMUM_CEHD - yeniCehd),
        tooManyAttempts: yeniCehd >= MAKSIMUM_CEHD,
        message: "Təsdiq kodu yanlışdır."
      };
    }

    const hesab = {
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

    await client.query(
      `
      DELETE FROM hesab_sessiyalari
      WHERE hesab_id = $1
        AND (
          bitme_vaxti <= NOW()
          OR legv_vaxti IS NOT NULL
        )
      `,
      [hesab.accountId]
    );

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

    const aktivSessiyalar = await client.query(
      `
      SELECT sessiya_id
      FROM hesab_sessiyalari
      WHERE hesab_id = $1
        AND legv_vaxti IS NULL
        AND bitme_vaxti > NOW()
      ORDER BY son_istifade_vaxti DESC, yaradilma_vaxti DESC
      `,
      [hesab.accountId]
    );

    if (aktivSessiyalar.rows.length >= MAKSIMUM_AKTIV_SESSIYA) {
      const saxlanacaqSay = MAKSIMUM_AKTIV_SESSIYA - 1;
      const legvEdilecek = aktivSessiyalar.rows.slice(saxlanacaqSay);

      if (legvEdilecek.length > 0) {
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
    }

    const sessiyaId = yeniSessiyaIdYarat();
    const refreshToken = yeniRefreshTokenYarat();
    const refreshTokenHash = tokenHashYarat(refreshToken);
    const sessiyaBitmeVaxtiMs = Date.now() + SESSIYA_MUDDETI_MS;

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
        $1, $2, $3, $4,
        TO_TIMESTAMP($5 / 1000.0)
      )
      `,
      [
        sessiyaId,
        hesab.accountId,
        refreshTokenHash,
        temizCihazId || null,
        sessiyaBitmeVaxtiMs
      ]
    );

    await client.query(
      `
      UPDATE hesab_berpa_sorqulari
      SET istifade_vaxti = NOW()
      WHERE sorqu_id = $1
      `,
      [sorquId]
    );

    await auditYaz(
      client,
      hesab,
      "hesab_berpa_edildi",
      {
        sessiyaId,
        cihazId: temizCihazId || null
      }
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Hesab uğurla bərpa edildi.",
      account: clientHesabMelumati(hesab),
      session: {
        sessionId: sessiyaId,
        refreshToken,
        expiresAtMs: sessiyaBitmeVaxtiMs
      }
    };
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("[HESAB_BERPA] Kod yoxlanılmadı:", xeta);

    return {
      success: false,
      message: "Hesab bərpa edilərkən server xətası baş verdi."
    };
  }
  finally {
    client.release();
  }
}

module.exports = {
  KOD_MUDDETI_MS,
  YENIDEN_GONDERME_MS,
  MAKSIMUM_CEHD,
  hesabBerpaSorqusuHazirla,
  hesabBerpaKodunuYenidenGonder,
  hesabBerpaKodunuYoxlaVeSessiyaYarat
};
