"use strict";

const { sorguEt } = require("./verilenler_bazasi");

let cedvelHazirlamaPromise = null;

async function oxunmaCedveliniTeminEt() {
    if (!cedvelHazirlamaPromise) {
        cedvelHazirlamaPromise = sorguEt(`
            CREATE TABLE IF NOT EXISTS mesaj_kanal_oxunma_veziyyeti (
                player_id TEXT NOT NULL,
                kanal_novu TEXT NOT NULL,
                kontekst_id TEXT NOT NULL,
                son_oxunma_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (player_id, kanal_novu, kontekst_id),
                CONSTRAINT mesaj_kanal_oxunma_kanal_check
                    CHECK (kanal_novu IN ('olke', 'ittifaq'))
            )
        `).catch(xeta => {
            cedvelHazirlamaPromise = null;
            throw xeta;
        });
    }

    await cedvelHazirlamaPromise;
}

function kanalNovunuYoxla(kanalNovu) {
    if (kanalNovu !== "olke" && kanalNovu !== "ittifaq") {
        throw new Error("YANLIS_MESAJ_KANALI");
    }
}

async function ilkOxunmaBaselineIniTeminEt({
    playerId,
    kanalNovu,
    kontekstId
}) {
    // Bu funksiya yeni notification sistemi deploy olunmazdan əvvəl yaranmış bütün
    // tarixi ölkə/ittifaq mesajlarının birdən-birə "unread" sayılmasının qarşısını alır.
    // Sətir artıq varsa heç nəyə toxunmur; reconnect zamanı mövcud watermark qorunur.
    await sorguEt(
        `INSERT INTO mesaj_kanal_oxunma_veziyyeti (
            player_id,
            kanal_novu,
            kontekst_id,
            son_oxunma_vaxti
         ) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (player_id, kanal_novu, kontekst_id)
         DO NOTHING`,
        [playerId, kanalNovu, String(kontekstId)]
    );
}

async function kanalOxunmamisSayiniGetir({
    playerId,
    kanalNovu,
    kontekstId
}) {
    kanalNovunuYoxla(kanalNovu);
    await oxunmaCedveliniTeminEt();
    await ilkOxunmaBaselineIniTeminEt({
        playerId,
        kanalNovu,
        kontekstId
    });

    const kontekstSerti = kanalNovu === "olke"
        ? "m.dovlet_id::text = $3"
        : "m.ittifaq_id = $3";

    const netice = await sorguEt(
        `SELECT COUNT(*)::int AS say
           FROM mesajlar m
          WHERE m.kanal_novu = $2
            AND ${kontekstSerti}
            AND m.gonderen_player_id <> $1
            AND m.gonderilme_vaxti > (
                SELECT o.son_oxunma_vaxti
                  FROM mesaj_kanal_oxunma_veziyyeti o
                 WHERE o.player_id = $1
                   AND o.kanal_novu = $2
                   AND o.kontekst_id = $3
                 LIMIT 1
            )`,
        [playerId, kanalNovu, String(kontekstId)]
    );

    return Number(netice.rows && netice.rows[0] && netice.rows[0].say) || 0;
}

async function kanalMesajlariniOxunduEt({
    playerId,
    kanalNovu,
    kontekstId
}) {
    kanalNovunuYoxla(kanalNovu);
    await oxunmaCedveliniTeminEt();

    const netice = await sorguEt(
        `INSERT INTO mesaj_kanal_oxunma_veziyyeti (
            player_id,
            kanal_novu,
            kontekst_id,
            son_oxunma_vaxti
         ) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (player_id, kanal_novu, kontekst_id)
         DO UPDATE SET son_oxunma_vaxti = EXCLUDED.son_oxunma_vaxti
         RETURNING son_oxunma_vaxti`,
        [playerId, kanalNovu, String(kontekstId)]
    );

    const setr = netice.rows && netice.rows[0];
    const vaxt = setr && setr.son_oxunma_vaxti
        ? new Date(setr.son_oxunma_vaxti).getTime()
        : Date.now();

    return {
        success: true,
        oxunmamisSay: 0,
        sonOxunmaVaxtiMs: Number.isFinite(vaxt) ? vaxt : Date.now()
    };
}

module.exports = {
    oxunmaCedveliniTeminEt,
    kanalOxunmamisSayiniGetir,
    kanalMesajlariniOxunduEt
};
