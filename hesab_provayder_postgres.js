"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const SESSIYA_MUDDETI_MS = 30 * 24 * 60 * 60 * 1000;
const MAKSIMUM_AKTIV_SESSIYA = 5;
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

function yeniId(prefiks) {
  return `${prefiks}_${crypto.randomBytes(16).toString("hex")}`;
}

function tokenHashYarat(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""), "utf8")
    .digest("hex");
}

function dbSetriniHesabaCevir(setr) {
  if (!setr) return null;

  return {
    accountId: setr.hesab_id,
    playerId: setr.oyuncu_id,
    primaryEmail: setr.esas_email || "",
    secondaryEmail: setr.ikinci_email || "",
    emailVerified: Boolean(setr.email_tesdiqlenib),
    passwordHash: setr.sifre_hash || "",
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

async function provayderleriClientUcunAl(client, hesabId) {
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

async function clientHesabMelumatiniGenislet(client, hesab) {
  if (!hesab || !hesab.accountId) return null;

  const providers = await provayderleriClientUcunAl(
    client,
    hesab.accountId
  );

  return {
    accountId: hesab.accountId,
    playerId: hesab.playerId,
    primaryEmail: hesab.primaryEmail || "",
    secondaryEmail: hesab.secondaryEmail || "",
    emailVerified: Boolean(hesab.emailVerified),
    hasPassword: Boolean(hesab.passwordHash),
    hasPin: Boolean(hesab.pinHash),
    providers,
    createdAtMs: Number(hesab.createdAtMs || 0)
  };
}

async function hesabMelumatiniPlayerIdIleAl(playerId) {
  const temizPlayerId = metnAl(playerId, 128);

  if (!temizPlayerId) {
    return {
      success: false,
      linked: false,
      message: "Oyunçu ID müəyyən edilməyib."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    const netice = await client.query(
      `
      SELECT *
      FROM hesablar
      WHERE oyuncu_id = $1
      LIMIT 1
      `,
      [temizPlayerId]
    );

    if (!netice.rows || netice.rows.length !== 1) {
      return {
        success: true,
        linked: false,
        playerId: temizPlayerId,
        message: "Oyunçu guest rejimindədir."
      };
    }

    const hesab = dbSetriniHesabaCevir(netice.rows[0]);

    if (!hesab || hesab.status !== "aktiv") {
      return {
        success: false,
        linked: true,
        message: "Hesab aktiv deyil."
      };
    }

    return {
      success: true,
      linked: true,
      account: await clientHesabMelumatiniGenislet(client, hesab),
      message: "Hesab məlumatı alındı."
    };
  }
  finally {
    client.release();
  }
}

async function provayderHesabiniTap(client, provayder, providerUserId) {
  const netice = await client.query(
    `
    SELECT
      h.*,
      p.id AS provayder_setr_id,
      p.provayder,
      p.provayder_istifadeci_id
    FROM hesab_provayderleri p
    JOIN hesablar h
      ON h.hesab_id = p.hesab_id
    WHERE p.provayder = $1
      AND p.provayder_istifadeci_id = $2
    LIMIT 1
    `,
    [provayder, providerUserId]
  );

  if (!netice.rows || netice.rows.length !== 1) {
    return null;
  }

  return netice.rows[0];
}

async function provayderMetadataYenile(
  client,
  hesabId,
  provayder,
  providerUserId,
  email,
  emailVerified,
  displayName
) {
  await client.query(
    `
    UPDATE hesab_provayderleri
    SET
      provayder_email = NULLIF($4, ''),
      provayder_email_tesdiqlenib = $5,
      profil_adi = NULLIF($6, ''),
      son_giris_vaxti = NOW()
    WHERE hesab_id = $1
      AND provayder = $2
      AND provayder_istifadeci_id = $3
    `,
    [
      hesabId,
      provayder,
      providerUserId,
      metnAl(email, 320),
      emailVerified === true,
      metnAl(displayName, 160)
    ]
  );
}

async function auditYaz(client, hesabId, playerId, hadise, detallar) {
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
      hesabId || null,
      playerId || null,
      String(hadise || "hesab_hadisesi"),
      JSON.stringify(detallar || {})
    ]
  );
}

async function provayderLoginHesabiniHazirla({
  provider,
  providerUserId,
  email,
  emailVerified,
  displayName,
  currentPlayerId,
  currentAuthKind,
  mode
}) {
  const provayder = provayderAdiniTemizle(provider);
  const provayderIstifadeciId = metnAl(providerUserId, 512);
  const cariPlayerId = metnAl(currentPlayerId, 128);
  const rejim = metnAl(mode, 32).toLowerCase() === "link"
    ? "link"
    : "login";

  if (!provayder || !provayderIstifadeciId) {
    return {
      success: false,
      message: "Provayder hesab məlumatı düzgün deyil."
    };
  }

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

    const movcudProvayder = await provayderHesabiniTap(
      client,
      provayder,
      provayderIstifadeciId
    );

    if (rejim === "link") {
      if (!cariPlayerId || currentAuthKind !== "account") {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "Provayderi bağlamaq üçün aktiv hesab sessiyası tələb olunur."
        };
      }

      const cariHesabNeticesi = await client.query(
        `
        SELECT *
        FROM hesablar
        WHERE oyuncu_id = $1
        LIMIT 1
        FOR UPDATE
        `,
        [cariPlayerId]
      );

      if (!cariHesabNeticesi.rows || cariHesabNeticesi.rows.length !== 1) {
        await client.query("ROLLBACK");
        return { success: false, message: "Aktiv hesab tapılmadı." };
      }

      const cariHesab = dbSetriniHesabaCevir(cariHesabNeticesi.rows[0]);

      if (!cariHesab || cariHesab.status !== "aktiv") {
        await client.query("ROLLBACK");
        return { success: false, message: "Aktiv hesab tapılmadı." };
      }

      if (
        movcudProvayder &&
        String(movcudProvayder.hesab_id) !== String(cariHesab.accountId)
      ) {
        await client.query("ROLLBACK");
        return {
          success: false,
          providerAlreadyUsed: true,
          message: "Bu provayder hesabı başqa oyun hesabına bağlıdır."
        };
      }

      const eyniTipNeticesi = await client.query(
        `
        SELECT provayder_istifadeci_id
        FROM hesab_provayderleri
        WHERE hesab_id = $1
          AND provayder = $2
        LIMIT 1
        `,
        [cariHesab.accountId, provayder]
      );

      if (eyniTipNeticesi.rows && eyniTipNeticesi.rows.length > 0) {
        const eyniId = String(
          eyniTipNeticesi.rows[0].provayder_istifadeci_id || ""
        );

        if (eyniId !== provayderIstifadeciId) {
          await client.query("ROLLBACK");
          return {
            success: false,
            message: "Bu hesabda artıq başqa provayder profili bağlıdır."
          };
        }
      }
      else {
        await client.query(
          `
          INSERT INTO hesab_provayderleri (
            hesab_id,
            provayder,
            provayder_istifadeci_id,
            provayder_email,
            provayder_email_tesdiqlenib,
            profil_adi,
            son_giris_vaxti
          )
          VALUES ($1, $2, $3, NULLIF($4, ''), $5, NULLIF($6, ''), NOW())
          `,
          [
            cariHesab.accountId,
            provayder,
            provayderIstifadeciId,
            metnAl(email, 320),
            emailVerified === true,
            metnAl(displayName, 160)
          ]
        );
      }

      await provayderMetadataYenile(
        client,
        cariHesab.accountId,
        provayder,
        provayderIstifadeciId,
        email,
        emailVerified,
        displayName
      );

      await auditYaz(
        client,
        cariHesab.accountId,
        cariHesab.playerId,
        "provayder_hesaba_baglandi",
        { provider: provayder }
      );

      const clientAccount = await clientHesabMelumatiniGenislet(
        client,
        cariHesab
      );

      await client.query("COMMIT");

      return {
        success: true,
        linked: true,
        loginNeeded: false,
        account: clientAccount,
        rawAccount: cariHesab,
        message: "Provayder hesabı uğurla bağlandı."
      };
    }

    if (movcudProvayder) {
      const hesab = dbSetriniHesabaCevir(movcudProvayder);

      if (!hesab || hesab.status !== "aktiv") {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "Bu provayderə bağlı oyun hesabı aktiv deyil."
        };
      }

      await provayderMetadataYenile(
        client,
        hesab.accountId,
        provayder,
        provayderIstifadeciId,
        email,
        emailVerified,
        displayName
      );

      const clientAccount = await clientHesabMelumatiniGenislet(
        client,
        hesab
      );

      await client.query("COMMIT");

      return {
        success: true,
        linked: false,
        loginNeeded: true,
        isNewAccount: false,
        account: clientAccount,
        rawAccount: hesab,
        message: "Provayder hesabı tapıldı."
      };
    }

    let hedefPlayerId = "";

    if (currentAuthKind === "guest" && cariPlayerId) {
      hedefPlayerId = cariPlayerId;
    }
    else {
      hedefPlayerId = yeniId("player");
    }

    const playerHesabi = await client.query(
      `
      SELECT *
      FROM hesablar
      WHERE oyuncu_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [hedefPlayerId]
    );

    let hesab;

    if (playerHesabi.rows && playerHesabi.rows.length === 1) {
      hesab = dbSetriniHesabaCevir(playerHesabi.rows[0]);

      if (!hesab || hesab.status !== "aktiv") {
        await client.query("ROLLBACK");
        return { success: false, message: "Oyun hesabı aktiv deyil." };
      }
    }
    else {
      const hesabId = yeniId("hesab");

      const yeniHesabNeticesi = await client.query(
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
        RETURNING *
        `,
        [hesabId, hedefPlayerId]
      );

      hesab = dbSetriniHesabaCevir(yeniHesabNeticesi.rows[0]);
    }

    await client.query(
      `
      INSERT INTO hesab_provayderleri (
        hesab_id,
        provayder,
        provayder_istifadeci_id,
        provayder_email,
        provayder_email_tesdiqlenib,
        profil_adi,
        son_giris_vaxti
      )
      VALUES ($1, $2, $3, NULLIF($4, ''), $5, NULLIF($6, ''), NOW())
      `,
      [
        hesab.accountId,
        provayder,
        provayderIstifadeciId,
        metnAl(email, 320),
        emailVerified === true,
        metnAl(displayName, 160)
      ]
    );

    await auditYaz(
      client,
      hesab.accountId,
      hesab.playerId,
      "provayder_ile_hesab_yaradildi",
      {
        provider: provayder,
        guestProgressBound: currentAuthKind === "guest" && cariPlayerId === hesab.playerId
      }
    );

    const clientAccount = await clientHesabMelumatiniGenislet(
      client,
      hesab
    );

    await client.query("COMMIT");

    return {
      success: true,
      linked: currentAuthKind === "guest" && cariPlayerId === hesab.playerId,
      loginNeeded: true,
      isNewAccount: true,
      account: clientAccount,
      rawAccount: hesab,
      message: currentAuthKind === "guest" && cariPlayerId === hesab.playerId
        ? "Guest oyun tərəqqisi provayder hesabına bağlandı."
        : "Yeni provayder hesabı yaradıldı."
    };
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}

    if (xeta && xeta.code === "23505") {
      return {
        success: false,
        message: "Provayder hesabı artıq istifadə olunur. Yenidən cəhd edin."
      };
    }

    console.error("[PROVAYDER_DB] Hesab hazırlama xətası:", xeta);

    return {
      success: false,
      message: "Provayder hesabı serverdə hazırlana bilmədi."
    };
  }
  finally {
    client.release();
  }
}

async function provayderSessiyasiYarat(rawAccount, cihazId, provider) {
  const hesab = rawAccount;

  if (!hesab || !hesab.accountId || !hesab.playerId) {
    return { success: false, message: "Hesab məlumatı düzgün deyil." };
  }

  const temizCihazId = metnAl(cihazId, 128);
  const temizProvayder = provayderAdiniTemizle(provider);
  const sessiyaId = yeniId("sessiya");
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const refreshTokenHash = tokenHashYarat(refreshToken);
  const bitmeVaxtiMs = Date.now() + SESSIYA_MUDDETI_MS;

  const hovuz = proqramHovuzunuAl();
  const client = await hovuz.connect();

  try {
    await client.query("BEGIN");

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

    const aktivler = await client.query(
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

    if (aktivler.rows.length >= MAKSIMUM_AKTIV_SESSIYA) {
      const legvEdilecek = aktivler.rows
        .slice(MAKSIMUM_AKTIV_SESSIYA - 1)
        .map(x => x.sessiya_id);

      if (legvEdilecek.length > 0) {
        await client.query(
          `
          UPDATE hesab_sessiyalari
          SET legv_vaxti = NOW()
          WHERE sessiya_id = ANY($1::text[])
          `,
          [legvEdilecek]
        );
      }
    }

    await client.query(
      `
      INSERT INTO hesab_sessiyalari (
        sessiya_id,
        hesab_id,
        refresh_token_hash,
        cihaz_id,
        bitme_vaxti
      )
      VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5 / 1000.0))
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
      hesab.accountId,
      hesab.playerId,
      "provayder_ile_daxil_olundu",
      {
        provider: temizProvayder,
        sessionId: sessiyaId,
        hasDeviceId: Boolean(temizCihazId)
      }
    );

    const clientAccount = await clientHesabMelumatiniGenislet(
      client,
      hesab
    );

    await client.query("COMMIT");

    return {
      success: true,
      account: clientAccount,
      session: {
        sessionId: sessiyaId,
        refreshToken,
        expiresAtMs: bitmeVaxtiMs
      },
      message: "Provayder sessiyası yaradıldı."
    };
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("[PROVAYDER_SESSIYA] Sessiya yaratma xətası:", xeta);
    return { success: false, message: "Provayder sessiyası yaradıla bilmədi." };
  }
  finally {
    client.release();
  }
}

async function sessiyaniIdIleLegvEt(sessiyaId) {
  const temizSessiyaId = metnAl(sessiyaId, 128);
  if (!temizSessiyaId) return true;

  const hovuz = proqramHovuzunuAl();

  await hovuz.query(
    `
    UPDATE hesab_sessiyalari
    SET legv_vaxti = COALESCE(legv_vaxti, NOW())
    WHERE sessiya_id = $1
    `,
    [temizSessiyaId]
  );

  return true;
}

function yeniGuestPlayerIdYarat() {
  return yeniId("guest");
}

module.exports = {
  hesabMelumatiniPlayerIdIleAl,
  provayderLoginHesabiniHazirla,
  provayderSessiyasiYarat,
  sessiyaniIdIleLegvEt,
  yeniGuestPlayerIdYarat
};
