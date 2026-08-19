"use strict";

const { sorguEt } = require("./verilenler_bazasi");

function mesajSetriniHazirla(setr) {
    if (!setr) return null;
    const vaxt = setr.gonderilme_vaxti instanceof Date
        ? setr.gonderilme_vaxti.getTime()
        : new Date(setr.gonderilme_vaxti).getTime();
    const oxunmaVaxti = setr.oxunma_vaxti
        ? (setr.oxunma_vaxti instanceof Date ? setr.oxunma_vaxti.getTime() : new Date(setr.oxunma_vaxti).getTime())
        : null;

    return {
        mesajId: String(setr.mesaj_id),
        kanalNovu: String(setr.kanal_novu),
        gonderenPlayerId: String(setr.gonderen_player_id),
        qebulEdenPlayerId: setr.qebul_eden_player_id ? String(setr.qebul_eden_player_id) : null,
        dovletId: setr.dovlet_id == null ? null : Number(setr.dovlet_id),
        ittifaqId: setr.ittifaq_id ? String(setr.ittifaq_id) : null,
        metn: String(setr.metn || ""),
        gonderilmeVaxtiMs: Number.isFinite(vaxt) ? vaxt : Date.now(),
        oxunmaVaxtiMs: Number.isFinite(oxunmaVaxti) ? oxunmaVaxti : null
    };
}

async function sexsiMesajYarat({ mesajId, gonderenPlayerId, qebulEdenPlayerId, metn }) {
    const netice = await sorguEt(
        `INSERT INTO mesajlar (
            mesaj_id, kanal_novu, gonderen_player_id,
            qebul_eden_player_id, metn
         ) VALUES ($1, 'sexsi', $2, $3, $4)
         RETURNING *`,
        [mesajId, gonderenPlayerId, qebulEdenPlayerId, metn]
    );
    return mesajSetriniHazirla(netice.rows[0]);
}

async function olkeMesajiYarat({ mesajId, gonderenPlayerId, dovletId, metn }) {
    const netice = await sorguEt(
        `INSERT INTO mesajlar (
            mesaj_id, kanal_novu, gonderen_player_id,
            dovlet_id, metn
         ) VALUES ($1, 'olke', $2, $3, $4)
         RETURNING *`,
        [mesajId, gonderenPlayerId, dovletId, metn]
    );
    return mesajSetriniHazirla(netice.rows[0]);
}

async function ittifaqMesajiYarat({ mesajId, gonderenPlayerId, ittifaqId, metn }) {
    const netice = await sorguEt(
        `INSERT INTO mesajlar (
            mesaj_id, kanal_novu, gonderen_player_id,
            ittifaq_id, metn
         ) VALUES ($1, 'ittifaq', $2, $3, $4)
         RETURNING *`,
        [mesajId, gonderenPlayerId, ittifaqId, metn]
    );
    return mesajSetriniHazirla(netice.rows[0]);
}

async function mesajiIdIleGetir(mesajId) {
    const netice = await sorguEt(
        `SELECT * FROM mesajlar WHERE mesaj_id = $1 LIMIT 1`,
        [mesajId]
    );
    return netice.rows && netice.rows.length ? mesajSetriniHazirla(netice.rows[0]) : null;
}

async function sexsiMesajTarixcesiniGetir(playerId, digerPlayerId, limit = 50) {
    const temizLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const netice = await sorguEt(
        `SELECT *
           FROM mesajlar
          WHERE kanal_novu = 'sexsi'
            AND (
                (gonderen_player_id = $1 AND qebul_eden_player_id = $2)
                OR
                (gonderen_player_id = $2 AND qebul_eden_player_id = $1)
            )
          ORDER BY gonderilme_vaxti DESC
          LIMIT $3`,
        [playerId, digerPlayerId, temizLimit]
    );
    return netice.rows.map(mesajSetriniHazirla).reverse();
}

async function olkeMesajTarixcesiniGetir(dovletId, limit = 50) {
    const temizLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const netice = await sorguEt(
        `SELECT *
           FROM mesajlar
          WHERE kanal_novu = 'olke' AND dovlet_id = $1
          ORDER BY gonderilme_vaxti DESC
          LIMIT $2`,
        [dovletId, temizLimit]
    );
    return netice.rows.map(mesajSetriniHazirla).reverse();
}

async function ittifaqMesajTarixcesiniGetir(ittifaqId, limit = 50) {
    const temizLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const netice = await sorguEt(
        `SELECT *
           FROM mesajlar
          WHERE kanal_novu = 'ittifaq' AND ittifaq_id = $1
          ORDER BY gonderilme_vaxti DESC
          LIMIT $2`,
        [ittifaqId, temizLimit]
    );
    return netice.rows.map(mesajSetriniHazirla).reverse();
}

async function sexsiMesajlariOxunduEt(playerId, digerPlayerId) {
    const netice = await sorguEt(
        `UPDATE mesajlar
            SET oxunma_vaxti = NOW()
          WHERE kanal_novu = 'sexsi'
            AND qebul_eden_player_id = $1
            AND gonderen_player_id = $2
            AND oxunma_vaxti IS NULL
        RETURNING mesaj_id`,
        [playerId, digerPlayerId]
    );
    return netice.rowCount || 0;
}

async function oxunmamisSexsiMesajSayiniGetir(playerId) {
    const netice = await sorguEt(
        `SELECT COUNT(*)::int AS say
           FROM mesajlar
          WHERE kanal_novu = 'sexsi'
            AND qebul_eden_player_id = $1
            AND oxunma_vaxti IS NULL`,
        [playerId]
    );
    return Number(netice.rows[0] && netice.rows[0].say) || 0;
}

async function tercumeKesiniGetir(mesajId, hedefDil) {
    const netice = await sorguEt(
        `SELECT mesaj_id, hedef_dil, orijinal_dil, tercume_metni
           FROM mesaj_tercumeleri
          WHERE mesaj_id = $1 AND hedef_dil = $2
          LIMIT 1`,
        [mesajId, hedefDil]
    );
    if (!netice.rows || !netice.rows.length) return null;
    const setr = netice.rows[0];
    return {
        mesajId: String(setr.mesaj_id),
        hedefDil: String(setr.hedef_dil),
        orijinalDil: setr.orijinal_dil ? String(setr.orijinal_dil) : null,
        tercumeMetni: String(setr.tercume_metni || "")
    };
}

async function tercumeKesiniYaddaSaxla({ mesajId, hedefDil, orijinalDil, tercumeMetni }) {
    const netice = await sorguEt(
        `INSERT INTO mesaj_tercumeleri (
            mesaj_id, hedef_dil, orijinal_dil, tercume_metni, yaradilma_vaxti
         ) VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (mesaj_id, hedef_dil)
         DO UPDATE SET
             orijinal_dil = EXCLUDED.orijinal_dil,
             tercume_metni = EXCLUDED.tercume_metni,
             yaradilma_vaxti = NOW()
         RETURNING mesaj_id, hedef_dil, orijinal_dil, tercume_metni`,
        [mesajId, hedefDil, orijinalDil || null, tercumeMetni]
    );
    const setr = netice.rows[0];
    return {
        mesajId: String(setr.mesaj_id),
        hedefDil: String(setr.hedef_dil),
        orijinalDil: setr.orijinal_dil ? String(setr.orijinal_dil) : null,
        tercumeMetni: String(setr.tercume_metni || "")
    };
}

module.exports = {
    mesajSetriniHazirla,
    sexsiMesajYarat,
    olkeMesajiYarat,
    ittifaqMesajiYarat,
    mesajiIdIleGetir,
    sexsiMesajTarixcesiniGetir,
    olkeMesajTarixcesiniGetir,
    ittifaqMesajTarixcesiniGetir,
    sexsiMesajlariOxunduEt,
    oxunmamisSexsiMesajSayiniGetir,
    tercumeKesiniGetir,
    tercumeKesiniYaddaSaxla
};
