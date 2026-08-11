"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


// ============================================================
// HESAB YADDAŞI
// ------------------------------------------------------------
// Bu modul gameplay playerId ilə giriş hesabını ayrı saxlayır.
//
// playerId:
// - oyun progress-i
// - bina
// - resurs
// - missiya
// və s.
//
// accountId:
// - email
// - şifrə
// - gələcək Google / Apple login
// üçün istifadə olunur.
//
// Şifrə heç vaxt açıq mətn kimi saxlanmır.
// ============================================================

const HESABLAR_FAYLI =
    process.env.HESABLAR_FAYLI ||
    path.join(__dirname, "hesablar.json");


let hesablar = [];


// ============================================================
// EMAIL NORMALLAŞDIRMA
// ============================================================

function emailNormallasdir(email) {
    if (typeof email !== "string") {
        return "";
    }

    return email
        .trim()
        .toLowerCase();
}


// ============================================================
// EMAIL SADƏ YOXLAMA
// ============================================================

function emailDuzgundur(email) {
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
// ------------------------------------------------------------
// Node-un öz crypto.scrypt sistemi istifadə olunur.
// Plain-text şifrə diskə yazılmır.
// ============================================================

function sifreHashYarat(sifre) {
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
) {
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

    const saxlanmisHashHex =
        hisseler[1];

    let saxlanmisBuffer;

    try {
        saxlanmisBuffer =
            Buffer.from(
                saxlanmisHashHex,
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
// DİSKDƏN YÜKLƏ
// ============================================================

function hesablarYukle() {
    try {
        if (
            !fs.existsSync(
                HESABLAR_FAYLI
            )
        ) {
            hesablar = [];

            console.log(
                "[HESAB] hesablar.json hələ yoxdur."
            );

            return;
        }

        const xamMetn =
            fs.readFileSync(
                HESABLAR_FAYLI,
                "utf8"
            );

        if (!xamMetn.trim()) {
            hesablar = [];
            return;
        }

        const melumat =
            JSON.parse(xamMetn);

        if (!Array.isArray(melumat)) {
            throw new Error(
                "Hesab faylı array deyil."
            );
        }

        hesablar =
            melumat;

        console.log(
            `[HESAB] ${hesablar.length} hesab yükləndi.`
        );
    }
    catch (xeta) {
        console.error(
            "[HESAB] Hesablar yüklənmədi:",
            xeta
        );

        hesablar = [];
    }
}


// ============================================================
// DİSKƏ YAZ
// ------------------------------------------------------------
// Əvvəl temp fayla yazırıq, sonra rename edirik.
// Bu, yarımçıq JSON qalma riskini azaldır.
// ============================================================

function hesablarYaddaSaxla() {
    const tempFayl =
        HESABLAR_FAYLI + ".tmp";

    const json =
        JSON.stringify(
            hesablar,
            null,
            2
        );

    fs.writeFileSync(
        tempFayl,
        json,
        {
            encoding: "utf8",
            mode: 0o600
        }
    );

    fs.renameSync(
        tempFayl,
        HESABLAR_FAYLI
    );
}


// ============================================================
// EMAIL İLƏ HESAB TAP
// ============================================================

function hesabEmailIleTap(email) {
    const temizEmail =
        emailNormallasdir(email);

    if (!temizEmail) {
        return null;
    }

    return (
        hesablar.find(
            hesab =>
                emailNormallasdir(
                    hesab.primaryEmail
                ) === temizEmail
        ) ||
        null
    );
}


// ============================================================
// PLAYER ID İLƏ HESAB TAP
// ============================================================

function hesabPlayerIdIleTap(playerId) {
    if (
        typeof playerId !== "string" ||
        !playerId.trim()
    ) {
        return null;
    }

    return (
        hesablar.find(
            hesab =>
                hesab.playerId ===
                playerId
        ) ||
        null
    );
}


// ============================================================
// CLIENT-Ə GÖNDƏRİLƏ BİLƏN MƏLUMAT
// ------------------------------------------------------------
// passwordHash və pinHash client-ə HEÇ VAXT göndərilmir.
// ============================================================

function clientHesabMelumati(hesab) {
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

        providers:
            Array.isArray(
                hesab.providers
            )
                ? hesab.providers
                : [],

        createdAtMs:
            Number(
                hesab.createdAtMs || 0
            )
    };
}


// ============================================================
// MÖVCUD PLAYER-I EMAIL HESABINA BAĞLA
// ============================================================

function hesabYaratVeBagla(
    playerId,
    email,
    sifre
) {
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


    // --------------------------------------------------------
    // Eyni email başqa hesabda istifadə olunurmu?
    // --------------------------------------------------------

    const emailHesabi =
        hesabEmailIleTap(
            temizEmail
        );

    if (emailHesabi) {
        return {
            success: false,
            message:
                "Bu e-poçt ünvanı artıq istifadə olunur."
        };
    }


    // --------------------------------------------------------
    // Bu gameplay player artıq hesaba bağlanıbmı?
    // --------------------------------------------------------

    const movcudPlayerHesabi =
        hesabPlayerIdIleTap(
            playerId
        );

    if (movcudPlayerHesabi) {
        return {
            success: false,
            message:
                "Bu oyun hesabı artıq bağlanıb.",
            account:
                clientHesabMelumati(
                    movcudPlayerHesabi
                )
        };
    }


    const indi =
        Date.now();

    const yeniHesab = {
        accountId:
            crypto
                .randomBytes(16)
                .toString("hex"),

        playerId:
            playerId,

        primaryEmail:
            temizEmail,

        secondaryEmail:
            "",

        emailVerified:
            false,

        passwordHash:
            sifreHashYarat(
                sifre
            ),

        pinHash:
            "",

        providers: [
            "email"
        ],

        createdAtMs:
            indi,

        updatedAtMs:
            indi,

        deletionRequestedAtMs:
            0
    };


    hesablar.push(
        yeniHesab
    );

    hesablarYaddaSaxla();


    console.log(
        "[HESAB] Yeni hesab bağlandı:",
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


// Server başlayan kimi hesabları yüklə.
hesablarYukle();


module.exports = {
    emailNormallasdir,
    emailDuzgundur,
    sifreDuzgundur,

    hesabEmailIleTap,
    hesabPlayerIdIleTap,

    hesabYaratVeBagla,
    clientHesabMelumati
};
