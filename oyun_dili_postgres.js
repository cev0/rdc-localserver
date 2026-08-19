"use strict";

const { sorguEt } = require("./verilenler_bazasi");

const DESTEKLENEN_OYUN_DILLERI = Object.freeze(["az", "ru", "en", "tr"]);
const DESTEKLENEN_OYUN_DILLERI_SET = new Set(DESTEKLENEN_OYUN_DILLERI);

function oyunDiliniNormallasdir(deyer, standartDil = "az") {
    const dil = String(deyer || "").trim().toLowerCase();
    if (DESTEKLENEN_OYUN_DILLERI_SET.has(dil)) return dil;
    return DESTEKLENEN_OYUN_DILLERI_SET.has(standartDil) ? standartDil : "az";
}

function oyunDiliDesteklenir(deyer) {
    return DESTEKLENEN_OYUN_DILLERI_SET.has(String(deyer || "").trim().toLowerCase());
}

async function oyunDiliniGetir(playerId) {
    const temizPlayerId = String(playerId || "").trim();
    if (!temizPlayerId) throw new Error("PLAYER_ID_BOSDUR");

    const netice = await sorguEt(
        `SELECT oyun_dili
           FROM oyuncu_dil_ayarlari
          WHERE player_id = $1
          LIMIT 1`,
        [temizPlayerId]
    );

    if (!netice.rows || netice.rows.length === 0) return "az";
    return oyunDiliniNormallasdir(netice.rows[0].oyun_dili, "az");
}

async function oyunDiliniYaddaSaxla(playerId, oyunDili) {
    const temizPlayerId = String(playerId || "").trim();
    const temizDil = String(oyunDili || "").trim().toLowerCase();

    if (!temizPlayerId) throw new Error("PLAYER_ID_BOSDUR");
    if (!oyunDiliDesteklenir(temizDil)) throw new Error("DESTEKLENMEYEN_OYUN_DILI");

    const netice = await sorguEt(
        `INSERT INTO oyuncu_dil_ayarlari (player_id, oyun_dili, yenilenme_vaxti)
         VALUES ($1, $2, NOW())
         ON CONFLICT (player_id)
         DO UPDATE SET
             oyun_dili = EXCLUDED.oyun_dili,
             yenilenme_vaxti = NOW()
         RETURNING oyun_dili, yenilenme_vaxti`,
        [temizPlayerId, temizDil]
    );

    return {
        oyunDili: oyunDiliniNormallasdir(netice.rows[0].oyun_dili, "az"),
        yenilenmeVaxti: netice.rows[0].yenilenme_vaxti
    };
}

module.exports = {
    DESTEKLENEN_OYUN_DILLERI,
    oyunDiliDesteklenir,
    oyunDiliniNormallasdir,
    oyunDiliniGetir,
    oyunDiliniYaddaSaxla
};
