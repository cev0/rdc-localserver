"use strict";

const crypto = require("crypto");
const WebSocket = require("ws");

const TEST_ID = crypto.randomBytes(8).toString("hex");
const TEST_EMAIL = `olmayan_${TEST_ID}@example.test`;

function websocketUrlAl() {
    const manual = String(process.env.TEST_WS_URL || "").trim();
    if (manual) return manual;

    const publicDomain = String(process.env.KOYEB_PUBLIC_DOMAIN || "").trim();
    if (publicDomain) {
        const temiz = publicDomain
            .replace(/^https?:\/\//i, "")
            .replace(/^wss?:\/\//i, "")
            .replace(/\/$/, "");

        return `wss://${temiz}`;
    }

    const port = Number(process.env.PORT || 8000);
    return `ws://127.0.0.1:${port}`;
}

function acilmaniGozle(ws, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            temizle();
            reject(new Error("WebSocket vaxtında açılmadı."));
        }, timeoutMs);

        function temizle() {
            clearTimeout(timer);
            ws.off("open", acildi);
            ws.off("error", xeta);
        }

        function acildi() {
            temizle();
            resolve();
        }

        function xeta(err) {
            temizle();
            reject(err);
        }

        ws.on("open", acildi);
        ws.on("error", xeta);
    });
}

function mesajGozle(ws, tip, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            temizle();
            reject(new Error(`${tip} cavabı vaxtında gəlmədi.`));
        }, timeoutMs);

        function temizle() {
            clearTimeout(timer);
            ws.off("message", mesaj);
            ws.off("error", xeta);
        }

        function xeta(err) {
            temizle();
            reject(err);
        }

        function mesaj(data) {
            let obyekt;

            try {
                obyekt = JSON.parse(data.toString());
            }
            catch {
                return;
            }

            if (obyekt && obyekt.type === tip) {
                temizle();
                resolve(obyekt);
            }
        }

        ws.on("message", mesaj);
        ws.on("error", xeta);
    });
}

async function testiBaslat() {
    let ws = null;

    console.log("[SIFRE_RESET_SERVER_TEST] Test başlayır...");
    console.log("[SIFRE_RESET_SERVER_TEST] WebSocket:", websocketUrlAl());

    try {
        ws = new WebSocket(websocketUrlAl());
        await acilmaniGozle(ws);

        console.log("[SIFRE_RESET_SERVER_TEST] WebSocket bağlantısı uğurludur.");

        // 1. Mövcud olmayan email üçün server hesabın olub-olmadığını açıqlamamalıdır.
        const sendPromise = mesajGozle(
            ws,
            "account_password_reset_send_result"
        );

        ws.send(JSON.stringify({
            type: "account_password_reset_send_request",
            email: TEST_EMAIL
        }));

        const sendNetice = await sendPromise;

        if (sendNetice.success !== true) {
            throw new Error(
                `Reset send handler uğursuzdur: ${JSON.stringify(sendNetice)}`
            );
        }

        console.log(
            "[SIFRE_RESET_SERVER_TEST] Reset send handler və privacy cavabı düzgündür."
        );

        // 2. Mövcud olmayan email + kod qəbul edilməməlidir.
        const verifyPromise = mesajGozle(
            ws,
            "account_password_reset_verify_result"
        );

        ws.send(JSON.stringify({
            type: "account_password_reset_verify_request",
            email: TEST_EMAIL,
            kod: "123456"
        }));

        const verifyNetice = await verifyPromise;

        if (verifyNetice.success !== false) {
            throw new Error(
                `Mövcud olmayan reset kodu qəbul edildi: ${JSON.stringify(verifyNetice)}`
            );
        }

        console.log(
            "[SIFRE_RESET_SERVER_TEST] Reset verify handler səhv kodu düzgün rədd etdi."
        );

        // 3. Saxta reset token ilə yeni şifrə təyin olunmamalıdır.
        const completePromise = mesajGozle(
            ws,
            "account_password_reset_complete_result"
        );

        ws.send(JSON.stringify({
            type: "account_password_reset_complete_request",
            resetToken: crypto.randomBytes(48).toString("base64url"),
            yeniSifre: "YeniTestSifre_12345"
        }));

        const completeNetice = await completePromise;

        if (completeNetice.success !== false) {
            throw new Error(
                `Saxta reset token qəbul edildi: ${JSON.stringify(completeNetice)}`
            );
        }

        console.log(
            "[SIFRE_RESET_SERVER_TEST] Reset complete handler saxta token-i düzgün rədd etdi."
        );

        console.log(
            "[SIFRE_RESET_SERVER_TEST] Bütün WebSocket şifrə reset smoke testləri uğurla tamamlandı."
        );
    }
    catch (xeta) {
        console.error("[SIFRE_RESET_SERVER_TEST] Test uğursuz oldu:", xeta);
        process.exitCode = 1;
    }
    finally {
        if (ws) {
            try {
                ws.close();
            }
            catch {
            }
        }
    }
}

testiBaslat();
