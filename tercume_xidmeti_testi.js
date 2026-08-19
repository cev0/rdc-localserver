"use strict";

const assert = require("assert");
const { EventEmitter } = require("events");
const https = require("https");

const kohneRequest = https.request;
const kohneApiAcari = process.env.GOOGLE_TRANSLATE_API_KEY;

function requestSaxtasi({ statusCode = 200, body = "{}", onOptions }) {
    return function saxtaRequest(options, callback) {
        if (typeof onOptions === "function") onOptions(options);

        const req = new EventEmitter();
        let yazilanGovde = "";

        req.write = (hisse) => {
            yazilanGovde += String(hisse || "");
        };
        req.end = () => {
            const res = new EventEmitter();
            res.statusCode = statusCode;
            res.setEncoding = () => {};
            callback(res);
            process.nextTick(() => {
                if (body) res.emit("data", body);
                res.emit("end");
            });
        };
        req.destroy = (xeta) => {
            process.nextTick(() => req.emit("error", xeta));
        };
        req.setTimeout = () => {};
        req.__govdeAl = () => yazilanGovde;
        return req;
    };
}

async function xetaGozle(promise, kod) {
    let tutuldu = null;
    try {
        await promise;
    } catch (xeta) {
        tutuldu = xeta;
    }
    assert.ok(tutuldu, `Xəta gözlənilirdi: ${kod}`);
    assert.strictEqual(tutuldu.message, kod);
}

async function esas() {
    delete process.env.GOOGLE_TRANSLATE_API_KEY;
    const { metniTercumeEt } = require("./tercume_xidmeti");

    await xetaGozle(
        metniTercumeEt({ metn: "", hedefDil: "en" }),
        "TERCUME_METNI_BOSDUR"
    );
    await xetaGozle(
        metniTercumeEt({ metn: "Salam", hedefDil: "de" }),
        "DESTEKLENMEYEN_OYUN_DILI"
    );
    await xetaGozle(
        metniTercumeEt({ metn: "Salam", hedefDil: "en" }),
        "TERCUME_XIDMETI_QURULMAYIB"
    );

    process.env.GOOGLE_TRANSLATE_API_KEY = "test-api-key";

    let yoxlananOptions = null;
    https.request = requestSaxtasi({
        statusCode: 200,
        body: JSON.stringify({
            data: {
                translations: [
                    {
                        translatedText: "Hello",
                        detectedSourceLanguage: "az"
                    }
                ]
            }
        }),
        onOptions: (options) => {
            yoxlananOptions = options;
        }
    });

    const ugurlu = await metniTercumeEt({
        metn: "  Salam  ",
        hedefDil: "EN"
    });

    assert.deepStrictEqual(ugurlu, {
        tercumeMetni: "Hello",
        orijinalDil: "az",
        hedefDil: "en"
    });
    assert.ok(yoxlananOptions);
    assert.strictEqual(yoxlananOptions.hostname, "translation.googleapis.com");
    assert.strictEqual(yoxlananOptions.method, "POST");
    assert.ok(yoxlananOptions.path.includes("key=test-api-key"));

    https.request = requestSaxtasi({
        statusCode: 429,
        body: JSON.stringify({ error: { message: "quota" } })
    });
    await xetaGozle(
        metniTercumeEt({ metn: "Salam", hedefDil: "tr" }),
        "TERCUME_PROVIDER_XETASI"
    );

    https.request = requestSaxtasi({
        statusCode: 200,
        body: "json-deyil"
    });
    await xetaGozle(
        metniTercumeEt({ metn: "Salam", hedefDil: "ru" }),
        "TERCUME_CAVABI_JSON_DEYIL"
    );

    https.request = requestSaxtasi({
        statusCode: 200,
        body: JSON.stringify({ data: { translations: [] } })
    });
    await xetaGozle(
        metniTercumeEt({ metn: "Salam", hedefDil: "az" }),
        "TERCUME_CAVABI_BOSDUR"
    );

    console.log("[TERCUME_XIDMETI_TEST] OK");
}

esas()
    .catch((xeta) => {
        console.error("[TERCUME_XIDMETI_TEST] FAIL", xeta);
        process.exitCode = 1;
    })
    .finally(() => {
        https.request = kohneRequest;
        if (kohneApiAcari == null) delete process.env.GOOGLE_TRANSLATE_API_KEY;
        else process.env.GOOGLE_TRANSLATE_API_KEY = kohneApiAcari;
    });
