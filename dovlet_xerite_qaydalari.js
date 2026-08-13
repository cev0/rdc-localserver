"use strict";

// ============================================================
// DÖVLƏT / XƏRİTƏ ƏSAS QAYDALARI
// ------------------------------------------------------------
// Dövlət xəritəsi ortaq online multiplayer xəritədir.
// Xəritə rəng zonaları oyunçu üçün unlock/progression deyil.
// Zonalar yalnız xəritədəki resurs və düşmən obyektlərinin
// level diapazonunu müəyyən edir.
// ============================================================

const DOVLET_QAYDALARI = Object.freeze({
  dovletMuddetGun: 60,
  dovletMuddetAy: 2,
  yeniDovletMuddetBitendeAcilir: true,
  dovletOyuncuSayinaGoreAcilmir: true,
  movcudOyuncuDovletindeQalir: true,
  yeniOyuncuCariAktivDovleteDusur: true,
  ortaqMultiplayerXeritesidir: true,
  eyniDovletOyunculariEyniXeritededir: true,
  hesablanmaMenbeyi: "play_market_release",
  playMarketReleaseEnv: "PLAY_MARKET_RELEASE_TARIXI"
});

const XERITE_ZONALARI = Object.freeze({
  COL: Object.freeze({
    zoneId: "outer",
    displayName: "Çöl",
    resursMinLevel: 3,
    resursMaxLevel: 6,
    dusmenMinLevel: 1,
    dusmenMaxLevel: 5
  }),
  ACIQ_YASIL: Object.freeze({
    zoneId: "middle",
    displayName: "Açıq Yaşıl",
    resursMinLevel: 5,
    resursMaxLevel: 8,
    dusmenMinLevel: 5,
    dusmenMaxLevel: 8
  }),
  TUND_YASIL: Object.freeze({
    zoneId: "inner_green",
    displayName: "Tünd Yaşıl",
    resursMinLevel: 8,
    resursMaxLevel: 9,
    dusmenMinLevel: 8,
    dusmenMaxLevel: 10
  }),
  PREZIDENT_MERKEZI: Object.freeze({
    zoneId: "president_center",
    displayName: "Prezident Mərkəzi",
    resursMinLevel: 10,
    resursMaxLevel: 10,
    dusmenMinLevel: 0,
    dusmenMaxLevel: 0,
    coxAzResurs: true
  })
});

const XERITE_OBYEKT_NOVLERI = Object.freeze({
  RESURS: "resource",
  KICIK_DUSMEN: "small_enemy",
  DUSMEN_KESFIYYATCISI: "enemy_scout"
});

function zonaniTap(zoneId) {
  const acar = String(zoneId || "").trim().toLowerCase();
  return Object.values(XERITE_ZONALARI).find(zona => zona.zoneId === acar) || null;
}

function zonaSeviyeAraliginiAl(zoneId, obyektNovu) {
  const zona = zonaniTap(zoneId);
  if (!zona) return { minLevel: 0, maxLevel: 0 };

  if (obyektNovu === XERITE_OBYEKT_NOVLERI.RESURS) {
    return { minLevel: zona.resursMinLevel, maxLevel: zona.resursMaxLevel };
  }

  return { minLevel: zona.dusmenMinLevel, maxLevel: zona.dusmenMaxLevel };
}

module.exports = {
  DOVLET_QAYDALARI,
  XERITE_ZONALARI,
  XERITE_OBYEKT_NOVLERI,
  zonaniTap,
  zonaSeviyeAraliginiAl
};
