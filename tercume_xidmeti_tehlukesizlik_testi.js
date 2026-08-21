"use strict";

const assert = require("assert");
const https = require("https");
const { EventEmitter } = require("events");
const {
    metniTercumeEt,
    MAKSIMUM_PROVIDER_CAVAB_BAYT
} = require("./tercume_xidmeti");

const originalRequest = https.request;
const originalApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

function mockRequestYarat(cavabHazirlayan, secimleriYoxla) {
    https.request = (secimler, callback) => {
        if (typeof secimleriYoxla === "function") {
            secimleriYoxla(secimler);
        }

        const sorqu = new EventEmitter();
        sorqu.write = () => {};
        sorqu.end = () => {
            process.nextTick(() => {
                const cavab = new EventEmitter();
                cavab.statusCode = 200;
                cavab.setEncoding = () => {};
                cavab.destroy = () => {};
                callback(cavab);
                cavabHazirlayan(cavab);
            });
        };
        sorqu.destroy = xeta => {
            process.nextTick(() => sorqu.emit("error", xeta));
        };
        return sorqu;
    };
}

async function apiAcariUrlDeDeyilTesti() {
    process.env.GOOGLE_TRANSLATE_API_KEY = "test-secret-key";

    mockRequestYarat(
        cavab => {
            cavab.emit("data", JSON.stringify({
                data: {
                    translations: [{
                        translatedText: "Hello",
                        detectedSourceLanguage: "az"
                    }]
                }
            }));
            cavab.emit("end");
        },
        secimler => {
            assert.strictEqual(secimler.path, "/language/translate/v2");
            assert.ok(!String(secimler.path).includes("test-secret-key"));
            assert.strictEqual(secimler.headers["X-Goog-Api-Key"], "test-secret-key");
        }
    );

    const netice = await metniTercumeEt({
        metn: "Salam",
        hedefDil: "en"
    });

    assert.strictEqual(netice.tercumeMetni, "Hello");
    assert.strictEqual(netice.orijinalDil, "az");
}

async function uzunMenbeMetniBloklanirTesti() {
    process.env.GOOGLE_TRANSLATE_API_KEY = "test-secret-key";

    let requestCagirildi = false;
    https.request = () => {
        requestCagirildi = true;
        throw new Error("request çağırılmamalıdır");
    };

    await assert.rejects(
        () => metniTercumeEt({
            metn: "a".repeat(501),
            hedefDil: "en"
        }),
        /TERCUME_METNI_COX_UZUNDUR/
    );

    assert.strictEqual(requestCagirildi, false);
}

async function boyukProviderCavabiBloklanirTesti() {
    process.env.GOOGLE_TRANSLATE_API_KEY = "test-secret-key";

    mockRequestYarat(cavab => {
        cavab.emit("data", "x".repeat(MAKSIMUM_PROVIDER_CAVAB_BAYT + 1));
        cavab.emit("end");
    });

    await assert.rejects(
        () => metniTercumeEt({
            metn: "Salam",
            hedefDil: "en"
        }),
        /TERCUME_CAVABI_COX_BOYUKDUR/
    );
}

async function run() {
    try {
        await apiAcariUrlDeDeyilTesti();
        await uzunMenbeMetniBloklanirTesti();
        await boyukProviderCavabiBloklanirTesti();
        console.log("[TERCUME_TEST] Təhlükəsizlik testləri uğurla keçdi.");
    }
    finally {
        https.request = originalRequest;

        if (originalApiKey === undefined) {
            delete process.env.GOOGLE_TRANSLATE_API_KEY;
        }
        else {
            process.env.GOOGLE_TRANSLATE_API_KEY = originalApiKey;
        }
    }
}

run().catch(xeta => {
    console.error("[TERCUME_TEST] Uğursuz:", xeta);
    process.exitCode = 1;
});
