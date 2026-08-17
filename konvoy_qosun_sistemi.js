"use strict";

const { konvoyStateTeminEt } = require("./konvoy_sistemi");
const {
  legacyTutumLeveliniAl,
  konvoyTutumHesabiniAl
} = require("./konvoy_tutum_formulu");
const {
  qosunSnapshotiniCanonicalEt
} = require("./qosun_doyus_stat_sistemi");

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

function canonicalQosunSnapshotiniAl(raw) {
  const temiz = qosunObyektiniTemizle(raw);
  const netice = qosunSnapshotiniCanonicalEt(temiz);

  return {
    qosunlar: netice && netice.troops && typeof netice.troops === "object"
      ? { ...netice.troops }
      : {},
    namelumUnitIdleri: netice && Array.isArray(netice.unknownUnitIds)
      ? [...netice.unknownUnitIds]
      : []
  };
}

function orduQosunlariniAl(state) {
  const troops = state && state.army && state.army.troops;
  return qosunObyektiniTemizle(troops);
}

function orduQosunlariniCanonicalAl(state) {
  return canonicalQosunSnapshotiniAl(
    state && state.army && state.army.troops
  );
}

function konvoyQosunStateTeminEt(state) {
  const konvoylar = konvoyStateTeminEt(state);

  for (const konvoy of konvoylar.items) {
    if (!konvoy) continue;
    // Saxlanılan sıra/unit ID-lərini Unity compatibility üçün zorla dəyişmirik.
    // Availability/reservation hesabında isə eyni qoşunun legacy və canonical
    // adları aşağıdakı canonical qatında vahid kimi hesablanır.
    konvoy.qosunlar = qosunObyektiniTemizle(konvoy.qosunlar);
  }

  return konvoylar;
}

function digerKonvoylardaIstifadeOlunanlariAl(state, istisnaKonvoyId) {
  const konvoylar = konvoyQosunStateTeminEt(state);
  const cem = {};

  for (const konvoy of konvoylar.items) {
    if (!konvoy || konvoy.konvoyId === istisnaKonvoyId) continue;

    const canonical = canonicalQosunSnapshotiniAl(konvoy.qosunlar);
    for (const [unitId, say] of Object.entries(canonical.qosunlar)) {
      cem[unitId] = (cem[unitId] || 0) + musbetTamEded(say);
    }
  }

  return cem;
}

function konvoyQosunMelumatiniHazirla(state) {
  const konvoylar = konvoyQosunStateTeminEt(state);
  const ordu = orduQosunlariniAl(state);
  const orduCanonical = orduQosunlariniCanonicalAl(state);
  const tutumLevel = konvoyTutumLeveliniAl(state);
  const birinciTutumHesabi = konvoyTutumHesabiniAl(state, "konvoy_1");

  return {
    tutumLevel,
    tutum: birinciTutumHesabi.yekunTutum,
    tutumHesabi: birinciTutumHesabi,
    // Mövcud response sahəsi compatibility üçün saxlanılır.
    ordu,
    // Yeni server/cari client-lər üçün eyni qoşunun alias-ları toplanmış görünüş.
    orduCanonical: { ...orduCanonical.qosunlar },
    items: konvoylar.items.map(konvoy => {
      const tutumHesabi = konvoyTutumHesabiniAl(state, konvoy.konvoyId);
      const canonical = canonicalQosunSnapshotiniAl(konvoy.qosunlar);
      return {
        konvoyId: konvoy.konvoyId,
        aciqdir: konvoy.aciqdir === true,
        tutum: konvoy.aciqdir === true ? tutumHesabi.yekunTutum : 0,
        tutumHesabi,
        istifadeOlunanTutum: qosunSayiniHesabla(canonical.qosunlar),
        qosunlar: { ...konvoy.qosunlar },
        qosunlarCanonical: { ...canonical.qosunlar }
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
  const istenilenCanonical = canonicalQosunSnapshotiniAl(istenilen);

  if (istenilenCanonical.namelumUnitIdleri.length > 0) {
    return {
      success: false,
      message: "Konvoya kataloqda olmayan qoşun yerləşdirilə bilməz.",
      unknownUnitIds: [...istenilenCanonical.namelumUnitIdleri]
    };
  }

  const istenilenCem = qosunSayiniHesabla(istenilenCanonical.qosunlar);
  const tutumHesabi = konvoyTutumHesabiniAl(state, id);
  const tutum = tutumHesabi.yekunTutum;

  if (istenilenCem > tutum) {
    return {
      success: false,
      message: `Konvoy tutumu keçildi. Maksimum ${tutum} birlik yerləşdirilə bilər.`,
      tutumHesabi
    };
  }

  const orduCanonical = orduQosunlariniCanonicalAl(state);
  const digerlerde = digerKonvoylardaIstifadeOlunanlariAl(state, id);

  for (const [unitId, say] of Object.entries(istenilenCanonical.qosunlar)) {
    const umumi = musbetTamEded(orduCanonical.qosunlar[unitId]);
    const rezerv = musbetTamEded(digerlerde[unitId]);
    const movcud = Math.max(0, umumi - rezerv);

    if (say > movcud) {
      return {
        success: false,
        message: `${unitId} üçün kifayət qədər sərbəst birlik yoxdur. Mövcud: ${movcud}.`,
        canonicalUnitId: unitId,
        available: movcud,
        owned: umumi,
        reservedInOtherConvoys: rezerv
      };
    }
  }

  // Unity hazırda legacy ID-lərlə formasiya saxlayır. Onları zorla canonical-a
  // çevirmirik; döyüş və rezerv yoxlaması artıq vahid canonical hesabdan keçir.
  konvoy.qosunlar = istenilen;

  return {
    success: true,
    konvoyId: id,
    tutum,
    tutumHesabi,
    istifadeOlunanTutum: istenilenCem,
    qosunlar: { ...istenilen },
    qosunlarCanonical: { ...istenilenCanonical.qosunlar },
    info: konvoyQosunMelumatiniHazirla(state)
  };
}

module.exports = {
  konvoyTutumLeveliniAl,
  konvoyTutumunuAl,
  qosunSayiniHesabla,
  canonicalQosunSnapshotiniAl,
  orduQosunlariniCanonicalAl,
  konvoyQosunStateTeminEt,
  digerKonvoylardaIstifadeOlunanlariAl,
  konvoyQosunMelumatiniHazirla,
  konvoyQosunlariniTeyinEt
};
