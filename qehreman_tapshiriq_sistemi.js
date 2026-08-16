"use strict";

const {
  QEHRAMAN_ISTIFADE_SAHESI,
  qehremaniTap
} = require("./qehreman_kataloqu");
const {
  inkisafKonfiqurasiyasiniAl,
  binaUyğundur,
  binaUcunInkIsafModifikatorlariniHesabla
} = require("./qehreman_inkisaf_sistemi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function sahibdir(state, heroId) {
  const id = metnAl(heroId);
  return Array.isArray(state && state.heroes) && state.heroes.some(x => metnAl(x && x.heroId) === id);
}

function tapshiriqStateTeminEt(state) {
  if (!state.qehremanTapshiriqlari || typeof state.qehremanTapshiriqlari !== "object" || Array.isArray(state.qehremanTapshiriqlari)) {
    state.qehremanTapshiriqlari = { version: 2, technology: null, resources: [], development: [] };
  }
  const t = state.qehremanTapshiriqlari;
  t.version = 2;
  if (!Array.isArray(t.resources)) t.resources = [];
  if (!Array.isArray(t.development)) t.development = [];
  if (t.technology && typeof t.technology !== "object") t.technology = null;
  return t;
}

function tamamlanmisBinaTap(state, instanceId) {
  const id = metnAl(instanceId, 128);
  return Array.isArray(state && state.buildings)
    ? state.buildings.find(x => x && metnAl(x.instanceId, 128) === id && x.isCompleted === true) || null
    : null;
}

function qehremanBasqaTapshiriqdadir(state, heroId) {
  const id = metnAl(heroId);
  const t = tapshiriqStateTeminEt(state);
  if (t.technology && metnAl(t.technology.heroId) === id) return true;
  if (t.resources.some(x => x && metnAl(x.heroId) === id)) return true;
  if (t.development.some(x => x && metnAl(x.heroId) === id)) return true;
  if (state.konvoylar && Array.isArray(state.konvoylar.items)) {
    return state.konvoylar.items.some(k => Array.isArray(k && k.qehremanIdleri) && k.qehremanIdleri.map(metnAl).includes(id));
  }
  return false;
}

function texnologiyaQehremaniTeyinEt(state, heroId, instituteInstanceId) {
  const id = metnAl(heroId);
  const def = qehremaniTap(id);
  if (!def || def.istifadeSahesi !== QEHRAMAN_ISTIFADE_SAHESI.TEXNOLOGIYA) {
    return { success: false, message: "Bu qəhrəman Texnologiya qəhrəmanı deyil." };
  }
  if (!sahibdir(state, id)) return { success: false, message: "Qəhrəman oyunçuya məxsus deyil." };
  if (qehremanBasqaTapshiriqdadir(state, id)) return { success: false, message: "Qəhrəman artıq başqa tapşırıqda istifadə olunur." };

  const bina = tamamlanmisBinaTap(state, instituteInstanceId);
  if (!bina || metnAl(bina.buildingId) !== "institute") {
    return { success: false, message: "Tamamlanmış İnstitut tələb olunur." };
  }

  const t = tapshiriqStateTeminEt(state);
  if (t.technology) return { success: false, message: "İnstitutda artıq qəhrəman təyin olunub." };
  t.technology = { heroId: id, instituteInstanceId: metnAl(instituteInstanceId, 128) };
  return { success: true, assignment: { ...t.technology } };
}

function texnologiyaQehremaniniCixar(state, heroId) {
  const t = tapshiriqStateTeminEt(state);
  const id = metnAl(heroId);
  if (!t.technology || metnAl(t.technology.heroId) !== id) {
    return { success: false, message: "Bu Texnologiya qəhrəmanı təyin olunmayıb." };
  }
  t.technology = null;
  return { success: true };
}

function inkisafQehremaniTeyinEt(state, heroId, buildingInstanceId) {
  const id = metnAl(heroId);
  const def = qehremaniTap(id);
  const inkisaf = inkisafKonfiqurasiyasiniAl(id);
  if (!def || !inkisaf) {
    return { success: false, message: "Bu qəhrəman üçün İnkişaf təyinatı aktiv deyil." };
  }
  if (!sahibdir(state, id)) return { success: false, message: "Qəhrəman oyunçuya məxsus deyil." };
  if (qehremanBasqaTapshiriqdadir(state, id)) return { success: false, message: "Qəhrəman artıq başqa tapşırıqda istifadə olunur." };

  const bina = tamamlanmisBinaTap(state, buildingInstanceId);
  if (!bina) return { success: false, message: "Tamamlanmış uyğun bina tələb olunur." };
  if (!binaUyğundur(inkisaf, bina)) return { success: false, message: "Bu qəhrəman həmin binaya təyin edilə bilməz." };

  const t = tapshiriqStateTeminEt(state);
  const instanceId = metnAl(buildingInstanceId, 128);
  if (t.development.some(x => x && metnAl(x.buildingInstanceId) === instanceId)) {
    return { success: false, message: "Bu binada artıq İnkişaf qəhrəmanı təyin olunub." };
  }

  const assignment = {
    heroId: id,
    buildingInstanceId: instanceId,
    buildingId: metnAl(bina.buildingId),
    field: metnAl(inkisaf.field, 64)
  };
  t.development.push(assignment);
  return {
    success: true,
    assignment: { ...assignment },
    modifiers: binaUcunInkIsafModifikatorlariniHesabla(state, instanceId)
  };
}

function inkisafQehremaniniCixar(state, heroId) {
  const t = tapshiriqStateTeminEt(state);
  const id = metnAl(heroId);
  const index = t.development.findIndex(x => x && metnAl(x.heroId) === id);
  if (index < 0) return { success: false, message: "Bu İnkişaf qəhrəmanı heç bir binaya təyin olunmayıb." };
  const [silinen] = t.development.splice(index, 1);
  return { success: true, removedAssignment: { ...silinen } };
}

function tapshiriqMelumatiniHazirla(state) {
  const t = tapshiriqStateTeminEt(state);
  return {
    technology: t.technology ? { ...t.technology } : null,
    resources: t.resources.map(x => ({ ...x })),
    development: t.development.map(x => ({
      ...x,
      modifiers: binaUcunInkIsafModifikatorlariniHesabla(state, x.buildingInstanceId)
    })),
    policies: {
      battleHeroTarget: "konvoy",
      technologyHeroTarget: "tamamlanmis_institut",
      developmentHeroTarget: "qehreman_kataloqunda_icazeli_tamamlanmis_bina",
      oneHeroOneAssignment: true,
      oneDevelopmentHeroPerBuilding: true,
      unapprovedEffectValuesEnabled: false,
      note: "İnkişaf effektləri yalnız qəhrəman kataloqunda təsdiqlənmiş rəqəmlərlə aktiv olur."
    }
  };
}

module.exports = {
  tapshiriqStateTeminEt,
  tapshiriqMelumatiniHazirla,
  qehremanBasqaTapshiriqdadir,
  texnologiyaQehremaniTeyinEt,
  texnologiyaQehremaniniCixar,
  inkisafQehremaniTeyinEt,
  inkisafQehremaniniCixar
};
