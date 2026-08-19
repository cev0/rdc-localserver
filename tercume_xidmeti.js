"use strict";

const https = require("https");
const { oyunDiliDesteklenir } = require("./oyun_dili_postgres");

const GOOGLE_HOST = "translation.googleapis.com";
const GOOGLE_PATH = "/language/translate/v2";
const SORGU_TIMEOUT_MS = 10000;

function metniTercumeEt({ metn, hedefDil }) {
    const temizMetn = String(metn || "").trim();
    const temizHedefDil = String(hedefDil || "").trim().toLowerCase();
    const apiAcari = String(process.env.GOOGLE_TRANSLATE_API_KEY || "").trim();

    if (!temizMetn) {
        return Promise.reject(new Error("TERCUME_METNI_BOSDUR"));
    }
    if (!oyunDiliDesteklenir(temizHedefDil)) {
        return Promise.reject(new Error("DESTEKLENMEYEN_OYUN_DILI"));
    }
    if (!apiAcari) {
        return Promise.reject(new Error("TERCUME_XIDMETI_QURULMAYIB"));
    }

    const govde = JSON.stringify({
        q: temizMetn,
        target: temizHedefDil,
        format: "text"
    });

    const secimler = {
        hostname: GOOGLE_HOST,
        port: 443,
        path: `${GOOGLE_PATH}?key=${encodeURIComponent(apiAcari)}`,
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(govde)
        },
        timeout: SORGU_TIMEOUT_MS
    };

    return new Promise((resolve, reject) => {
        const sorqu = https.request(secimler, (cavab) => {
            let xam = "";
            cavab.setEncoding("utf8");
            cavab.on("data", (hisse) => { xam += hisse; });
            cavab.on("end", () => {
                let json = null;
                try {
                    json = xam ? JSON.parse(xam) : null;
                } catch (_) {
                    return reject(new Error("TERCUME_CAVABI_JSON_DEYIL"));
                }

                if (!cavab.statusCode || cavab.statusCode < 200 || cavab.statusCode >= 300) {
                    const providerMesaji = json && json.error && json.error.message
                        ? String(json.error.message).slice(0, 300)
                        : "Naməlum provider xətası";
                    console.error("[TERCUME] Google cavab xətası:", cavab.statusCode, providerMesaji);
                    return reject(new Error("TERCUME_PROVIDER_XETASI"));
                }

                const ilk = json && json.data && Array.isArray(json.data.translations)
                    ? json.data.translations[0]
                    : null;
                if (!ilk || typeof ilk.translatedText !== "string") {
                    return reject(new Error("TERCUME_CAVABI_BOSDUR"));
                }

                resolve({
                    tercumeMetni: ilk.translatedText,
                    orijinalDil: ilk.detectedSourceLanguage
                        ? String(ilk.detectedSourceLanguage).toLowerCase()
                        : null,
                    hedefDil: temizHedefDil
                });
            });
        });

        sorqu.on("timeout", () => {
            sorqu.destroy(new Error("TERCUME_TIMEOUT"));
        });
        sorqu.on("error", (xeta) => {
            reject(xeta && xeta.message ? xeta : new Error("TERCUME_SEBEKE_XETASI"));
        });

        sorqu.write(govde);
        sorqu.end();
    });
}

module.exports = {
    metniTercumeEt
};
