"use strict";

// ============================================================
// DÖVLƏT / XƏRİTƏ ƏSAS QAYDALARI
// ------------------------------------------------------------
// Bu modul gameplay data qaydasını saxlayır.
// Buradakı zonalar oyunçu üçün unlock/progression deyil.
// ============================================================

const DOVLET_QAYDALARI = Object.freeze({
  dovletMuddetGun: 30,
  yeniDovletHerAyAcilir: true,
  dovletOyuncuSayinaGoreAcilmir: true,
  movcudOyuncuDovletindeQalir: true,
  yeniOyuncuCariAktivDovleteDusur: true
});

const XERITE_ZONALARI = Object.freeze({
  COL: Object.freeze({
    zoneId: "outer",
    displayName: "Çöl",
    levelBand: 1
  }),
  ACIQ_YASIL: Object.freeze({
    zoneId: "middle",
    displayName: "Açıq Yaşıl",
    levelBand: 2
  }),
  TUND_YASIL: Object.freeze({
    zoneId: "inner_green",
    displayName: "Tünd Yaşıl",
    levelBand: 3
  })
});

const XERITE_OBYEKT_NOVLERI = Object.freeze({
  RESURS: "resource",
  KICIK_DUSMEN: "small_enemy",
  DUSMEN_KESFIYYATCISI: "enemy_scout"
});

function zonaLevelBandiniAl(zoneId) {
  const acar = String(zoneId || "").trim().toLowerCase();

  for (const zona of Object.values(XERITE_ZONALARI)) {
    if (zona.zoneId === acar) return zona.levelBand;
  }

  return 0;
}

module.exports = {
  DOVLET_QAYDALARI,
  XERITE_ZONALARI,
  XERITE_OBYEKT_NOVLERI,
  zonaLevelBandiniAl
};
