"use strict";

const {
    tesdiqKoduEmailiGonder
} = require("./email_gonderici");

async function testiBaslat() {
    const email = String(process.argv[2] || "").trim();

    if (!email) {
        console.error("[EMAIL_TEST] İstifadə: npm run email:test -- email@example.com");
        process.exitCode = 1;
        return;
    }

    const apiKeyVar = Boolean(String(process.env.RESEND_API_KEY || "").trim());
    const emailFrom = String(process.env.EMAIL_FROM || "").trim();
    const devLog = String(process.env.EMAIL_DEV_LOG_CODE || "")
        .trim()
        .toLowerCase() === "true";

    console.log("[EMAIL_TEST] Konfiqurasiya:", {
        resendApiKeyVar: apiKeyVar,
        emailFrom: emailFrom || "TƏYİN EDİLMƏYİB",
        emailDevLogCode: devLog,
        hedefEmail: email
    });

    try {
        const netice = await tesdiqKoduEmailiGonder(
            email,
            "123456"
        );

        console.log("[EMAIL_TEST] Nəticə:", netice);

        if (!netice || netice.success !== true) {
            process.exitCode = 1;
            return;
        }

        console.log("[EMAIL_TEST] Test uğurludur.");
    }
    catch (xeta) {
        console.error("[EMAIL_TEST] Gözlənilməz xəta:", xeta);
        process.exitCode = 1;
    }
}

testiBaslat();
