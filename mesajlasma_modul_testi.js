"use strict";

const assert = require("assert");
const {
    DESTEKLENEN_MESAJ_NOVLERI,
    dovletIdAl,
    ittifaqIdAl,
    mesajGoruntulemeIcazesi
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

assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("sexsi_mesaj_gonder_request"), true);
assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("olke_mesaj_gonder_request"), true);
assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("ittifaq_mesaj_gonder_request"), true);
assert.strictEqual(DESTEKLENEN_MESAJ_NOVLERI.has("mesaj_tercume_request"), true);

assert.strictEqual(dovletIdAl(saxtaState, "p1"), 1);
assert.strictEqual(ittifaqIdAl(saxtaState, "p1"), "ittifaq-1");

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

const ittifaqMesaji = {
    kanalNovu: "ittifaq",
    ittifaqId: "ittifaq-1"
};
assert.strictEqual(mesajGoruntulemeIcazesi(ittifaqMesaji, "p2", saxtaState), true);
assert.strictEqual(mesajGoruntulemeIcazesi(ittifaqMesaji, "p3", saxtaState), false);

console.log("[MESAJLASMA_TEST] OK");
