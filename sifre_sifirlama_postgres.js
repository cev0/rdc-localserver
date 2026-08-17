"use strict";

const crypto = require("crypto");

const {
    proqramHovuzunuAl
} = require("./verilenler_bazasi");

const {
    emailNormallasdir,
    emailDuzgundur,
    SIFRE_MINIMUM_UZUNLUQ,
    SIFRE_MAKSIMUM_UZUNLUQ,
    sifreHashYarat
} = require("./hesab_yaddasi_postgres");

const KOD_MUDDETI_MS = 10 * 60 * 1000;
const TOKEN_MUDDETI_MS = 10 * 60 * 1000;
const YENIDEN_GONDERME_MS = 60 * 1000;
const MAKSIMUM_CEHD = 5;

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

function sabitMesaj() {
    return "Əgər bu e-poçt ünvanı hesabla bağlıdırsa, təsdiq kodu göndəriləcək.";
}

async function sifreSifirlamaKodunuHazirla(email, secimler = {}) {
    const temizEmail = emailNormallasdir(email);

    if (!emailDuzgundur(temizEmail)) {
        return {
            success: false,
            message: "Düzgün e-poçt ünvanı daxil edin."
        };
    }

    const hovuz = secimler.hovuz || proqramHovuzunuAl();
    const secilmisVaxt = Number(secimler.nowMs);
    const indiMs = Number.isFinite(secilmisVaxt) && secilmisVaxt > 0
        ? Math.trunc(secilmisVaxt)
        : Date.now();
    const client = await hovuz.connect();

    try {
        await client.query("BEGIN");

        const hesabNeticesi = await client.query(
            `
            SELECT
                hesab_id,
                oyuncu_id,
                esas_email,
                status
            FROM hesablar
            WHERE LOWER(esas_email) = $1
            LIMIT 1
            FOR UPDATE
            `,
            [temizEmail]
        );

        // Hesabın mövcudluğunu client-ə açıqlamırıq.
        if (
            !hesabNeticesi.rows ||
            hesabNeticesi.rows.length !== 1 ||
            hesabNeticesi.rows[0].status !== "aktiv"
        ) {
            await client.query("ROLLBACK");

            return {
                success: true,
                emailGonderilmeli: false,
                message: sabitMesaj()
            };
        }

        const hesabSetri = hesabNeticesi.rows[0];
        const hesab = {
            accountId: hesabSetri.hesab_id,
            playerId: hesabSetri.oyuncu_id,
            primaryEmail: hesabSetri.esas_email
        };

        const sonSorqu = await client.query(
            `
            SELECT yaradilma_vaxti
            FROM sifre_sifirlama_sorqulari
            WHERE hesab_id = $1
              AND istifade_vaxti IS NULL
            ORDER BY yaradilma_vaxti DESC
            LIMIT 1
            `,
            [hesab.accountId]
        );

        if (sonSorqu.rows && sonSorqu.rows.length > 0) {
            const sonVaxt = new Date(
                sonSorqu.rows[0].yaradilma_vaxti
            ).getTime();
            const kecen = indiMs - sonVaxt;

            if (kecen >= 0 && kecen < YENIDEN_GONDERME_MS) {
                await client.query("ROLLBACK");

                return {
                    success: true,
                    emailGonderilmeli: false,
                    cooldown: true,
                    retryAfterMs: YENIDEN_GONDERME_MS - kecen,
                    message: sabitMesaj()
                };
            }
        }

        const sorquId = crypto.randomBytes(16).toString("hex");
        const kod = kodYarat();
        const duz = crypto.randomBytes(16).toString("hex");
        const kodHash = kodHashYarat(kod, duz);
        const bitmeVaxtiMs = indiMs + KOD_MUDDETI_MS;

        // Köhnə istifadə olunmamış sorğuları ləğv edirik.
        await client.query(
            `
            UPDATE sifre_sifirlama_sorqulari
            SET istifade_vaxti = NOW()
            WHERE hesab_id = $1
              AND istifade_vaxti IS NULL
            `,
            [hesab.accountId]
        );

        await client.query(
            `
            INSERT INTO sifre_sifirlama_sorqulari (
                sorqu_id,
                hesab_id,
                kod_hash,
                duz,
                bitme_vaxti,
                cehd_sayi,
                yaradilma_vaxti,
                istifade_vaxti,
                tesdiq_vaxti,
                reset_token_hash,
                reset_token_bitme_vaxti
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
                hesab.accountId,
                kodHash,
                duz,
                bitmeVaxtiMs
            ]
        );

        await client.query("COMMIT");

        console.log("[SIFRE_SIFIRLAMA] Kod hazırlandı:", {
            accountId: hesab.accountId,
            playerId: hesab.playerId,
            email: hesab.primaryEmail,
            sorquId
        });

        return {
            success: true,
            emailGonderilmeli: true,
            email: hesab.primaryEmail,
            kod,
            sorquId,
            expiresAtMs: bitmeVaxtiMs,
            message: sabitMesaj()
        };
    }
    catch (xeta) {
        try {
            await client.query("ROLLBACK");
        }
        catch {
        }

        console.error("[SIFRE_SIFIRLAMA] Kod yaradıla bilmədi:", xeta);

        return {
            success: false,
            message: "Şifrə sıfırlama sorğusu yaradıla bilmədi."
        };
    }
    finally {
        client.release();
    }
}

async function sifreSifirlamaSorqusunuLegvEt(sorquId) {
    const temizSorquId = String(sorquId || "").trim();

    if (!temizSorquId) return;

    const hovuz = proqramHovuzunuAl();

    await hovuz.query(
        `
        UPDATE sifre_sifirlama_sorqulari
        SET istifade_vaxti = NOW()
        WHERE sorqu_id = $1
          AND istifade_vaxti IS NULL
        `,
        [temizSorquId]
    );
}

async function sifreSifirlamaKodunuYoxla(email, kod) {
    const temizEmail = emailNormallasdir(email);
    const temizKod = String(kod || "").trim();

    if (!emailDuzgundur(temizEmail)) {
        return {
            success: false,
            message: "E-poçt və ya təsdiq kodu yanlışdır."
        };
    }

    if (!/^\d{6}$/.test(temizKod)) {
        return {
            success: false,
            message: "6 rəqəmli təsdiq kodu daxil edin."
        };
    }

    const hesab = await hesabEmailIleTap(temizEmail);

    if (!hesab || hesab.status !== "aktiv") {
        return {
            success: false,
            message: "E-poçt və ya təsdiq kodu yanlışdır."
        };
    }

    const hovuz = proqramHovuzunuAl();
    const client = await hovuz.connect();

    try {
        await client.query("BEGIN");

        const netice = await client.query(
            `
            SELECT
                sorqu_id,
                kod_hash,
                duz,
                bitme_vaxti,
                cehd_sayi
            FROM sifre_sifirlama_sorqulari
            WHERE hesab_id = $1
              AND istifade_vaxti IS NULL
              AND tesdiq_vaxti IS NULL
            ORDER BY yaradilma_vaxti DESC
            LIMIT 1
            FOR UPDATE
            `,
            [hesab.accountId]
        );

        if (!netice.rows || netice.rows.length !== 1) {
            await client.query("ROLLBACK");

            return {
                success: false,
                message: "Aktiv təsdiq kodu yoxdur. Yeni kod istəyin."
            };
        }

        const sorqu = netice.rows[0];
        const bitmeVaxtiMs = new Date(sorqu.bitme_vaxti).getTime();

        if (Date.now() > bitmeVaxtiMs) {
            await client.query(
                `
                UPDATE sifre_sifirlama_sorqulari
                SET istifade_vaxti = NOW()
                WHERE sorqu_id = $1
                `,
                [sorqu.sorqu_id]
            );

            await client.query("COMMIT");

            return {
                success: false,
                expired: true,
                message: "Təsdiq kodunun vaxtı bitib. Yeni kod istəyin."
            };
        }

        const cehdSayi = Math.max(
            0,
            Math.trunc(Number(sorqu.cehd_sayi) || 0)
        );

        if (cehdSayi >= MAKSIMUM_CEHD) {
            await client.query("ROLLBACK");

            return {
                success: false,
                tooManyAttempts: true,
                message: "Çox sayda səhv cəhd edildi. Yeni kod istəyin."
            };
        }

        const yeniHash = kodHashYarat(temizKod, sorqu.duz);
        const saxlanmis = Buffer.from(String(sorqu.kod_hash || ""), "hex");
        const daxilEdilen = Buffer.from(yeniHash, "hex");

        const kodDuzgundur =
            saxlanmis.length > 0 &&
            saxlanmis.length === daxilEdilen.length &&
            crypto.timingSafeEqual(saxlanmis, daxilEdilen);

        if (!kodDuzgundur) {
            const yeniCehd = cehdSayi + 1;

            await client.query(
                `
                UPDATE sifre_sifirlama_sorqulari
                SET cehd_sayi = $2
                WHERE sorqu_id = $1
                `,
                [sorqu.sorqu_id, yeniCehd]
            );

            await client.query("COMMIT");

            return {
                success: false,
                attemptsRemaining: Math.max(0, MAKSIMUM_CEHD - yeniCehd),
                message: "Təsdiq kodu yanlışdır."
            };
        }

        const resetToken = tokenYarat();
        const resetTokenHash = tokenHashYarat(resetToken);
        const tokenBitmeVaxtiMs = Date.now() + TOKEN_MUDDETI_MS;

        await client.query(
            `
            UPDATE sifre_sifirlama_sorqulari
            SET
                tesdiq_vaxti = NOW(),
                reset_token_hash = $2,
                reset_token_bitme_vaxti = TO_TIMESTAMP($3 / 1000.0),
                cehd_sayi = 0
            WHERE sorqu_id = $1
            `,
            [
                sorqu.sorqu_id,
                resetTokenHash,
                tokenBitmeVaxtiMs
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            resetToken,
            expiresAtMs: tokenBitmeVaxtiMs,
            message: "Təsdiq kodu düzgündür. Yeni şifrə təyin edə bilərsiniz."
        };
    }
    catch (xeta) {
        try {
            await client.query("ROLLBACK");
        }
        catch {
        }

        console.error("[SIFRE_SIFIRLAMA] Kod yoxlanılmadı:", xeta);

        return {
            success: false,
            message: "Təsdiq kodu yoxlanarkən server xətası baş verdi."
        };
    }
    finally {
        client.release();
    }
}

async function yeniSifreTeyinEt(resetToken, yeniSifre) {
    const temizToken = String(resetToken || "").trim();

    if (temizToken.length < 32 || temizToken.length > 512) {
        return {
            success: false,
            message: "Şifrə sıfırlama icazəsi etibarsızdır."
        };
    }

    if (
        typeof yeniSifre !== "string" ||
        yeniSifre.length <
            SIFRE_MINIMUM_UZUNLUQ ||
        yeniSifre.length >
            SIFRE_MAKSIMUM_UZUNLUQ
    ) {
        return {
            success: false,
            message: "Yeni şifrə 8-64 simvol arasında olmalıdır."
        };
    }

    const tokenHash = tokenHashYarat(temizToken);
    const hovuz = proqramHovuzunuAl();
    const client = await hovuz.connect();

    try {
        await client.query("BEGIN");

        const netice = await client.query(
            `
            SELECT
                s.sorqu_id,
                s.hesab_id,
                h.oyuncu_id,
                h.esas_email,
                h.status
            FROM sifre_sifirlama_sorqulari s
            JOIN hesablar h
              ON h.hesab_id = s.hesab_id
            WHERE s.reset_token_hash = $1
              AND s.tesdiq_vaxti IS NOT NULL
              AND s.istifade_vaxti IS NULL
              AND s.reset_token_bitme_vaxti > NOW()
            LIMIT 1
            FOR UPDATE OF s, h
            `,
            [tokenHash]
        );

        if (!netice.rows || netice.rows.length !== 1) {
            await client.query("ROLLBACK");

            return {
                success: false,
                message: "Şifrə sıfırlama icazəsi bitib və ya etibarsızdır."
            };
        }

        const setr = netice.rows[0];

        if (setr.status !== "aktiv") {
            await client.query("ROLLBACK");

            return {
                success: false,
                message: "Bu hesab üçün şifrə dəyişmək mümkün deyil."
            };
        }

        const yeniHash = sifreHashYarat(yeniSifre);

        await client.query(
            `
            UPDATE hesablar
            SET
                sifre_hash = $2,
                yenilenme_vaxti = NOW()
            WHERE hesab_id = $1
            `,
            [setr.hesab_id, yeniHash]
        );

        // Şifrə dəyişəndə bütün köhnə sessiyalar ləğv edilir.
        await client.query(
            `
            UPDATE hesab_sessiyalari
            SET legv_vaxti = NOW()
            WHERE hesab_id = $1
              AND legv_vaxti IS NULL
            `,
            [setr.hesab_id]
        );

        await client.query(
            `
            UPDATE sifre_sifirlama_sorqulari
            SET
                istifade_vaxti = NOW(),
                reset_token_hash = NULL,
                reset_token_bitme_vaxti = NULL
            WHERE sorqu_id = $1
            `,
            [setr.sorqu_id]
        );

        await client.query(
            `
            UPDATE sifre_sifirlama_sorqulari
            SET istifade_vaxti = NOW()
            WHERE hesab_id = $1
              AND sorqu_id <> $2
              AND istifade_vaxti IS NULL
            `,
            [setr.hesab_id, setr.sorqu_id]
        );

        await client.query(
            `
            INSERT INTO hesab_audit_jurnali (
                hesab_id,
                oyuncu_id,
                hadise_novu,
                detallar
            )
            VALUES ($1, $2, 'sifre_sifirlandi', $3::jsonb)
            `,
            [
                setr.hesab_id,
                setr.oyuncu_id,
                JSON.stringify({
                    email: setr.esas_email
                })
            ]
        );

        await client.query("COMMIT");

        console.log("[SIFRE_SIFIRLAMA] Şifrə uğurla dəyişdirildi:", {
            accountId: setr.hesab_id,
            playerId: setr.oyuncu_id,
            email: setr.esas_email
        });

        return {
            success: true,
            message: "Şifrəniz uğurla yeniləndi. Yenidən daxil olun."
        };
    }
    catch (xeta) {
        try {
            await client.query("ROLLBACK");
        }
        catch {
        }

        console.error("[SIFRE_SIFIRLAMA] Yeni şifrə təyin edilmədi:", xeta);

        return {
            success: false,
            message: "Yeni şifrə təyin edilərkən server xətası baş verdi."
        };
    }
    finally {
        client.release();
    }
}

module.exports = {
    sifreSifirlamaKodunuHazirla,
    sifreSifirlamaSorqusunuLegvEt,
    sifreSifirlamaKodunuYoxla,
    yeniSifreTeyinEt
};
