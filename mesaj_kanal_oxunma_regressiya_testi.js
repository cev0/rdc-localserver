"use strict";

const assert = require("assert");
const path = require("path");

const dbPath = require.resolve("./verilenler_bazasi");
const modulPath = require.resolve("./mesaj_kanal_oxunma_postgres");

const sorgular = [];

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        sorguEt: async (sql, params) => {
            const temizSql = String(sql || "").replace(/\s+/g, " ").trim();
            sorgular.push({ sql: temizSql, params });

            if (temizSql.startsWith("CREATE TABLE")) {
                return { rows: [], rowCount: 0 };
            }

            if (temizSql.startsWith("INSERT INTO mesaj_kanal_oxunma_veziyyeti") &&
                temizSql.includes("DO NOTHING")) {
                return { rows: [], rowCount: 1 };
            }

            if (temizSql.startsWith("SELECT COUNT(*)::int AS say")) {
                return { rows: [{ say: 3 }], rowCount: 1 };
            }

            if (temizSql.startsWith("INSERT INTO mesaj_kanal_oxunma_veziyyeti") &&
                temizSql.includes("DO UPDATE")) {
                return {
                    rows: [{ son_oxunma_vaxti: new Date("2026-08-21T01:02:03.000Z") }],
                    rowCount: 1
                };
            }

            throw new Error("Gözlənilməyən SQL: " + temizSql);
        }
    }
};

delete require.cache[modulPath];

const {
    kanalOxunmamisSayiniGetir,
    kanalMesajlariniOxunduEt
} = require("./mesaj_kanal_oxunma_postgres");

async function ilkBaselineVeReconnectTesti() {
    sorgular.length = 0;

    const say = await kanalOxunmamisSayiniGetir({
        playerId: "player-1",
        kanalNovu: "olke",
        kontekstId: 7
    });

    assert.strictEqual(say, 3);
    assert.ok(sorgular.length >= 3);

    const baseline = sorgular.find(x => x.sql.includes("DO NOTHING"));
    assert.ok(baseline, "İlk unread sorğusundan əvvəl baseline yaradılmalıdır.");
    assert.deepStrictEqual(baseline.params, ["player-1", "olke", "7"]);

    const saySorqusu = sorgular.find(x => x.sql.startsWith("SELECT COUNT(*)::int AS say"));
    assert.ok(saySorqusu, "Unread COUNT sorğusu göndərilməlidir.");
    assert.ok(
        saySorqusu.sql.includes("m.gonderen_player_id <> $1"),
        "Oyunçunun öz mesajları unread sayılmamalıdır."
    );
    assert.ok(
        saySorqusu.sql.includes("m.dovlet_id::text = $3"),
        "Ölkə unread sorğusu yalnız cari konteksti saymalıdır."
    );
}

async function oxunduWatermarkTesti() {
    sorgular.length = 0;

    const netice = await kanalMesajlariniOxunduEt({
        playerId: "player-2",
        kanalNovu: "ittifaq",
        kontekstId: "alliance-9"
    });

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.oxunmamisSay, 0);
    assert.strictEqual(
        netice.sonOxunmaVaxtiMs,
        new Date("2026-08-21T01:02:03.000Z").getTime()
    );

    const upsert = sorgular.find(x => x.sql.includes("DO UPDATE"));
    assert.ok(upsert, "Oxundu əməliyyatı watermark-ı UPSERT etməlidir.");
    assert.deepStrictEqual(upsert.params, ["player-2", "ittifaq", "alliance-9"]);
}

async function yanlisKanalFailClosedTesti() {
    sorgular.length = 0;

    await assert.rejects(
        () => kanalOxunmamisSayiniGetir({
            playerId: "player-3",
            kanalNovu: "saxta",
            kontekstId: "x"
        }),
        /YANLIS_MESAJ_KANALI/
    );

    assert.strictEqual(
        sorgular.length,
        0,
        "Yanlış kanal DB-yə çatmadan bloklanmalıdır."
    );
}

async function run() {
    await ilkBaselineVeReconnectTesti();
    await oxunduWatermarkTesti();
    await yanlisKanalFailClosedTesti();

    console.log("[MESAJ_KANAL_OXUNMA_TEST] Regressiya testləri uğurla keçdi.");
}

run().catch(xeta => {
    console.error("[MESAJ_KANAL_OXUNMA_TEST] Uğursuz:", xeta);
    process.exitCode = 1;
});
