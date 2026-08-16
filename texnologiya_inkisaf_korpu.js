"use strict";

const {
  INKISAF_EFFEKT_NOVU,
  binaUcunInkIsafModifikatorlariniHesabla
} = require("./qehreman_inkisaf_sistemi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function esasInstituteTap(state) {
  const namizedler = (Array.isArray(state && state.buildings) ? state.buildings : [])
    .filter(x => x && x.isCompleted === true && x.hasRoadAccess !== false && metnAl(x.buildingId) === "institute")
    .map(x => ({
      bina: x,
      level: Math.max(1, Math.trunc(reqemAl(x.level) || 1)),
      instanceId: metnAl(x.instanceId)
    }))
    .filter(x => x.instanceId)
    .sort((a, b) => b.level - a.level || a.instanceId.localeCompare(b.instanceId));

  return namizedler.length > 0 ? namizedler[0].bina : null;
}

function suretFaiziniMuddetSaniyesineTetbiqEt(esasMuddetSaniye, suretFaizi) {
  const esas = Math.max(1, Math.trunc(reqemAl(esasMuddetSaniye) || 1));
  const faiz = Math.max(0, reqemAl(suretFaizi));
  if (faiz <= 0) return esas;

  // +X% sürət => müddət / (1 + X/100). Bu, sürət bonuslarının standart tərs-müddət tətbiqidir.
  return Math.max(1, Math.ceil(esas / (1 + faiz / 100)));
}

function texnologiyaInkIsafModifikatorunuHesabla(state, esasMuddetSaniye) {
  const institute = esasInstituteTap(state);
  const esas = Math.max(1, Math.trunc(reqemAl(esasMuddetSaniye) || 1));

  if (!institute) {
    return {
      instituteInstanceId: null,
      esasMuddetSaniye: esas,
      tedqiqatSuretiFaiz: 0,
      effektivMuddetSaniye: esas,
      effects: []
    };
  }

  const mods = binaUcunInkIsafModifikatorlariniHesabla(state, institute.instanceId);
  const suretFaizi = Math.max(0, reqemAl(mods.totals && mods.totals[INKISAF_EFFEKT_NOVU.TEDQIQAT_SURETI_FAIZ]));

  return {
    instituteInstanceId: metnAl(institute.instanceId),
    esasMuddetSaniye: esas,
    tedqiqatSuretiFaiz: suretFaizi,
    effektivMuddetSaniye: suretFaiziniMuddetSaniyesineTetbiqEt(esas, suretFaizi),
    effects: Array.isArray(mods.effects) ? mods.effects.map(x => ({ ...x })) : []
  };
}

module.exports = {
  esasInstituteTap,
  suretFaiziniMuddetSaniyesineTetbiqEt,
  texnologiyaInkIsafModifikatorunuHesabla
};
