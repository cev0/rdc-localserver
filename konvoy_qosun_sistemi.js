"use strict";

const { konvoyStateTeminEt } = require("./konvoy_sistemi");
const {
  legacyTutumLeveliniAl,
  konvoyTutumHesabiniAl
} = require("./konvoy_tutum_formulu");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function konvoyTutumLeveliniAl(state) {
  return legacyTutumLeveliniAl(state);
}

function konvoyTutumunuAl(state, konvoyId = "konvoy_1") {
  return konvoyTutumHesabiniAl(state, konvoyId).yekunTutum;
}

function qosunObyektiniTemizle(raw) {
  const temiz = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return temiz;

  for (const [rawId, rawSay] of Object.entries(raw)) {
    const unitId = metnAl(rawId, 128);
    const say = musbetTamEded(rawSay);
    if (!unitId || say <= 0) continue;
    temiz[unitId] = say;
  }

  return temiz;
}

function qosunSayiniHesabla(qosunlar) {
  return Object.values(qosunObyektiniTemizle(qosunlar))
    .reduce((cem, say) => cem + say, 0);
}

function orduQosunlariniAl(state) {
  const troops = state && state.army && state.army.troops;
  return qosunObyektiniTemizle(troops);
}

function konvoyQosunStateTeminEt(state) {
  const konvoylar = konvoyStateTeminEt(state);

  for (const konvoy of konvoylar.items) {
    if (!konvoy) continue;
    konvoy.qosunlar = qosunObyektiniTemizle(konvoy.qosunlar);
  }

  return konvoylar;
}

function digerKonvoylardaIstifadeOlunanlariAl(state, istisnaKonvoyId) {
  const konvoylar = konvoyQosunStateTeminEt(state);
  const cem = {};

  for (const konvoy of konvoylar.items) {
    if (!konvoy || konvoy.konvoyId === istisnaKonvoyId) continue;

    for (const [unitId, say] of Object.entries(konvoy.qosunlar || {})) {
      cem[unitId] = (cem[unitId] || 0) + musbetTamEded(say);
    }
  }

  return cem;
}

function konvoyQosunMelumatiniHazirla(state) {
  const konvoylar = konvoyQosunStateTeminEt(state);
  const ordu = orduQosunlariniAl(state);
  const tutumLevel = konvoyTutumLeveliniAl(state);
  const birinciTutumHesabi = konvoyTutumHesabiniAl(state, "konvoy_1");

  return {
    tutumLevel,
    tutum: birinciTutumHesabi.yekunTutum,
    tutumHesabi: birinciTutumHesabi,
    ordu,
    items: konvoylar.items.map(konvoy => {
      const tutumHesabi = konvoyTutumHesabiniAl(state, konvoy.konvoyId);
      return {
        konvoyId: konvoy.konvoyId,
        aciqdir: konvoy.aciqdir === true,
        tutum: konvoy.aciqdir === true ? tutumHesabi.yekunTutum : 0,
        tutumHesabi,
        istifadeOlunanTutum: qosunSayiniHesabla(konvoy.qosunlar),
        qosunlar: { ...konvoy.qosunlar }
      };
    })
  };
}

function konvoyQosunlariniTeyinEt(state, konvoyId, rawQosunlar) {
  const konvoylar = konvoyQosunStateTeminEt(state);
  const id = metnAl(konvoyId, 64);
  const konvoy = konvoylar.items.find(x => x && x.konvoyId === id);

  if (!konvoy || konvoy.aciqdir !== true) {
    return { success: false, message: "Konvoy hələ açıq deyil." };
  }

  const istenilen = qosunObyektiniTemizle(rawQosunlar);
  const istenilenCem = qosunSayiniHesabla(istenilen);
  const tutumHesabi = konvoyTutumHesabiniAl(state, id);
  const tutum = tutumHesabi.yekunTutum;

  if (istenilenCem > tutum) {
    return {
      success: false,
      message: `Konvoy tutumu keçildi. Maksimum ${tutum} birlik yerləşdirilə bilər.`,
      tutumHesabi
    };
  }

  const ordu = orduQosunlariniAl(state);
  const digerlerde = digerKonvoylardaIstifadeOlunanlariAl(state, id);

  for (const [unitId, say] of Object.entries(istenilen)) {
    const umumi = musbetTamEded(ordu[unitId]);
    const rezerv = musbetTamEded(digerlerde[unitId]);
    const movcud = Math.max(0, umumi - rezerv);

    if (say > movcud) {
      return {
        success: false,
        message: `${unitId} üçün kifayət qədər sərbəst birlik yoxdur. Mövcud: ${movcud}.`
      };
    }
  }

  konvoy.qosunlar = istenilen;

  return {
    success: true,
    konvoyId: id,
    tutum,
    tutumHesabi,
    istifadeOlunanTutum: istenilenCem,
    qosunlar: { ...istenilen },
    info: konvoyQosunMelumatiniHazirla(state)
  };
}

module.exports = {
  konvoyTutumLeveliniAl,
  konvoyTutumunuAl,
  qosunSayiniHesabla,
  konvoyQosunStateTeminEt,
  konvoyQosunMelumatiniHazirla,
  konvoyQosunlariniTeyinEt
};
