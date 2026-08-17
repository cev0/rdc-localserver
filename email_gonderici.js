"use strict";

const https = require("https");


// ============================================================
// EMAIL KONFİQURASİYASI
// ============================================================

const RESEND_API_KEY =
    String(
        process.env.RESEND_API_KEY || ""
    ).trim();

const EMAIL_FROM =
    String(
        process.env.EMAIL_FROM || ""
    ).trim();

const EMAIL_DEV_LOG_CODE =
    String(process.env.NODE_ENV || "")
        .trim()
        .toLowerCase() !== "production" &&
    String(process.env.EMAIL_DEV_LOG_CODE || "")
        .trim()
        .toLowerCase() === "true";


// ============================================================
// HTML TƏMİZLƏMƏ
// ============================================================

function htmlTemizle(deyer) {
    return String(deyer || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// RESEND API
// ============================================================

function resendSorqusuGonder(payload) {
    return new Promise((resolve) => {
        if (!RESEND_API_KEY) {
            resolve({
                success: false,
                message:
                    "RESEND_API_KEY təyin edilməyib."
            });

            return;
        }

        if (!EMAIL_FROM) {
            resolve({
                success: false,
                message:
                    "EMAIL_FROM təyin edilməyib."
            });

            return;
        }

        const xamData =
            JSON.stringify(payload);

        const sorqu =
            https.request(
                {
                    hostname:
                        "api.resend.com",

                    port:
                        443,

                    path:
                        "/emails",

                    method:
                        "POST",

                    headers: {
                        "Authorization":
                            "Bearer " +
                            RESEND_API_KEY,

                        "Content-Type":
                            "application/json",

                        "Content-Length":
                            Buffer.byteLength(
                                xamData
                            )
                    }
                },

                (cavab) => {
                    let xamCavab = "";

                    cavab.on(
                        "data",
                        (hisse) => {
                            xamCavab +=
                                hisse.toString();
                        }
                    );

                    cavab.on(
                        "end",
                        () => {
                            let json = null;

                            try {
                                json =
                                    xamCavab
                                        ? JSON.parse(
                                            xamCavab
                                        )
                                        : null;
                            }
                            catch {
                                json = null;
                            }


                            if (
                                cavab.statusCode >= 200 &&
                                cavab.statusCode < 300
                            ) {
                                resolve({
                                    success: true,

                                    message:
                                        "E-poçt göndərildi.",

                                    emailId:
                                        json &&
                                        json.id
                                            ? json.id
                                            : ""
                                });

                                return;
                            }


                            console.error(
                                "[EMAIL] Resend xətası:",
                                {
                                    statusCode:
                                        cavab.statusCode,

                                    body:
                                        xamCavab
                                }
                            );


                            resolve({
                                success: false,

                                message:
                                    "E-poçt xidməti məktubu göndərə bilmədi."
                            });
                        }
                    );
                }
            );


        sorqu.on(
            "error",
            (xeta) => {
                console.error(
                    "[EMAIL] Şəbəkə xətası:",
                    xeta
                );

                resolve({
                    success: false,

                    message:
                        "E-poçt xidmətinə qoşulmaq mümkün olmadı."
                });
            }
        );


        sorqu.write(
            xamData
        );

        sorqu.end();
    });
}


// ============================================================
// TƏSDİQ KODU EMAILİ
// ============================================================

async function tesdiqKoduEmailiGonder(
    email,
    kod
) {
    const temizEmail =
        String(email || "")
            .trim();

    const temizKod =
        String(kod || "")
            .trim();


    if (!temizEmail) {
        return {
            success: false,
            message:
                "E-poçt ünvanı boşdur."
        };
    }


    if (!/^\d{6}$/.test(temizKod)) {
        return {
            success: false,
            message:
                "Təsdiq kodu düzgün deyil."
        };
    }


    // ========================================================
    // DEV TEST
    // ========================================================
    // Production-da EMAIL_DEV_LOG_CODE=false olmalıdır.
    // ========================================================

if (EMAIL_DEV_LOG_CODE) {
    console.log(
        "[EMAIL_DEV] Təsdiq kodu:",
        {
            kod:
                temizKod
        }
    );

    // DEV rejimində real email göndərmirik.
    // Server kodu Console-da göstərir və uğurlu sayır.
    return {
        success: true,
        message:
            "DEV rejimi: təsdiq kodu server loguna yazıldı.",
        emailId:
            "dev-test"
    };
}


    const html = `
        <div style="
            font-family:Arial,sans-serif;
            background:#11140f;
            color:#ffffff;
            padding:32px;
        ">
            <h2 style="
                margin:0 0 20px 0;
                color:#d8aa56;
            ">
                Hesab təsdiqi
            </h2>

            <p>
                Oyun hesabınızı təsdiqləmək
                üçün aşağıdakı kodu daxil edin:
            </p>

            <div style="
                font-size:36px;
                font-weight:bold;
                letter-spacing:8px;
                margin:28px 0;
                color:#ffffff;
            ">
                ${htmlTemizle(temizKod)}
            </div>

            <p style="
                color:#b9b9b9;
            ">
                Bu kod 10 dəqiqə ərzində
                etibarlıdır.
            </p>

            <p style="
                color:#777777;
                font-size:12px;
                margin-top:30px;
            ">
                Əgər bu sorğunu siz
                etməmisinizsə, məktubu
                nəzərə almayın.
            </p>
        </div>
    `;


    return await resendSorqusuGonder(
        {
            from:
                EMAIL_FROM,

            to: [
                temizEmail
            ],

            subject:
                "Hesab təsdiq kodu",

            html:
                html
        }
    );
}


module.exports = {
    tesdiqKoduEmailiGonder
};
