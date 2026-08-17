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
// EMAIL TƏSDİQ KONFİQURASİYASI
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

function emailTesdiqKoduRandomYarat() {
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
// KOD HASH
// ------------------------------------------------------------
// Kod özü hesablar.json daxilində saxlanmır.
// ============================================================

function emailTesdiqKoduHashYarat(
    kod,
    duz
) {
    return crypto
        .scryptSync(
            String(kod),
            String(duz),
            32
        )
        .toString("hex");
}


// ============================================================
// YENİ TƏSDİQ KODU HAZIRLA
// ============================================================

function emailTesdiqKoduHazirla(
    playerId
) {
    const hesab =
        hesabPlayerIdIleTap(
            playerId
        );


    if (!hesab) {
        return {
            success: false,
            message:
                "Bağlanmış hesab tapılmadı."
        };
    }


    if (hesab.emailVerified === true) {
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


    const indi =
        Date.now();


    // --------------------------------------------------------
    // SPAM / TƏKRAR GÖNDƏRMƏ BLOKU
    // --------------------------------------------------------

    const sonGonderilme =
        Number(
            hesab
                .emailVerification
                ?.lastSentAtMs || 0
        );


    if (
        sonGonderilme > 0 &&
        indi - sonGonderilme <
            EMAIL_TESDIQ_YENIDEN_GONDERME_MS
    ) {
        const qalanMs =
            EMAIL_TESDIQ_YENIDEN_GONDERME_MS -
            (
                indi -
                sonGonderilme
            );

        return {
            success: false,

            message:
                "Yeni kod göndərmək üçün bir qədər gözləyin.",

            retryAfterSeconds:
                Math.max(
                    1,
                    Math.ceil(
                        qalanMs / 1000
                    )
                )
        };
    }


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


    hesab.emailVerification = {
        codeHash:
            kodHash,

        salt:
            duz,

        expiresAtMs:
            bitmeVaxti,

        attempts:
            0,

        lastSentAtMs:
            indi
    };


    hesab.updatedAtMs =
        indi;


    hesablarYaddaSaxla();


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


// ============================================================
// EMAIL TƏSDİQ KODUNU YOXLAMA
// ============================================================

function emailTesdiqKodunuYoxla(
    playerId,
    kod
) {
    const hesab =
        hesabPlayerIdIleTap(
            playerId
        );


    if (!hesab) {
        return {
            success: false,

            message:
                "Hesab tapılmadı."
        };
    }


    if (hesab.emailVerified === true) {
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


    const tesdiq =
        hesab.emailVerification;


    if (
        !tesdiq ||
        typeof tesdiq !== "object"
    ) {
        return {
            success: false,

            message:
                "Aktiv təsdiq kodu yoxdur. Yeni kod istəyin."
        };
    }


    const indi =
        Date.now();


    if (
        indi >
        Number(
            tesdiq.expiresAtMs || 0
        )
    ) {
        delete hesab.emailVerification;

        hesab.updatedAtMs =
            indi;

        hesablarYaddaSaxla();


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
                    tesdiq.attempts
                ) || 0
            )
        );


    if (
        cehdSayi >=
        EMAIL_TESDIQ_MAKSIMUM_CEHD
    ) {
        return {
            success: false,

            tooManyAttempts: true,

            message:
                "Çox sayda səhv cəhd edildi. Yeni kod istəyin."
        };
    }


    let yeniHash;

    try {
        yeniHash =
            emailTesdiqKoduHashYarat(
                temizKod,
                tesdiq.salt
            );
    }
    catch {
        return {
            success: false,

            message:
                "Təsdiq kodu yoxlanıla bilmədi."
        };
    }


    const saxlanmisBuffer =
        Buffer.from(
            String(
                tesdiq.codeHash || ""
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
        tesdiq.attempts =
            cehdSayi + 1;

        hesab.updatedAtMs =
            indi;

        hesablarYaddaSaxla();


        return {
            success: false,

            attemptsRemaining:
                Math.max(
                    0,
                    EMAIL_TESDIQ_MAKSIMUM_CEHD -
                    tesdiq.attempts
                ),

            message:
                "Təsdiq kodu yanlışdır."
        };
    }


    // ========================================================
    // UĞURLU TƏSDİQ
    // ========================================================

    hesab.emailVerified =
        true;

    hesab.updatedAtMs =
        indi;

    delete hesab.emailVerification;


    hesablarYaddaSaxla();


    console.log(
        "[HESAB] E-poçt təsdiqləndi:",
        {
            playerId:
                hesab.playerId
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
                yeniHesab.playerId
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
    clientHesabMelumati,

    emailTesdiqKoduHazirla,
    emailTesdiqKodunuYoxla
};
