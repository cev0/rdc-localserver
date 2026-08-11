"use strict";

const {
    sifreSifirlamaKodunuHazirla,
    sifreSifirlamaSorqusunuLegvEt,
    sifreSifirlamaKodunuYoxla,
    yeniSifreTeyinEt
} = require("./sifre_sifirlama_postgres");

const {
    sifreSifirlamaKoduEmailiGonder
} = require("./sifre_sifirlama_email_gonderici");

function metnAl(deyer) {
    return typeof deyer === "string" ? deyer.trim() : "";
}

async function sifreSifirlamaMesajiniEmalEt(kontekst) {
    const {
        type,
        msg,
        ws,
        send,
        nowMs
    } = kontekst;

    if (type === "account_password_reset_send_request") {
        const email = metnAl(msg.email);

        let netice;

        try {
            netice = await sifreSifirlamaKodunuHazirla(email);
        }
        catch (xeta) {
            console.error("[SIFRE_SIFIRLAMA] Sorğu xətası:", xeta);

            send(ws, {
                type: "account_password_reset_send_result",
                success: false,
                message: "Şifrə sıfırlama sorğusu zamanı server xətası baş verdi.",
                serverTimeUnixMs: nowMs()
            });

            return true;
        }

        if (!netice || netice.success !== true) {
            send(ws, {
                type: "account_password_reset_send_result",
                success: false,
                message: netice && netice.message
                    ? netice.message
                    : "Şifrə sıfırlama sorğusu yaradıla bilmədi.",
                serverTimeUnixMs: nowMs()
            });

            return true;
        }

        if (
            netice.emailGonderilmeli === true &&
            netice.email &&
            netice.kod
        ) {
            const emailNeticesi =
                await sifreSifirlamaKoduEmailiGonder(
                    netice.email,
                    netice.kod
                );

            if (!emailNeticesi || emailNeticesi.success !== true) {
                try {
                    await sifreSifirlamaSorqusunuLegvEt(
                        netice.sorquId
                    );
                }
                catch {
                }

                send(ws, {
                    type: "account_password_reset_send_result",
                    success: false,
                    message: emailNeticesi && emailNeticesi.message
                        ? emailNeticesi.message
                        : "Təsdiq kodu e-poçta göndərilə bilmədi.",
                    serverTimeUnixMs: nowMs()
                });

                return true;
            }
        }

        send(ws, {
            type: "account_password_reset_send_result",
            success: true,
            cooldown: netice.cooldown === true,
            retryAfterSeconds: Math.ceil(
                Number(netice.retryAfterMs || 0) / 1000
            ),
            message: netice.message ||
                "Əgər bu e-poçt ünvanı hesabla bağlıdırsa, təsdiq kodu göndəriləcək.",
            serverTimeUnixMs: nowMs()
        });

        return true;
    }

    if (type === "account_password_reset_verify_request") {
        const email = metnAl(msg.email);
        const kod = metnAl(msg.kod);

        let netice;

        try {
            netice = await sifreSifirlamaKodunuYoxla(
                email,
                kod
            );
        }
        catch (xeta) {
            console.error("[SIFRE_SIFIRLAMA] Kod yoxlama xətası:", xeta);

            send(ws, {
                type: "account_password_reset_verify_result",
                success: false,
                message: "Təsdiq kodu yoxlanarkən server xətası baş verdi.",
                serverTimeUnixMs: nowMs()
            });

            return true;
        }

        send(ws, {
            type: "account_password_reset_verify_result",
            success: netice && netice.success === true,
            resetToken:
                netice && netice.success === true
                    ? netice.resetToken || ""
                    : "",
            expiresAtMs:
                netice && netice.success === true
                    ? Number(netice.expiresAtMs || 0)
                    : 0,
            attemptsRemaining:
                netice
                    ? Number(netice.attemptsRemaining || 0)
                    : 0,
            expired: netice && netice.expired === true,
            tooManyAttempts:
                netice && netice.tooManyAttempts === true,
            message:
                netice && netice.message
                    ? netice.message
                    : "Təsdiq kodu yoxlanmadı.",
            serverTimeUnixMs: nowMs()
        });

        return true;
    }

    if (type === "account_password_reset_complete_request") {
        const resetToken = metnAl(msg.resetToken);
        const yeniSifre =
            typeof msg.yeniSifre === "string"
                ? msg.yeniSifre
                : "";

        let netice;

        try {
            netice = await yeniSifreTeyinEt(
                resetToken,
                yeniSifre
            );
        }
        catch (xeta) {
            console.error("[SIFRE_SIFIRLAMA] Yeni şifrə xətası:", xeta);

            send(ws, {
                type: "account_password_reset_complete_result",
                success: false,
                message: "Yeni şifrə təyin edilərkən server xətası baş verdi.",
                serverTimeUnixMs: nowMs()
            });

            return true;
        }

        send(ws, {
            type: "account_password_reset_complete_result",
            success: netice && netice.success === true,
            message:
                netice && netice.message
                    ? netice.message
                    : "Yeni şifrə təyin edilə bilmədi.",
            serverTimeUnixMs: nowMs()
        });

        return true;
    }

    return false;
}

module.exports = {
    sifreSifirlamaMesajiniEmalEt
};
