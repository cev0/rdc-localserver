"use strict";

const assert = require("assert");
const protokol = require("./server_unity_message_contract.json");
const {
    DESTEKLENEN_MESAJ_NOVLERI,
    dovletIdAl,
    ittifaqIdAl,
    mesajGoruntulemeIcazesi,
    neticeTipiniAl
} = require("./mesajlasma_handler");
const {
    oyunDiliDesteklenir,
    oyunDiliniNormallasdir
} = require("./oyun_dili_postgres");

function saxtaState(playerId) {
    if (playerId === "p1") {
        return {
            worldPlacement: { stateId: 1 },
            ittifaqId: "ittifaq-1"
        };
    }
    if (playerId === "p2") {
        return {
            worldPlacement: { stateId: 1 },
            ittifaqId: "ittifaq-1"
        };
    }
    if (playerId === "legacy") {
        return {
            worldPlacement: { stateId: 1 },
            ittifaqAdi: "Qartal"
        };
    }
    return {
        worldPlacement: { stateId: 2 },
        ittifaqId: "ittifaq-2"
    };
}

assert.strictEqual(oyunDiliDesteklenir("az"), true);
assert.strictEqual(oyunDiliDesteklenir("ru"), true);
assert.strictEqual(oyunDiliDesteklenir("en"), true);
assert.strictEqual(oyunDiliDesteklenir("tr"), true);
assert.strictEqual(oyunDiliDesteklenir("de"), false);
assert.strictEqual(oyunDiliniNormallasdir("RU"), "ru");
assert.strictEqual(oyunDiliniNormallasdir("xx"), "az");

assert.strictEqual(neticeTipiniAl("sexsi_mesaj_gonder_request"), "sexsi_mesaj_gonder_result");
assert.strictEqual(neticeTipiniAl("sexsi_mesaj_oxundu_request"), "sexsi_mesaj_oxundu_result");
assert.strictEqual(neticeTipiniAl("sexsi_oxunmamis_say_request"), "sexsi_oxunmamis_say_result");
assert.strictEqual(neticeTipiniAl("oyun_dili_getir_request"), "oyun_dili_getir_result");
assert.strictEqual(neticeTipiniAl("MESAJ_TERCUME_REQUEST"), "mesaj_tercume_result");

assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("sexsi_mesaj_gonder_request"), true);
assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("sexsi_mesaj_oxundu_request"), true);
assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("sexsi_oxunmamis_say_request"), true);
assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("olke_mesaj_gonder_request"), true);
assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("ittifaq_mesaj_gonder_request"), true);
assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("mesaj_tercume_request"), true);

assert.strictEqual(protokol.version >= 3, true);
for (const requestType of DESTEKLENEN_MESAJ_NOVLERI) {
    assert.strictEqual(
        protokol.clientOutboundTypes.includes(requestType),
        true,
        `Müqavilədə client request yoxdur: ${requestType}`
    );
}

const gozlenilenServerMesajlari = [
    "oyun_dili_getir_result",
    "oyun_dili_deyis_result",
    "sexsi_mesaj_gonder_result",
    "sexsi_mesaj_tarixcesi_result",
    "sexsi_mesaj_oxundu_result",
    "sexsi_oxunmamis_say_result",
    "sexsi_mesaj_geldi",
    "sexsi_mesajlar_oxundu",
    "olke_mesaj_gonder_result",
    "olke_mesaj_tarixcesi_result",
    "olke_mesaj_geldi",
    "ittifaq_mesaj_gonder_result",
    "ittifaq_mesaj_tarixcesi_result",
    "ittifaq_mesaj_geldi",
    "mesaj_tercume_result"
];
for (const serverType of gozlenilenServerMesajlari) {
    assert.strictEqual(
        protokol.serverInboundTypes.includes(serverType),
        true,
        `Müqavilədə server cavabı/bildirisi yoxdur: ${serverType}`
    );
}

assert.strictEqual(dovletIdAl(saxtaState, "p1"), 1);
assert.strictEqual(dovletIdAl(null, "p1"), null);
assert.strictEqual(ittifaqIdAl(saxtaState, "p1"), "ittifaq-1");
assert.strictEqual(ittifaqIdAl(saxtaState, "legacy"), "ad:qartal");
assert.strictEqual(ittifaqIdAl(null, "p1"), "");

const sexsiMesaj = {
    kanalNovu: "sexsi",
    gonderenPlayerId: "p1",
    qebulEdenPlayerId: "p2"
};
assert.strictEqual(mesajGoruntulemeIcazesi(sexsiMesaj, "p1", saxtaState), true);
assert.strictEqual(mesajGoruntulemeIcazesi(sexsiMesaj, "p2", saxtaState), true);
assert.strictEqual(mesajGoruntulemeIcazesi(sexsiMesaj, "p3", saxtaState), false);

const olkeMesaji = {
    kanalNovu: "olke",
    dovletId: 1
};
assert.strictEqual(mesajGoruntulemeIcazesi(olkeMesaji, "p1", saxtaState), true);
assert.strictEqual(mesajGoruntulemeIcazesi(olkeMesaji, "p3", saxtaState), false);
assert.strictEqual(mesajGoruntulemeIcazesi(olkeMesaji, "p1", null), false);

const ittifaqMesaji = {
    kanalNovu: "ittifaq",
    ittifaqId: "ittifaq-1"
};
assert.strictEqual(mesajGoruntulemeIcazesi(ittifaqMesaji, "p2", saxtaState), true);
assert.strictEqual(mesajGoruntulemeIcazesi(ittifaqMesaji, "p3", saxtaState), false);
assert.strictEqual(mesajGoruntulemeIcazesi(ittifaqMesaji, "p1", null), false);

const legacyIttifaqMesaji = {
    kanalNovu: "ittifaq",
    ittifaqId: "ad:qartal"
};
assert.strictEqual(mesajGoruntulemeIcazesi(legacyIttifaqMesaji, "legacy", saxtaState), true);

console.log("[MESAJLASMA_TEST] OK");
