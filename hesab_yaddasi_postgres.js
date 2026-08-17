"use strict";

const crypto = require("crypto");

const {
    proqramHovuzunuAl
} = require("./verilenler_bazasi");


// ============================================================
// EMAIL NORMALLAŞDIRMA
// ============================================================

function emailNormallasdir(email)
{
    if (typeof email !== "string") {
        return "";
    }

    return email
        .trim()
        .toLowerCase();
}


// ============================================================
// EMAIL YOXLAMA
// ============================================================

function emailDuzgundur(email)
{
    const temizEmail =
        emailNormallasdir(email);

    if (!temizEmail) {
        return false;
    }

    if (temizEmail.includes(" ")) {
        return false;
    }

    const etYeri =
        temizEmail.indexOf("@");

    if (etYeri <= 0) {
        return false;
    }

    if (
        etYeri !==
        temizEmail.lastIndexOf("@")
    ) {
        return false;
    }

    const noqteYeri =
        temizEmail.lastIndexOf(".");

    if (noqteYeri <= etYeri + 1) {
        return false;
    }

    if (
        noqteYeri >=
        temizEmail.length - 1
    ) {
        return false;
    }

    return true;
}


// ============================================================
// ŞİFRƏ HASH
// ============================================================

function sifreHashYarat(sifre)
{
    if (
        typeof sifre !== "string" ||
        sifre.length < 8
    ) {
        throw new Error(
            "Şifrə ən azı 8 simvol olmalıdır."
        );
    }

    const duz =
        crypto
            .randomBytes(16)
            .toString("hex");

    const hash =
        crypto
            .scryptSync(
                sifre,
                duz,
                64
            )
            .toString("hex");

    return `${duz}:${hash}`;
}


// ============================================================
// ŞİFRƏ YOXLAMA
// ============================================================

function sifreDuzgundur(
    sifre,
    saxlanmisHash
)
{
    if (
        typeof sifre !== "string" ||
        typeof saxlanmisHash !== "string"
    ) {
        return false;
    }

    const hisseler =
        saxlanmisHash.split(":");

    if (hisseler.length !== 2) {
        return false;
    }

    const duz =
        hisseler[0];

    const hashHex =
        hisseler[1];

    let saxlanmisBuffer;

    try {
        saxlanmisBuffer =
            Buffer.from(
                hashHex,
                "hex"
            );
    }
    catch {
        return false;
    }

    const yeniBuffer =
        crypto.scryptSync(
            sifre,
            duz,
            64
        );

    if (
        saxlanmisBuffer.length !==
        yeniBuffer.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        saxlanmisBuffer,
        yeniBuffer
    );
}


// ============================================================
// DB SƏTRİNİ HESAB OBYEKTİNƏ ÇEVİR
// ============================================================

function dbSetriniHesabaCevir(setr)
{
    if (!setr) {
        return null;
    }

    return {
        accountId:
            setr.hesab_id,

        playerId:
            setr.oyuncu_id,

        primaryEmail:
            setr.esas_email,

        secondaryEmail:
            setr.ikinci_email || "",

        emailVerified:
            Boolean(
                setr.email_tesdiqlenib
            ),

        passwordHash:
            setr.sifre_hash,

        pinHash:
            setr.pin_hash || "",

        status:
            setr.status,

        createdAtMs:
            setr.yaradilma_vaxti
                ? new Date(
                    setr.yaradilma_vaxti
                ).getTime()
                : 0,

        updatedAtMs:
            setr.yenilenme_vaxti
                ? new Date(
                    setr.yenilenme_vaxti
                ).getTime()
                : 0
    };
}


// ============================================================
// CLIENT ÜÇÜN TƏHLÜKƏSİZ HESAB MƏLUMATI
// ============================================================

function clientHesabMelumati(hesab)
{
    if (!hesab) {
        return null;
    }

    return {
        accountId:
            hesab.accountId,

        playerId:
            hesab.playerId,

        primaryEmail:
            hesab.primaryEmail,

        secondaryEmail:
            hesab.secondaryEmail || "",

        emailVerified:
            Boolean(
                hesab.emailVerified
            ),

        providers: [
            "email"
        ],

        createdAtMs:
            Number(
                hesab.createdAtMs || 0
            )
    };
}


// ============================================================
// PLAYER ID İLƏ HESAB TAP
// ============================================================

async function hesabPlayerIdIleTap(
    playerId
)
{
    if (
        typeof playerId !== "string" ||
        !playerId.trim()
    ) {
        return null;
    }

    const hovuz =
        proqramHovuzunuAl();

    const netice =
        await hovuz.query(
            `
            SELECT *
            FROM hesablar
            WHERE oyuncu_id = $1
            LIMIT 1
            `,
            [
                playerId.trim()
            ]
        );

    if (
        !netice.rows ||
        netice.rows.length === 0
    ) {
        return null;
    }

    return dbSetriniHesabaCevir(
        netice.rows[0]
    );
}


// ============================================================
// EMAIL İLƏ HESAB TAP
// ============================================================

async function hesabEmailIleTap(
    email
)
{
    const temizEmail =
        emailNormallasdir(email);

    if (!temizEmail) {
        return null;
    }

    const hovuz =
        proqramHovuzunuAl();

    const netice =
        await hovuz.query(
            `
            SELECT *
            FROM hesablar
            WHERE LOWER(esas_email) = $1
            LIMIT 1
            `,
            [
                temizEmail
            ]
        );

    if (
        !netice.rows ||
        netice.rows.length === 0
    ) {
        return null;
    }

    return dbSetriniHesabaCevir(
        netice.rows[0]
    );
}


// ============================================================
// MÖVCUD OYUNÇUNU EMAIL HESABINA BAĞLA
// ============================================================

async function hesabYaratVeBagla(
    playerId,
    email,
    sifre
)
{
    if (
        typeof playerId !== "string" ||
        !playerId.trim()
    ) {
        return {
            success: false,
            message:
                "Oyunçu ID müəyyən edilməyib."
        };
    }

    const temizPlayerId =
        playerId.trim();

    const temizEmail =
        emailNormallasdir(email);


    if (!emailDuzgundur(temizEmail)) {
        return {
            success: false,
            message:
                "E-poçt ünvanı düzgün deyil."
        };
    }


    if (
        typeof sifre !== "string" ||
        sifre.length < 8
    ) {
        return {
            success: false,
            message:
                "Şifrə ən azı 8 simvol olmalıdır."
        };
    }


    // ========================================================
    // ƏVVƏL MÖVCUD HESABLARI YOXLAYIRIQ
    // ========================================================

    const emailHesabi =
        await hesabEmailIleTap(
            temizEmail
        );

    if (emailHesabi) {
        return {
            success: false,
            message:
                "Bu e-poçt ünvanı artıq istifadə olunur."
        };
    }


    const playerHesabi =
        await hesabPlayerIdIleTap(
            temizPlayerId
        );

    if (playerHesabi) {
        return {
            success: false,

            message:
                "Bu oyun hesabı artıq bağlanıb.",

            account:
                clientHesabMelumati(
                    playerHesabi
                )
        };
    }


    const hesabId =
        crypto
            .randomBytes(16)
            .toString("hex");

    const sifreHash =
        sifreHashYarat(
            sifre
        );


    const hovuz =
        proqramHovuzunuAl();

    const client =
        await hovuz.connect();


    try {
        await client.query(
            "BEGIN"
        );


        const netice =
            await client.query(
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
                VALUES (
                    $1,
                    $2,
                    $3,
                    NULL,
                    FALSE,
                    $4,
                    NULL,
                    'aktiv'
                )
                RETURNING *
                `,
                [
                    hesabId,
                    temizPlayerId,
                    temizEmail,
                    sifreHash
                ]
            );


        await client.query(
            `
            INSERT INTO hesab_provayderleri (
                hesab_id,
                provayder,
                provayder_istifadeci_id
            )
            VALUES (
                $1,
                'email',
                $2
            )
            `,
            [
                hesabId,
                temizEmail
            ]
        );


        await client.query(
            "COMMIT"
        );


        const yeniHesab =
            dbSetriniHesabaCevir(
                netice.rows[0]
            );


        console.log(
            "[HESAB_DB] Yeni hesab yaradıldı:",
            {
                accountId:
                    yeniHesab.accountId,

                playerId:
                    yeniHesab.playerId,

                email:
                    yeniHesab.primaryEmail
            }
        );


        return {
            success: true,

            message:
                "Hesab uğurla yaradıldı.",

            account:
                clientHesabMelumati(
                    yeniHesab
                )
        };
    }
    catch (xeta) {
        try {
            await client.query(
                "ROLLBACK"
            );
        }
        catch {
        }


        // PostgreSQL unique violation
        if (xeta && xeta.code === "23505") {
            return {
                success: false,
                message:
                    "Bu e-poçt və ya oyun hesabı artıq istifadə olunur."
            };
        }


        console.error(
            "[HESAB_DB] Hesab yaradılmadı:",
            xeta
        );


        return {
            success: false,
            message:
                "Hesab serverdə yaradıla bilmədi."
        };
    }
    finally {
        client.release();
    }
}

// ============================================================
// EMAIL TƏSDİQ AYARLARI
// ============================================================

const EMAIL_TESDIQ_KOD_MUDDETI_MS =
    10 * 60 * 1000;

const EMAIL_TESDIQ_YENIDEN_GONDERME_MS =
    60 * 1000;

const EMAIL_TESDIQ_MAKSIMUM_CEHD =
    5;


// ============================================================
// 6 RƏQƏMLİ KOD YARAT
// ============================================================

function emailTesdiqKoduRandomYarat()
{
    return crypto
        .randomInt(
            0,
            1000000
        )
        .toString()
        .padStart(
            6,
            "0"
        );
}


// ============================================================
// TƏSDİQ KODUNUN HASH-INI YARAT
// ============================================================

function emailTesdiqKoduHashYarat(
    kod,
    duz
)
{
    return crypto
        .scryptSync(
            String(kod),
            String(duz),
            32
        )
        .toString("hex");
}


// ============================================================
// EMAIL TƏSDİQ KODUNU HAZIRLA
// ============================================================

async function emailTesdiqKoduHazirla(
    playerId,
    secimler = {}
)
{
    const temizPlayerId =
        typeof playerId === "string"
            ? playerId.trim()
            : "";

    if (!temizPlayerId) {
        return {
            success: false,
            message:
                "Hesab tapılmadı."
        };
    }

    const hovuz =
        secimler.hovuz ||
        proqramHovuzunuAl();

    const secilmisVaxt =
        Number(secimler.nowMs);

    const indi =
        Number.isFinite(secilmisVaxt) &&
        secilmisVaxt > 0
            ? Math.trunc(secilmisVaxt)
            : Date.now();

    const client =
        await hovuz.connect();

    try {
        await client.query("BEGIN");

        const hesabNeticesi =
            await client.query(
                `
                SELECT
                    hesab_id,
                    oyuncu_id,
                    esas_email,
                    ikinci_email,
                    email_tesdiqlenib,
                    yaradilma_vaxti,
                    yenilenme_vaxti
                FROM hesablar
                WHERE oyuncu_id = $1
                LIMIT 1
                FOR UPDATE
                `,
                [
                    temizPlayerId
                ]
            );

        if (
            !hesabNeticesi.rows ||
            hesabNeticesi.rows.length !== 1
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                message:
                    "Hesab tapılmadı."
            };
        }

        const hesab =
            dbSetriniHesabaCevir(
                hesabNeticesi.rows[0]
            );

        if (hesab.emailVerified === true) {
            await client.query("ROLLBACK");

            return {
                success: true,
                alreadyVerified: true,

                message:
                    "E-poçt artıq təsdiqlənib.",

                account:
                    clientHesabMelumati(
                        hesab
                    )
            };
        }

        // ====================================================
        // SON GÖNDƏRİLMƏ VAXTINI HESAB KİLİDİ ALTINDA YOXLAYIRIQ
        // ====================================================

        const movcudTesdiq =
            await client.query(
                `
                SELECT
                    son_gonderilme_vaxti
                FROM email_tesdiqleri
                WHERE hesab_id = $1
                LIMIT 1
                `,
                [
                    hesab.accountId
                ]
            );

        if (
            movcudTesdiq.rows &&
            movcudTesdiq.rows.length > 0
        ) {
            const sonGonderilme =
                new Date(
                    movcudTesdiq.rows[0]
                        .son_gonderilme_vaxti
                ).getTime();

            const kecenVaxt =
                indi -
                sonGonderilme;

            if (
                kecenVaxt >= 0 &&
                kecenVaxt <
                    EMAIL_TESDIQ_YENIDEN_GONDERME_MS
            ) {
                await client.query("ROLLBACK");

                return {
                    success: false,
                    cooldown: true,

                    retryAfterMs:
                        EMAIL_TESDIQ_YENIDEN_GONDERME_MS -
                        kecenVaxt,

                    message:
                        "Yeni kod istəmək üçün bir qədər gözləyin."
                };
            }
        }

        // ====================================================
        // YENİ KOD
        // ====================================================

        const kod =
            emailTesdiqKoduRandomYarat();

        const duz =
            crypto
                .randomBytes(16)
                .toString("hex");

        const kodHash =
            emailTesdiqKoduHashYarat(
                kod,
                duz
            );

        const bitmeVaxti =
            indi +
            EMAIL_TESDIQ_KOD_MUDDETI_MS;

        await client.query(
            `
            INSERT INTO email_tesdiqleri (
                hesab_id,
                kod_hash,
                duz,
                bitme_vaxti,
                cehd_sayi,
                son_gonderilme_vaxti
            )
            VALUES (
                $1,
                $2,
                $3,
                TO_TIMESTAMP($4 / 1000.0),
                0,
                NOW()
            )

            ON CONFLICT (hesab_id)
            DO UPDATE SET
                kod_hash = EXCLUDED.kod_hash,
                duz = EXCLUDED.duz,
                bitme_vaxti = EXCLUDED.bitme_vaxti,
                cehd_sayi = 0,
                son_gonderilme_vaxti = NOW(),
                yaradilma_vaxti = NOW()
            `,
            [
                hesab.accountId,
                kodHash,
                duz,
                bitmeVaxti
            ]
        );

        await client.query(
            `
            UPDATE hesablar
            SET yenilenme_vaxti = NOW()
            WHERE hesab_id = $1
            `,
            [
                hesab.accountId
            ]
        );

        await client.query("COMMIT");

        console.log(
            "[HESAB_DB] Email təsdiq kodu hazırlandı:",
            {
                accountId:
                    hesab.accountId,

                playerId:
                    hesab.playerId,

                email:
                    hesab.primaryEmail
            }
        );

        return {
            success: true,

            alreadyVerified: false,

            message:
                "Təsdiq kodu hazırlandı.",

            email:
                hesab.primaryEmail,

            kod:
                kod,

            expiresAtMs:
                bitmeVaxti
        };
    }
    catch (xeta) {
        try {
            await client.query("ROLLBACK");
        }
        catch {
        }

        throw xeta;
    }
    finally {
        client.release();
    }
}


// ============================================================
// EMAIL TƏSDİQ KODUNU YOXLAMA
// ============================================================

async function emailTesdiqKodunuYoxla(
    playerId,
    kod,
    secimler = {}
)
{
    const temizPlayerId =
        typeof playerId === "string"
            ? playerId.trim()
            : "";

    if (!temizPlayerId) {
        return {
            success: false,
            message:
                "Hesab tapılmadı."
        };
    }

    const temizKod =
        String(kod || "")
            .trim();

    if (!/^\d{6}$/.test(temizKod)) {
        return {
            success: false,
            message:
                "6 rəqəmli təsdiq kodu daxil edin."
        };
    }

    const hovuz =
        secimler.hovuz ||
        proqramHovuzunuAl();

    const secilmisVaxt =
        Number(secimler.nowMs);

    const indi =
        Number.isFinite(secilmisVaxt) &&
        secilmisVaxt > 0
            ? Math.trunc(secilmisVaxt)
            : Date.now();

    const client =
        await hovuz.connect();

    try {
        await client.query("BEGIN");

        // Kod yaratma axını da eyni hesab sətrini kilidləyir. Bununla
        // resend, səhv cəhd və uğurlu təsdiq bir hesab üçün ardıcıl işləyir.
        const hesabNeticesi =
            await client.query(
                `
                SELECT *
                FROM hesablar
                WHERE oyuncu_id = $1
                LIMIT 1
                FOR UPDATE
                `,
                [
                    temizPlayerId
                ]
            );

        if (
            !hesabNeticesi.rows ||
            hesabNeticesi.rows.length !== 1
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                message:
                    "Hesab tapılmadı."
            };
        }

        const hesab =
            dbSetriniHesabaCevir(
                hesabNeticesi.rows[0]
            );

        if (hesab.emailVerified === true) {
            await client.query("ROLLBACK");

            return {
                success: true,
                alreadyVerified: true,

                message:
                    "E-poçt artıq təsdiqlənib.",

                account:
                    clientHesabMelumati(
                        hesab
                    )
            };
        }

        const netice =
            await client.query(
                `
                SELECT
                    kod_hash,
                    duz,
                    bitme_vaxti,
                    cehd_sayi
                FROM email_tesdiqleri
                WHERE hesab_id = $1
                LIMIT 1
                FOR UPDATE
                `,
                [
                    hesab.accountId
                ]
            );

        if (
            !netice.rows ||
            netice.rows.length === 0
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                message:
                    "Aktiv təsdiq kodu yoxdur. Yeni kod istəyin."
            };
        }

        const tesdiq =
            netice.rows[0];

        const bitmeVaxti =
            new Date(
                tesdiq.bitme_vaxti
            ).getTime();

        if (indi > bitmeVaxti) {
            await client.query(
                `
                DELETE FROM email_tesdiqleri
                WHERE hesab_id = $1
                `,
                [
                    hesab.accountId
                ]
            );

            await client.query("COMMIT");

            return {
                success: false,
                expired: true,

                message:
                    "Təsdiq kodunun vaxtı bitib. Yeni kod istəyin."
            };
        }

        const cehdSayi =
            Math.max(
                0,
                Math.trunc(
                    Number(
                        tesdiq.cehd_sayi
                    ) || 0
                )
            );

        if (
            cehdSayi >=
            EMAIL_TESDIQ_MAKSIMUM_CEHD
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                tooManyAttempts: true,

                message:
                    "Çox sayda səhv cəhd edildi. Yeni kod istəyin."
            };
        }

        const yeniHash =
            emailTesdiqKoduHashYarat(
                temizKod,
                tesdiq.duz
            );

        const saxlanmisBuffer =
            Buffer.from(
                String(
                    tesdiq.kod_hash || ""
                ),
                "hex"
            );

        const yeniBuffer =
            Buffer.from(
                yeniHash,
                "hex"
            );

        let kodDuzgundur =
            false;

        if (
            saxlanmisBuffer.length ===
                yeniBuffer.length &&
            saxlanmisBuffer.length > 0
        ) {
            kodDuzgundur =
                crypto.timingSafeEqual(
                    saxlanmisBuffer,
                    yeniBuffer
                );
        }

        if (!kodDuzgundur) {
            const cehdYenileme =
                await client.query(
                    `
                    UPDATE email_tesdiqleri
                    SET cehd_sayi = cehd_sayi + 1
                    WHERE hesab_id = $1
                    RETURNING cehd_sayi
                    `,
                    [
                        hesab.accountId
                    ]
                );

            const yeniCehdSayi =
                cehdYenileme.rows &&
                cehdYenileme.rows.length === 1
                    ? Math.max(
                        0,
                        Math.trunc(
                            Number(
                                cehdYenileme.rows[0].cehd_sayi
                            ) || 0
                        )
                    )
                    : cehdSayi + 1;

            await client.query("COMMIT");

            return {
                success: false,

                attemptsRemaining:
                    Math.max(
                        0,
                        EMAIL_TESDIQ_MAKSIMUM_CEHD -
                        yeniCehdSayi
                    ),

                message:
                    "Təsdiq kodu yanlışdır."
            };
        }

        await client.query(
            `
            UPDATE hesablar
            SET
                email_tesdiqlenib = TRUE,
                yenilenme_vaxti = NOW()
            WHERE hesab_id = $1
            `,
            [
                hesab.accountId
            ]
        );

        await client.query(
            `
            DELETE FROM email_tesdiqleri
            WHERE hesab_id = $1
            `,
            [
                hesab.accountId
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
            VALUES (
                $1,
                $2,
                'email_tesdiqlendi',
                $3::jsonb
            )
            `,
            [
                hesab.accountId,
                hesab.playerId,

                JSON.stringify({
                    email:
                        hesab.primaryEmail
                })
            ]
        );

        await client.query("COMMIT");

        hesab.emailVerified =
            true;

        console.log(
            "[HESAB_DB] E-poçt təsdiqləndi:",
            {
                accountId:
                    hesab.accountId,

                playerId:
                    hesab.playerId,

                email:
                    hesab.primaryEmail
            }
        );

        return {
            success: true,

            alreadyVerified: false,

            message:
                "E-poçt uğurla təsdiqləndi.",

            account:
                clientHesabMelumati(
                    hesab
                )
        };
    }
    catch (xeta) {
        try {
            await client.query("ROLLBACK");
        }
        catch {
        }

        throw xeta;
    }
    finally {
        client.release();
    }
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    emailNormallasdir,
    emailDuzgundur,

    sifreHashYarat,
    sifreDuzgundur,

    hesabEmailIleTap,
    hesabPlayerIdIleTap,

    hesabYaratVeBagla,
    clientHesabMelumati,

    emailTesdiqKoduHazirla,
    emailTesdiqKodunuYoxla
};
