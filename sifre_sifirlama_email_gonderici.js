"use strict";

const RESEND_API_KEY = String(
    process.env.RESEND_API_KEY || ""
).trim();

const EMAIL_FROM = String(
    process.env.EMAIL_FROM || ""
).trim();

const EMAIL_DEV_LOG_CODE = String(
    process.env.EMAIL_DEV_LOG_CODE || ""
)
    .trim()
    .toLowerCase() === "true";

function htmlTemizle(deyer) {
    return String(deyer || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function sifreSifirlamaKoduEmailiGonder(email, kod) {
    const temizEmail = String(email || "").trim();
    const temizKod = String(kod || "").trim();

    if (!temizEmail) {
        return {
            success: false,
            message: "E-poçt ünvanı boşdur."
        };
    }

    if (!/^\d{6}$/.test(temizKod)) {
        return {
            success: false,
            message: "Şifrə sıfırlama kodu düzgün deyil."
        };
    }

    if (EMAIL_DEV_LOG_CODE) {
        console.log("[EMAIL_DEV] Şifrə sıfırlama kodu:", {
            email: temizEmail,
            kod: temizKod
        });

        return {
            success: true,
            message: "DEV rejimi: kod server loguna yazıldı.",
            emailId: "dev-test"
        };
    }

    if (!RESEND_API_KEY) {
        return {
            success: false,
            message: "RESEND_API_KEY təyin edilməyib."
        };
    }

    if (!EMAIL_FROM) {
        return {
            success: false,
            message: "EMAIL_FROM təyin edilməyib."
        };
    }

    const html = `
        <div style="font-family:Arial,sans-serif;background:#11140f;color:#ffffff;padding:32px;">
            <h2 style="margin:0 0 20px 0;color:#d8aa56;">
                Şifrə sıfırlama
            </h2>

            <p>
                Oyun hesabınız üçün yeni şifrə təyin etmək üçün aşağıdakı kodu daxil edin:
            </p>

            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;margin:28px 0;color:#ffffff;">
                ${htmlTemizle(temizKod)}
            </div>

            <p style="color:#b9b9b9;">
                Bu kod 10 dəqiqə ərzində etibarlıdır.
            </p>

            <p style="color:#777777;font-size:12px;margin-top:30px;">
                Əgər şifrə sıfırlama sorğusunu siz etməmisinizsə, bu məktubu nəzərə almayın.
            </p>
        </div>
    `;

    try {
        const cavab = await fetch(
            "https://api.resend.com/emails",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + RESEND_API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: EMAIL_FROM,
                    to: [temizEmail],
                    subject: "Şifrə sıfırlama kodu",
                    html
                }),
                signal: AbortSignal.timeout(10000)
            }
        );

        const xamCavab = await cavab.text();
        let json = null;

        try {
            json = xamCavab ? JSON.parse(xamCavab) : null;
        }
        catch {
            json = null;
        }

        if (cavab.ok) {
            return {
                success: true,
                message: "Şifrə sıfırlama kodu e-poçta göndərildi.",
                emailId: json && json.id ? json.id : ""
            };
        }

        console.error("[SIFRE_EMAIL] Resend xətası:", {
            statusCode: cavab.status,
            body: xamCavab
        });

        return {
            success: false,
            message: "E-poçt xidməti şifrə sıfırlama məktubunu göndərə bilmədi."
        };
    }
    catch (xeta) {
        console.error("[SIFRE_EMAIL] Göndərmə xətası:", xeta);

        return {
            success: false,
            message: "E-poçt xidmətinə qoşulmaq mümkün olmadı."
        };
    }
}

module.exports = {
    sifreSifirlamaKoduEmailiGonder
};
