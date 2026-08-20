"use strict";

const crypto = require("crypto");

const MAKSIMUM_HESABAT_SAYI = 100;
const DESTEKLENEN_RESURSLAR = new Set([
  "food",
  "water",
  "wood",
  "iron",
  "fuel"
]);

function metnAl(deyer, maksimum = 220) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function texnikiMetnAl(deyer, maksimum = 220) {
  return metnAl(deyer, maksimum).toLowerCase();
}

function tamEdedAl(deyer, minimum = 0) {
  const reqem = Number(deyer);
  if (!Number.isFinite(reqem)) return minimum;
  return Math.max(minimum, Math.trunc(reqem));
}

function kopyala(deyer) {
  return deyer == null
    ? null
    : JSON.parse(JSON.stringify(deyer));
}

function tarixSaatiFormatla(ms) {
  const tarix = new Date(Number(ms) || Date.now());
  if (Number.isNaN(tarix.getTime())) return "";

  return tarix
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

function hesabatIdYarat(nowMs = Date.now()) {
  const vaxt = tamEdedAl(nowMs) || Date.now();
  return `resource_${vaxt}_${crypto.randomBytes(6).toString("hex")}`;
}

function resursNovunuNormallasdir(deyer) {
  const nov = texnikiMetnAl(deyer, 32);
  return DESTEKLENEN_RESURSLAR.has(nov)
    ? nov
    : "iron";
}

function legacyHesabatiYenile(hesabat) {
  if (!hesabat || typeof hesabat !== "object") return hesabat;

  hesabat.hesabatId = metnAl(hesabat.hesabatId, 220);
  hesabat.menbeMukafatId = metnAl(hesabat.menbeMukafatId, 220);
  hesabat.resursNovu = resursNovunuNormallasdir(hesabat.resursNovu);
  hesabat.miqdar = tamEdedAl(hesabat.miqdar);
  hesabat.toplamaYeriAdi = metnAl(hesabat.toplamaYeriAdi, 160);
  hesabat.toplamaYeriSeviyesi = tamEdedAl(hesabat.toplamaYeriSeviyesi, 1);
  hesabat.koordinatX = Math.trunc(Number(hesabat.koordinatX) || 0);
  hesabat.koordinatY = Math.trunc(Number(hesabat.koordinatY) || 0);
  hesabat.yaradildiMs = tamEdedAl(hesabat.yaradildiMs) || Date.now();
  hesabat.tarixSaat = metnAl(hesabat.tarixSaat, 40) || tarixSaatiFormatla(hesabat.yaradildiMs);
  hesabat.oxunub = hesabat.oxunub === true;
  hesabat.favoritdir = hesabat.favoritdir === true;
  hesabat.oxunmaVaxtiMs = tamEdedAl(hesabat.oxunmaVaxtiMs);
  hesabat.favoritVaxtiMs = tamEdedAl(hesabat.favoritVaxtiMs);
  hesabat.hesabatVersiyasi = Math.max(1, tamEdedAl(hesabat.hesabatVersiyasi, 1));

  return hesabat;
}

function resursHesabatiStateTeminEt(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("Resurs hesabatı üçün oyunçu state-i yoxdur.");
  }

  if (
    !state.resursHesabatlari ||
    typeof state.resursHesabatlari !== "object" ||
    Array.isArray(state.resursHesabatlari)
  ) {
    state.resursHesabatlari = {
      version: 1,
      items: []
    };
  }

  state.resursHesabatlari.version = 1;

  if (!Array.isArray(state.resursHesabatlari.items)) {
    state.resursHesabatlari.items = [];
  }

  state.resursHesabatlari.items.forEach(legacyHesabatiYenile);
  return state.resursHesabatlari;
}

function resursHesabatiYarat(state, melumat, nowMs = Date.now()) {
  const hesabatlar = resursHesabatiStateTeminEt(state);
  const menbeMukafatId = metnAl(melumat && melumat.menbeMukafatId, 220);

  if (menbeMukafatId) {
    const movcud = hesabatlar.items.find(
      x => x && metnAl(x.menbeMukafatId, 220) === menbeMukafatId
    );

    if (movcud) {
      return legacyHesabatiYenile(movcud);
    }
  }

  const yaradildiMs =
    tamEdedAl(melumat && melumat.yaradildiMs) ||
    tamEdedAl(nowMs) ||
    Date.now();

  const hesabat = {
    hesabatVersiyasi: 1,
    hesabatId: metnAl(melumat && melumat.hesabatId, 220) || hesabatIdYarat(nowMs),
    menbeMukafatId,
    resursNovu: resursNovunuNormallasdir(melumat && melumat.resursNovu),
    miqdar: tamEdedAl(melumat && melumat.miqdar),
    toplamaYeriAdi: metnAl(melumat && melumat.toplamaYeriAdi, 160) || "Resurs nöqtəsi",
    toplamaYeriSeviyesi: tamEdedAl(melumat && melumat.toplamaYeriSeviyesi, 1),
    koordinatX: Math.trunc(Number(melumat && melumat.koordinatX) || 0),
    koordinatY: Math.trunc(Number(melumat && melumat.koordinatY) || 0),
    yaradildiMs,
    tarixSaat: tarixSaatiFormatla(yaradildiMs),
    oxunub: false,
    favoritdir: false,
    oxunmaVaxtiMs: 0,
    favoritVaxtiMs: 0
  };

  hesabatlar.items.push(hesabat);

  if (hesabatlar.items.length > MAKSIMUM_HESABAT_SAYI) {
    const favoritler = hesabatlar.items.filter(
      x => x && x.favoritdir === true
    );

    const adiHesabatlar = hesabatlar.items
      .filter(x => x && x.favoritdir !== true)
      .sort((a, b) => tamEdedAl(b.yaradildiMs) - tamEdedAl(a.yaradildiMs))
      .slice(0, Math.max(0, MAKSIMUM_HESABAT_SAYI - favoritler.length));

    hesabatlar.items = [...favoritler, ...adiHesabatlar]
      .sort((a, b) => tamEdedAl(a.yaradildiMs) - tamEdedAl(b.yaradildiMs));
  }

  return kopyala(hesabat);
}

function resursHesabatiTap(state, hesabatId) {
  const id = metnAl(hesabatId, 220);
  if (!id) return null;

  const hesabat = resursHesabatiStateTeminEt(state).items.find(
    x => x && metnAl(x.hesabatId, 220) === id
  ) || null;

  return legacyHesabatiYenile(hesabat);
}

function resursHesabatiSiyahisiniHazirla(state, limit = 50) {
  const temizLimit = Math.max(1, Math.min(100, tamEdedAl(limit, 50)));

  return resursHesabatiStateTeminEt(state).items
    .slice()
    .sort((a, b) => tamEdedAl(b.yaradildiMs) - tamEdedAl(a.yaradildiMs))
    .slice(0, temizLimit)
    .map(x => ({
      hesabatId: x.hesabatId,
      resursNovu: x.resursNovu,
      miqdar: tamEdedAl(x.miqdar),
      toplamaYeriAdi: x.toplamaYeriAdi,
      toplamaYeriSeviyesi: tamEdedAl(x.toplamaYeriSeviyesi, 1),
      koordinatX: Math.trunc(Number(x.koordinatX) || 0),
      koordinatY: Math.trunc(Number(x.koordinatY) || 0),
      tarixSaat: x.tarixSaat || tarixSaatiFormatla(x.yaradildiMs),
      yaradildiMs: tamEdedAl(x.yaradildiMs),
      oxunub: x.oxunub === true,
      favoritdir: x.favoritdir === true
    }));
}

function resursHesabatiDetaliHazirla(state, hesabatId) {
  const hesabat = resursHesabatiTap(state, hesabatId);
  return hesabat ? kopyala(hesabat) : null;
}

function resursHesabatiniOxunmusEt(state, hesabatId, nowMs = Date.now()) {
  const hesabat = resursHesabatiTap(state, hesabatId);
  if (!hesabat) {
    return { success: false, message: "Resurs hesabatı tapılmadı." };
  }

  hesabat.oxunub = true;
  if (!tamEdedAl(hesabat.oxunmaVaxtiMs)) {
    hesabat.oxunmaVaxtiMs = tamEdedAl(nowMs) || Date.now();
  }

  return {
    success: true,
    hesabat: kopyala(hesabat)
  };
}

function resursHesabatiniFavoritEt(state, hesabatId, favoritdir, nowMs = Date.now()) {
  const hesabat = resursHesabatiTap(state, hesabatId);
  if (!hesabat) {
    return { success: false, message: "Resurs hesabatı tapılmadı." };
  }

  hesabat.favoritdir = favoritdir === true;
  hesabat.favoritVaxtiMs = hesabat.favoritdir
    ? (tamEdedAl(nowMs) || Date.now())
    : 0;

  return {
    success: true,
    hesabat: kopyala(hesabat)
  };
}

function resursHesabatiniSil(state, hesabatId) {
  const id = metnAl(hesabatId, 220);
  const hesabatlar = resursHesabatiStateTeminEt(state);
  const index = hesabatlar.items.findIndex(
    x => x && metnAl(x.hesabatId, 220) === id
  );

  if (index < 0) {
    return { success: false, message: "Resurs hesabatı tapılmadı." };
  }

  const [silinen] = hesabatlar.items.splice(index, 1);

  return {
    success: true,
    hesabatId: id,
    silinen: kopyala(silinen)
  };
}

module.exports = {
  MAKSIMUM_HESABAT_SAYI,
  resursHesabatiStateTeminEt,
  resursHesabatiYarat,
  resursHesabatiTap,
  resursHesabatiSiyahisiniHazirla,
  resursHesabatiDetaliHazirla,
  resursHesabatiniOxunmusEt,
  resursHesabatiniFavoritEt,
  resursHesabatiniSil
};