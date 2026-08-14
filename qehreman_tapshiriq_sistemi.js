"use strict";

const {
  QEHRAMAN_ISTIFADE_SAHESI,
  qehremaniTap
} = require("./qehreman_kataloqu");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function sahibdir(state, heroId) {
  const id = metnAl(heroId);
  return Array.isArray(state && state.heroes) && state.heroes.some(x => metnAl(x && x.heroId) === id);
}

function tapshiriqStateTeminEt(state) {
  if (!state.qehremanTapshiriqlari || typeof state.qehremanTapshiriqlari !== "object" || Array.isArray(state.qehremanTapshiriqlari)) {
    state.qehremanTapshiriqlari = { version: 1, technology: null, resources: [] };
  }
  state.qehremanTapshiriqlari.version = 1;
  if (!Array.isArray(state.qehremanTapshiriqlari.resources)) state.qehremanTapshiriqlari.resources = [];
  if (state.qehremanTapshiriqlari.technology && typeof state.qehremanTapshiriqlari.technology !== "object") {
    state.qehremanTapshiriqlari.technology = null;
  }
  return state.qehremanTapshiriqlari;
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
    return { success: false, message: "Tamamlanmış Institute tələb olunur." };
  }

  const t = tapshiriqStateTeminEt(state);
  if (t.technology) return { success: false, message: "Institute-də artıq qəhrəman təyin olunub." };
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

function tapshiriqMelumatiniHazirla(state) {
  const t = tapshiriqStateTeminEt(state);
  return {
    technology: t.technology ? { ...t.technology } : null,
    resources: t.resources.map(x => ({ ...x })),
    policies: {
      battleHeroTarget: "convoy",
      technologyHeroTarget: "completed_institute",
      resourceHeroTarget: "resource_building",
      resourceAssignmentEnabled: false,
      note: "Resource building whitelist/effects are intentionally not enabled until producer IDs are finalized."
    }
  };
}

module.exports = {
  tapshiriqStateTeminEt,
  tapshiriqMelumatiniHazirla,
  texnologiyaQehremaniTeyinEt,
  texnologiyaQehremaniniCixar
};
