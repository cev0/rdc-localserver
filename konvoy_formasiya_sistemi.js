"use strict";

const {
  konvoyQosunStateTeminEt,
  konvoyQosunMelumatiniHazirla,
  konvoyQosunlariniTeyinEt
} = require("./konvoy_qosun_sistemi");
const { konvoyTutumHesabiniAl } = require("./konvoy_tutum_formulu");

const FORMASIYA_SIRA_IDLERI = Object.freeze(["sira_1", "sira_2", "sira_3"]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum).toLowerCase() : "";
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function bosSira(siraId) {
  return { siraId, unitId: "", count: 0 };
}

function siraniTemizle(raw, siraId) {
  const unitId = metnAl(raw && raw.unitId, 128);
  const count = musbetTamEded(raw && raw.count);
  return !unitId || count <= 0 ? bosSira(siraId) : { siraId, unitId, count };
}

function formasiyaStateTeminEt(konvoy) {
  if (!konvoy || typeof konvoy !== "object") throw new Error("Konvoy formasiya state-i üçün konvoy yoxdur.");
  if (!konvoy.formasiya || typeof konvoy.formasiya !== "object" || Array.isArray(konvoy.formasiya)) konvoy.formasiya = {};
  konvoy.formasiya.version = 2;
  if (!Array.isArray(konvoy.formasiya.siralar)) konvoy.formasiya.siralar = [];

  const movcud = new Map();
  for (const raw of konvoy.formasiya.siralar) {
    const siraId = metnAl(raw && raw.siraId, 32);
    if (!FORMASIYA_SIRA_IDLERI.includes(siraId) || movcud.has(siraId)) continue;
    movcud.set(siraId, siraniTemizle(raw, siraId));
  }
  konvoy.formasiya.siralar = FORMASIYA_SIRA_IDLERI.map(siraId => movcud.get(siraId) || bosSira(siraId));
  return konvoy.formasiya;
}

function formasiyaQosunlariniTopla(siralar) {
  const qosunlar = {};
  for (const sira of Array.isArray(siralar) ? siralar : []) {
    const unitId = metnAl(sira && sira.unitId, 128);
    const count = musbetTamEded(sira && sira.count);
    if (!unitId || count <= 0) continue;
    qosunlar[unitId] = (qosunlar[unitId] || 0) + count;
  }
  return qosunlar;
}

function legacyQosunlardanFormasiyaHazirla(qosunlar, rawSiraTutumu = 0) {
  const entries = Object.entries(qosunlar || {})
    .map(([unitId, count]) => [metnAl(unitId, 128), musbetTamEded(count)])
    .filter(([unitId, count]) => !!unitId && count > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    return FORMASIYA_SIRA_IDLERI.map(bosSira);
  }

  const siraTutumu = musbetTamEded(rawSiraTutumu);

  // Köhnə caller sıra tutumu göndərmirsə əvvəlki deterministik 1 unit = 1 sıra
  // davranışını saxlayırıq. Yeni gameplay migration-u isə aşağıdakı capacity-aware
  // packing yolundan istifadə edir.
  if (siraTutumu <= 0) {
    if (entries.length > FORMASIYA_SIRA_IDLERI.length) return null;
    return FORMASIYA_SIRA_IDLERI.map((siraId, index) => {
      const entry = entries[index];
      return entry ? { siraId, unitId: entry[0], count: entry[1] } : bosSira(siraId);
    });
  }

  const siralar = [];
  for (const [unitId, count] of entries) {
    let qalan = count;
    while (qalan > 0) {
      if (siralar.length >= FORMASIYA_SIRA_IDLERI.length) return null;
      const hissə = Math.min(qalan, siraTutumu);
      siralar.push({
        siraId: FORMASIYA_SIRA_IDLERI[siralar.length],
        unitId,
        count: hissə
      });
      qalan -= hissə;
    }
  }

  while (siralar.length < FORMASIYA_SIRA_IDLERI.length) {
    siralar.push(bosSira(FORMASIYA_SIRA_IDLERI[siralar.length]));
  }

  return siralar;
}

function konvoyFormasiyalariniTeminEt(state) {
  const konvoylar = konvoyQosunStateTeminEt(state);
  for (const konvoy of konvoylar.items) {
    if (!konvoy) continue;
    const formasiya = formasiyaStateTeminEt(konvoy);
    const formasiyaQosunlari = formasiyaQosunlariniTopla(formasiya.siralar);
    if (Object.keys(formasiyaQosunlari).length === 0 && konvoy.qosunlar && Object.keys(konvoy.qosunlar).length > 0) {
      const tutumHesabi = konvoyTutumHesabiniAl(state, konvoy.konvoyId);
      const migrated = legacyQosunlardanFormasiyaHazirla(
        konvoy.qosunlar,
        tutumHesabi.siraTutumu
      );
      if (migrated) formasiya.siralar = migrated;
    }
  }
  return konvoylar;
}

function formasiyaMelumatiniHazirla(state) {
  const konvoylar = konvoyFormasiyalariniTeminEt(state);
  const birinciHesab = konvoyTutumHesabiniAl(state, "konvoy_1");
  return {
    version: 2,
    rowCount: 3,
    rowsAlwaysOpen: true,
    siraTutumu: birinciHesab.siraTutumu,
    items: konvoylar.items.map(konvoy => {
      const formasiya = formasiyaStateTeminEt(konvoy);
      const tutumHesabi = konvoyTutumHesabiniAl(state, konvoy.konvoyId);
      return {
        konvoyId: konvoy.konvoyId,
        aciqdir: konvoy.aciqdir === true,
        tutum: konvoy.aciqdir === true ? tutumHesabi.yekunTutum : 0,
        siraTutumu: konvoy.aciqdir === true ? tutumHesabi.siraTutumu : 0,
        tutumHesabi,
        siralar: formasiya.siralar.map(x => ({ ...x })),
        qosunlar: formasiyaQosunlariniTopla(formasiya.siralar)
      };
    })
  };
}

function formasiyaTeyinEt(state, konvoyId, rawSiralar) {
  const konvoylar = konvoyFormasiyalariniTeminEt(state);
  const id = metnAl(konvoyId, 64);
  const konvoy = konvoylar.items.find(x => x && x.konvoyId === id);
  if (!konvoy || konvoy.aciqdir !== true) return { success: false, message: "Konvoy hələ açıq deyil." };
  if (!Array.isArray(rawSiralar)) return { success: false, message: "Konvoy formasiyası düzgün göndərilməyib." };

  const rawById = new Map();
  for (const raw of rawSiralar) {
    const siraId = metnAl(raw && raw.siraId, 32);
    if (!FORMASIYA_SIRA_IDLERI.includes(siraId)) return { success: false, message: "Naməlum formasiya sırası göndərilib." };
    if (rawById.has(siraId)) return { success: false, message: "Eyni formasiya sırası iki dəfə göndərilib." };
    rawById.set(siraId, raw);
  }

  const siralar = FORMASIYA_SIRA_IDLERI.map(siraId => siraniTemizle(rawById.get(siraId), siraId));
  const tutumHesabi = konvoyTutumHesabiniAl(state, id);
  const siraTutumu = musbetTamEded(tutumHesabi.siraTutumu);

  for (const sira of siralar) {
    if (sira.count > siraTutumu) {
      return {
        success: false,
        message: `${sira.siraId} tutumu keçildi. Bu sıraya maksimum ${siraTutumu} birlik yerləşdirilə bilər.`,
        siraId: sira.siraId,
        siraTutumu,
        tutum: tutumHesabi.yekunTutum,
        tutumHesabi
      };
    }
  }

  const qosunlar = formasiyaQosunlariniTopla(siralar);
  const qosunNeticesi = konvoyQosunlariniTeyinEt(state, id, qosunlar);
  if (!qosunNeticesi.success) return qosunNeticesi;

  konvoy.formasiya = { version: 2, siralar };
  return {
    success: true,
    konvoyId: id,
    siralar: siralar.map(x => ({ ...x })),
    qosunlar: { ...qosunlar },
    tutum: qosunNeticesi.tutum,
    siraTutumu,
    istifadeOlunanTutum: qosunNeticesi.istifadeOlunanTutum,
    formationInfo: formasiyaMelumatiniHazirla(state),
    troopInfo: konvoyQosunMelumatiniHazirla(state)
  };
}

module.exports = {
  FORMASIYA_SIRA_IDLERI,
  formasiyaStateTeminEt,
  formasiyaQosunlariniTopla,
  legacyQosunlardanFormasiyaHazirla,
  konvoyFormasiyalariniTeminEt,
  formasiyaMelumatiniHazirla,
  formasiyaTeyinEt
};
