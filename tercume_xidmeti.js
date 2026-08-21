"use strict";

const https = require("https");
const { oyunDiliDesteklenir } = require("./oyun_dili_postgres");

const GOOGLE_HOST = "translation.googleapis.com";
const GOOGLE_PATH = "/language/translate/v2";
const SORGU_TIMEOUT_MS = 10000;
const MAKSIMUM_MENBE_UZUNLUQ = 500;
const MAKSIMUM_PROVIDER_CAVAB_BAYT = 256 * 1024;
const MAKSIMUM_TERCUME_UZUNLUQ = 4000;
const MAKSIMUM_API_ACARI_UZUNLUQ = 512;

function xeta(kod) {
    return Promise.reject(new Error(kod));
}

function metniTercumeEt({ metn, hedefDil }) {
    const temizMetn = String(metn || "").trim();
    const temizHedefDil = String(hedefDil || "").trim().toLowerCase();
    const apiAcari = String(process.env.GOOGLE_TRANSLATE_API_KEY || "").trim();

    if (!temizMetn) {
        return xeta("TERCUME_METNI_BOSDUR");
    }
    if (temizMetn.length > MAKSIMUM_MENBE_UZUNLUQ) {
        return xeta("TERCUME_METNI_COX_UZUNDUR");
    }
    if (!oyunDiliDesteklenir(temizHedefDil)) {
        return xeta("DESTEKLENMEYEN_OYUN_DILI");
    }
    if (!apiAcari) {
        return xeta("TERCUME_XIDMETI_QURULMAYIB");
    }
    if (apiAcari.length > MAKSIMUM_API_ACARI_UZUNLUQ || /[\r\n]/.test(apiAcari)) {
        return xeta("TERCUME_API_ACARI_SEHVDIR");
    }

    const govde = JSON.stringify({
        q: temizMetn,
        target: temizHedefDil,
        format: "text"
    });

    const secimler = {
        hostname: GOOGLE_HOST,
        port: 443,
        path: GOOGLE_PATH,
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(govde),
            // Açar URL query-sində saxlanmır ki reverse-proxy/access log-lara düşməsin.
            "X-Goog-Api-Key": apiAcari
        },
        timeout: SORGU_TIMEOUT_MS
    };

    return new Promise((resolve, reject) => {
        let tamamlandi = false;

        function bitir(callback, deyer) {
            if (tamamlandi) return;
            tamamlandi = true;
            callback(deyer);
        }

        const sorqu = https.request(secimler, (cavab) => {
            let xam = "";
            let qebulEdilenBayt = 0;

            cavab.setEncoding("utf8");
            cavab.on("data", (hisse) => {
                if (tamamlandi) return;

                qebulEdilenBayt += Buffer.byteLength(hisse, "utf8");
                if (qebulEdilenBayt > MAKSIMUM_PROVIDER_CAVAB_BAYT) {
                    if (typeof cavab.destroy === "function") {
                        cavab.destroy();
                    }
                    bitir(reject, new Error("TERCUME_CAVABI_COX_BOYUKDUR"));
                    return;
                }

                xam += hisse;
            });

            cavab.on("end", () => {
                if (tamamlandi) return;

                let json = null;
                try {
                    json = xam ? JSON.parse(xam) : null;
                }
                catch (_) {
                    bitir(reject, new Error("TERCUME_CAVABI_JSON_DEYIL"));
                    return;
                }

                if (!cavab.statusCode || cavab.statusCode < 200 || cavab.statusCode >= 300) {
                    const providerMesaji = json && json.error && json.error.message
                        ? String(json.error.message).slice(0, 300)
                        : "Naməlum provider xətası";
                    console.error("[TERCUME] Google cavab xətası:", cavab.statusCode, providerMesaji);
                    bitir(reject, new Error("TERCUME_PROVIDER_XETASI"));
                    return;
                }

                const ilk = json && json.data && Array.isArray(json.data.translations)
                    ? json.data.translations[0]
                    : null;

                if (!ilk || typeof ilk.translatedText !== "string") {
                    bitir(reject, new Error("TERCUME_CAVABI_BOSDUR"));
                    return;
                }

                const tercumeMetni = ilk.translatedText.trim();
                if (!tercumeMetni) {
                    bitir(reject, new Error("TERCUME_CAVABI_BOSDUR"));
                    return;
                }
                if (tercumeMetni.length > MAKSIMUM_TERCUME_UZUNLUQ) {
                    bitir(reject, new Error("TERCUME_CAVABI_COX_UZUNDUR"));
                    return;
                }

                const xamDil = ilk.detectedSourceLanguage
                    ? String(ilk.detectedSourceLanguage).trim().toLowerCase()
                    : "";
                const orijinalDil = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(xamDil)
                    ? xamDil
                    : null;

                bitir(resolve, {
                    tercumeMetni,
                    orijinalDil,
                    hedefDil: temizHedefDil
                });
            });
        });

        sorqu.on("timeout", () => {
            sorqu.destroy(new Error("TERCUME_TIMEOUT"));
        });

        sorqu.on("error", (xetaObyekti) => {
            const netice = xetaObyekti && xetaObyekti.message
                ? xetaObyekti
                : new Error("TERCUME_SEBEKE_XETASI");
            bitir(reject, netice);
        });

        sorqu.write(govde);
        sorqu.end();
    });
}

module.exports = {
    metniTercumeEt,
    MAKSIMUM_MENBE_UZUNLUQ,
    MAKSIMUM_PROVIDER_CAVAB_BAYT,
    MAKSIMUM_TERCUME_UZUNLUQ
};
