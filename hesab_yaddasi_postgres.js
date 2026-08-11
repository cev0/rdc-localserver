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
    clientHesabMelumati
};