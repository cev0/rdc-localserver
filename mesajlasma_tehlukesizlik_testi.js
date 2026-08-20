"use strict";

const assert = require("assert");
const {
    mesajlasmaMesajiniEmalEt
} = require("./mesajlasma_handler");

async function identityMismatchTesti() {
    const cavablar = [];

    const emalOlundu = await mesajlasmaMesajiniEmalEt({
        ws: {
            _authedPlayerId: "player-real"
        },
        msg: {
            type: "sexsi_oxunmamis_say_request",
            playerId: "player-saxta"
        },
        send: (_ws, cavab) => cavablar.push(cavab)
    });

    assert.strictEqual(emalOlundu, true);
    assert.strictEqual(cavablar.length, 1);
    assert.strictEqual(cavablar[0].type, "sexsi_oxunmamis_say_result");

    const yuk = JSON.parse(cavablar[0].payloadJson);
    assert.strictEqual(yuk.success, false);
    assert.strictEqual(yuk.xetaKodu, "IDENTITY_MISMATCH");
}

async function payloadProtoPollutionTesti() {
    delete Object.prototype.rdcMesajPollution;

    const cavablar = [];
    const payloadJson =
        "{\"__proto__\":{\"rdcMesajPollution\":\"yes\"},\"playerId\":\"player-saxta\"}";

    const emalOlundu = await mesajlasmaMesajiniEmalEt({
        ws: {
            _authedPlayerId: "player-real"
        },
        msg: {
            type: "sexsi_oxunmamis_say_request",
            payloadJson
        },
        send: (_ws, cavab) => cavablar.push(cavab)
    });

    assert.strictEqual(emalOlundu, true);
    assert.strictEqual(Object.prototype.rdcMesajPollution, undefined);
    assert.strictEqual(cavablar.length, 1);

    const yuk = JSON.parse(cavablar[0].payloadJson);
    assert.strictEqual(yuk.xetaKodu, "IDENTITY_MISMATCH");
}

async function ozunuOxunduEtmeTesti() {
    const cavablar = [];

    const emalOlundu = await mesajlasmaMesajiniEmalEt({
        ws: {
            _authedPlayerId: "player-real"
        },
        msg: {
            type: "sexsi_mesaj_oxundu_request",
            playerId: "player-real",
            digerPlayerId: "player-real"
        },
        send: (_ws, cavab) => cavablar.push(cavab)
    });

    assert.strictEqual(emalOlundu, true);
    assert.strictEqual(cavablar.length, 1);

    const yuk = JSON.parse(cavablar[0].payloadJson);
    assert.strictEqual(yuk.success, false);
    assert.strictEqual(yuk.xetaKodu, "DIGER_OYUNCU_SEHVDIR");
}

async function run() {
    await identityMismatchTesti();
    await payloadProtoPollutionTesti();
    await ozunuOxunduEtmeTesti();
    console.log("[MESAJLASMA_TEST] Təhlükəsizlik testləri uğurla keçdi.");
}

run().catch(xeta => {
    console.error("[MESAJLASMA_TEST] Uğursuz:", xeta);
    process.exitCode = 1;
});
