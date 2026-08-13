"use strict";

const {
  KONVOY_QAYDALARI,
  KONVOY_TEXNOLOGIYA_ACARLARI
} = require("./konvoy_qaydalari");

const {
  qehremanKonvoyaYerleseBiler
} = require("./qehreman_kataloqu");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function texnologiyaSeviyesiniAl(state, techId) {
  const levels = state && state.technology && state.technology.levels;
  if (!levels || typeof levels !== "object") return 0;

  const seviye = Number(levels[metnAl(techId, 128)]);
  return Number.isFinite(seviye)
    ? Math.max(0, Math.trunc(seviye))
    : 0;
}

function aciqQehremanYeriSayiniAl(state) {
  let say = KONVOY_QAYDALARI.baslangicQehremanYeri;

  if (texnologiyaSeviyesiniAl(
    state,
    KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_QEHRAMAN_YERI
  ) > 0) {
    say = 2;
  }

  if (texnologiyaSeviyesiniAl(
    state,
    KONVOY_TEXNOLOGIYA_ACARLARI.UCUNCU_QEHRAMAN_YERI
  ) > 0) {
    say = 3;
  }

  return Math.min(
    KONVOY_QAYDALARI.maksimumQehremanYeri,
    Math.max(1, say)
  );
}

function aciqKonvoySayiniAl(state) {
  let say = KONVOY_QAYDALARI.baslangicKonvoySayi;

  if (texnologiyaSeviyesiniAl(
    state,
    KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_KONVOY
  ) > 0) {
    say = 2;
  }

  return Math.min(
    KONVOY_QAYDALARI.maksimumKonvoySayi,
    Math.max(1, say)
  );
}

function ownedQehremanIdSetiniAl(state) {
  const set = new Set();

  for (const qehreman of Array.isArray(state && state.heroes) ? state.heroes : []) {
    const heroId = metnAl(qehreman && qehreman.heroId, 128);
    if (heroId) set.add(heroId);
  }

  return set;
}

function konvoyStateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Konvoy üçün oyunçu state-i yoxdur.");
  }

  if (!state.konvoylar || typeof state.konvoylar !== "object" || Array.isArray(state.konvoylar)) {
    state.konvoylar = {};
  }

  state.konvoylar.version = 1;

  if (!Array.isArray(state.konvoylar.items)) {
    state.konvoylar.items = [];
  }

  const owned = ownedQehremanIdSetiniAl(state);
  const aciqKonvoySayi = aciqKonvoySayiniAl(state);
  const aciqQehremanYeri = aciqQehremanYeriSayiniAl(state);

  for (let i = 1; i <= KONVOY_QAYDALARI.maksimumKonvoySayi; i++) {
    const konvoyId = `konvoy_${i}`;
    let konvoy = state.konvoylar.items.find(x => x && x.konvoyId === konvoyId);

    if (!konvoy) {
      konvoy = {
        konvoyId,
        qehremanIdleri: []
      };
      state.konvoylar.items.push(konvoy);
    }

    const temiz = [];
    const gorulen = new Set();

    for (const rawHeroId of Array.isArray(konvoy.qehremanIdleri) ? konvoy.qehremanIdleri : []) {
      const heroId = metnAl(rawHeroId, 128);
      if (!heroId || gorulen.has(heroId)) continue;
      if (!owned.has(heroId)) continue;
      if (!qehremanKonvoyaYerleseBiler(heroId)) continue;

      gorulen.add(heroId);
      temiz.push(heroId);
    }

    konvoy.qehremanIdleri = temiz.slice(0, aciqQehremanYeri);
    konvoy.aciqdir = i <= aciqKonvoySayi;
    konvoy.aciqQehremanYeri = konvoy.aciqdir ? aciqQehremanYeri : 0;
  }

  state.konvoylar.items = state.konvoylar.items
    .filter(x => x && /^konvoy_[12]$/.test(x.konvoyId))
    .sort((a, b) => a.konvoyId.localeCompare(b.konvoyId));

  return state.konvoylar;
}

function konvoyMelumatiniHazirla(state) {
  const konvoylar = konvoyStateTeminEt(state);

  return {
    aciqKonvoySayi: aciqKonvoySayiniAl(state),
    maksimumKonvoySayi: KONVOY_QAYDALARI.maksimumKonvoySayi,
    aciqQehremanYeri: aciqQehremanYeriSayiniAl(state),
    maksimumQehremanYeri: KONVOY_QAYDALARI.maksimumQehremanYeri,
    items: konvoylar.items.map(konvoy => ({
      konvoyId: konvoy.konvoyId,
      aciqdir: konvoy.aciqdir === true,
      aciqQehremanYeri: Number(konvoy.aciqQehremanYeri) || 0,
      qehremanIdleri: [...konvoy.qehremanIdleri]
    }))
  };
}

function qehremaniKonvoyaYerlesdir(state, konvoyId, heroId) {
  const konvoylar = konvoyStateTeminEt(state);
  const id = metnAl(konvoyId, 64);
  const qehremanId = metnAl(heroId, 128);
  const owned = ownedQehremanIdSetiniAl(state);

  if (!owned.has(qehremanId)) {
    return { success: false, message: "Qəhrəman oyunçuya məxsus deyil." };
  }

  if (!qehremanKonvoyaYerleseBiler(qehremanId)) {
    return { success: false, message: "Bu qəhrəman döyüş konvoyuna yerləşdirilə bilməz." };
  }

  const konvoy = konvoylar.items.find(x => x && x.konvoyId === id);
  if (!konvoy || konvoy.aciqdir !== true) {
    return { success: false, message: "Konvoy hələ açıq deyil." };
  }

  for (const diger of konvoylar.items) {
    diger.qehremanIdleri = diger.qehremanIdleri.filter(x => x !== qehremanId);
  }

  if (konvoy.qehremanIdleri.length >= konvoy.aciqQehremanYeri) {
    return { success: false, message: "Konvoyda açıq qəhrəman yeri yoxdur." };
  }

  konvoy.qehremanIdleri.push(qehremanId);

  return {
    success: true,
    konvoyId: konvoy.konvoyId,
    heroId: qehremanId,
    info: konvoyMelumatiniHazirla(state)
  };
}

function qehremaniKonvoydanCixar(state, konvoyId, heroId) {
  const konvoylar = konvoyStateTeminEt(state);
  const id = metnAl(konvoyId, 64);
  const qehremanId = metnAl(heroId, 128);
  const konvoy = konvoylar.items.find(x => x && x.konvoyId === id);

  if (!konvoy) {
    return { success: false, message: "Konvoy tapılmadı." };
  }

  konvoy.qehremanIdleri = konvoy.qehremanIdleri.filter(x => x !== qehremanId);

  return {
    success: true,
    konvoyId: konvoy.konvoyId,
    heroId: qehremanId,
    info: konvoyMelumatiniHazirla(state)
  };
}

module.exports = {
  texnologiyaSeviyesiniAl,
  aciqQehremanYeriSayiniAl,
  aciqKonvoySayiniAl,
  konvoyStateTeminEt,
  konvoyMelumatiniHazirla,
  qehremaniKonvoyaYerlesdir,
  qehremaniKonvoydanCixar
};
