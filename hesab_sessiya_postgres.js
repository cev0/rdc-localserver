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

const SESSIYA_MUDDETI_MS = 30 * 24 * 60 * 60 * 1000;
const MAKSIMUM_AKTIV_SESSIYA = 5;

function tokenHashYarat(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""), "utf8")
    .digest("hex");
}

function cihazIdTemizle(cihazId) {
  if (typeof cihazId !== "string") return "";
  return cihazId.trim().slice(0, 128);
}

function yeniRefreshTokenYarat() {
  return crypto.randomBytes(48).toString("base64url");
}

function yeniSessiyaIdYarat() {
  return crypto.randomBytes(16).toString("hex");
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

  const saxlanacaqSay = MAKSIMUM_AKTIV_SESSIYA - 1;
  const legvEdilecek = netice.rows.slice(saxlanacaqSay);

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

async function sessiyaYarat(hesab, cihazId = "") {
  if (!hesab || !hesab.accountId || !hesab.playerId) {
    return {
      success: false,
      message: "Hesab məlumatı düzgün deyil."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  const sessiyaId = yeniSessiyaIdYarat();
  const refreshToken = yeniRefreshTokenYarat();
  const refreshTokenHash = tokenHashYarat(refreshToken);
  const temizCihazId = cihazIdTemizle(cihazId);
  const bitmeVaxtiMs = Date.now() + SESSIYA_MUDDETI_MS;

  try {
    await client.query("BEGIN");

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

    await auditYaz(
      client,
      hesab,
      "hesaba_daxil_olundu",
      {
        sessiyaId,
        cihazId: temizCihazId || null
      }
    );

    await client.query("COMMIT");

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
  catch (xeta) {
    try {
      await client.query("ROLLBACK");
    }
    catch {
    }

    console.error("[HESAB_SESSIYA] Sessiya yaradılmadı:", xeta);

    return {
      success: false,
      message: "Sessiya yaradıla bilmədi."
    };
  }
  finally {
    client.release();
  }
}

async function emailSifreIleDaxilOl(email, sifre, cihazId = "") {
  const temizEmail = emailNormallasdir(email);

  if (!emailDuzgundur(temizEmail)) {
    return {
      success: false,
      message: "E-poçt və ya şifrə yanlışdır."
    };
  }

  if (typeof sifre !== "string" || sifre.length < 8 || sifre.length > 128) {
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

  return await sessiyaYarat(hesab, cihazId);
}

async function sessiyaniYenile(refreshToken, cihazId = "") {
  const token = String(refreshToken || "").trim();

  if (token.length < 32 || token.length > 512) {
    return {
      success: false,
      message: "Sessiya etibarsızdır."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();
  const kohneHash = tokenHashYarat(token);
  const temizCihazId = cihazIdTemizle(cihazId);

  try {
    await client.query("BEGIN");

    const netice = await client.query(
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
      FOR UPDATE OF s, h
      `,
      [kohneHash]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Sessiya bitib və ya etibarsızdır."
      };
    }

    const setr = netice.rows[0];

    if (setr.status !== "aktiv") {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Bu hesaba giriş hazırda mümkün deyil."
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
      createdAtMs: setr.yaradilma_vaxti ? new Date(setr.yaradilma_vaxti).getTime() : 0,
      updatedAtMs: setr.yenilenme_vaxti ? new Date(setr.yenilenme_vaxti).getTime() : 0
    };

    const yeniToken = yeniRefreshTokenYarat();
    const yeniHash = tokenHashYarat(yeniToken);
    const yeniBitmeVaxtiMs = Date.now() + SESSIYA_MUDDETI_MS;

    await client.query(
      `
      UPDATE hesab_sessiyalari
      SET
        refresh_token_hash = $2,
        cihaz_id = COALESCE(NULLIF($3, ''), cihaz_id),
        son_istifade_vaxti = NOW(),
        bitme_vaxti = TO_TIMESTAMP($4 / 1000.0)
      WHERE sessiya_id = $1
      `,
      [
        setr.sessiya_id,
        yeniHash,
        temizCihazId,
        yeniBitmeVaxtiMs
      ]
    );

    await auditYaz(
      client,
      hesab,
      "sessiya_yenilendi",
      {
        sessiyaId: setr.sessiya_id,
        cihazId: temizCihazId || setr.cihaz_id || null
      }
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Sessiya yeniləndi.",
      account: clientHesabMelumati(hesab),
      session: {
        sessionId: setr.sessiya_id,
        refreshToken: yeniToken,
        expiresAtMs: yeniBitmeVaxtiMs
      }
    };
  }
  catch (xeta) {
    try {
      await client.query("ROLLBACK");
    }
    catch {
    }

    console.error("[HESAB_SESSIYA] Sessiya yenilənmədi:", xeta);

    return {
      success: false,
      message: "Sessiya yenilənə bilmədi."
    };
  }
  finally {
    client.release();
  }
}

async function sessiyaniLegvEt(refreshToken) {
  const token = String(refreshToken || "").trim();

  if (!token) {
    return {
      success: true,
      message: "Sessiya artıq bağlıdır."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const tokenHash = tokenHashYarat(token);

  await hovuz.query(
    `
    UPDATE hesab_sessiyalari
    SET legv_vaxti = COALESCE(legv_vaxti, NOW())
    WHERE refresh_token_hash = $1
    `,
    [tokenHash]
  );

  return {
    success: true,
    message: "Sessiya bağlandı."
  };
}

module.exports = {
  SESSIYA_MUDDETI_MS,
  tokenHashYarat,
  emailSifreIleDaxilOl,
  sessiyaniYenile,
  sessiyaniLegvEt
};
