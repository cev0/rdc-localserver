"use strict";

const {
  XERITE_OBYEKT_NOVLERI,
  zonaSeviyeAraliginiAl
} = require("./dovlet_xerite_qaydalari");

const XERITE_RESURS_NOVLERI = Object.freeze([
  "food",
  "water",
  "wood",
  "iron",
  "fuel"
]);

const RESURS_LEVEL_BALANSI = Object.freeze({
  3: Object.freeze({ amount: 30000, gatherSeconds: 20 * 60 }),
  4: Object.freeze({ amount: 45000, gatherSeconds: 30 * 60 }),
  5: Object.freeze({ amount: 65000, gatherSeconds: 45 * 60 }),
  6: Object.freeze({ amount: 90000, gatherSeconds: 60 * 60 }),
  7: Object.freeze({ amount: 125000, gatherSeconds: 90 * 60 }),
  8: Object.freeze({ amount: 170000, gatherSeconds: 120 * 60 }),
  9: Object.freeze({ amount: 230000, gatherSeconds: 180 * 60 }),
  10: Object.freeze({ amount: 350000, gatherSeconds: 240 * 60 })
});

const RESURS_RESPAWN_BALANSI = Object.freeze({
  3: 60 * 60,
  4: 90 * 60,
  5: 2 * 60 * 60,
  6: 3 * 60 * 60,
  7: 4 * 60 * 60,
  8: 6 * 60 * 60,
  9: 8 * 60 * 60,
  10: 18 * 60 * 60
});

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function tamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function resursNovuDesteklenir(resourceId) {
  return XERITE_RESURS_NOVLERI.includes(metnAl(resourceId, 64));
}

function resursLevelMelumatiniAl(level) {
  const temiz = Math.max(3, Math.min(10, tamEded(level) || 3));
  const balans = RESURS_LEVEL_BALANSI[temiz];

  return {
    level: temiz,
    amount: balans.amount,
    gatherSeconds: balans.gatherSeconds,
    respawnSeconds: RESURS_RESPAWN_BALANSI[temiz]
  };
}

function resursLeveliZonayaUyğundur(zoneId, level) {
  const temizLevel = tamEded(level);
  const araliq = zonaSeviyeAraliginiAl(
    metnAl(zoneId, 64),
    XERITE_OBYEKT_NOVLERI.RESURS
  );

  return (
    temizLevel >= araliq.minLevel &&
    temizLevel <= araliq.maxLevel
  );
}

function resursNodeYaratmaMelumatiniYoxla({ zoneId, resourceId, level }) {
  const zona = metnAl(zoneId, 64);
  const resurs = metnAl(resourceId, 64);
  const temizLevel = tamEded(level);

  if (!resursNovuDesteklenir(resurs)) {
    return {
      ok: false,
      message: "Dəstəklənməyən xəritə resurs növüdür."
    };
  }

  if (!resursLeveliZonayaUyğundur(zona, temizLevel)) {
    return {
      ok: false,
      message: "Resurs level-i seçilmiş xəritə zonasına uyğun deyil."
    };
  }

  return {
    ok: true,
    zoneId: zona,
    resourceId: resurs,
    ...resursLevelMelumatiniAl(temizLevel)
  };
}

module.exports = {
  XERITE_RESURS_NOVLERI,
  RESURS_LEVEL_BALANSI,
  RESURS_RESPAWN_BALANSI,
  resursNovuDesteklenir,
  resursLevelMelumatiniAl,
  resursLeveliZonayaUyğundur,
  resursNodeYaratmaMelumatiniYoxla
};
