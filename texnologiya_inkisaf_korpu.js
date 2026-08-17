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
  return Math.max(1, Math.ceil(esas / (1 + faiz / 100)));
}

function xercEndiriminiTetbiqEt(esasXerc, endirimFaizi) {
  const faiz = Math.min(100, Math.max(0, reqemAl(endirimFaizi)));
  return (Array.isArray(esasXerc) ? esasXerc : [])
    .map(item => ({
      type: metnAl(item && item.type, 64),
      amount: Math.max(0, Math.ceil(Math.max(0, reqemAl(item && item.amount)) * (100 - faiz) / 100))
    }))
    .filter(item => item.type && item.amount > 0);
}

function texnologiyaInkIsafModifikatorunuHesabla(state, esasMuddetSaniye, esasXerc = []) {
  const institute = esasInstituteTap(state);
  const esas = Math.max(1, Math.trunc(reqemAl(esasMuddetSaniye) || 1));
  const bazaXerc = (Array.isArray(esasXerc) ? esasXerc : []).map(x => ({
    type: metnAl(x && x.type, 64),
    amount: Math.max(0, reqemAl(x && x.amount))
  })).filter(x => x.type && x.amount > 0);

  if (!institute) {
    return {
      instituteInstanceId: null,
      esasMuddetSaniye: esas,
      tedqiqatSuretiFaiz: 0,
      tedqiqatXerciEndirimFaiz: 0,
      effektivMuddetSaniye: esas,
      esasXerc: bazaXerc,
      effektivXerc: bazaXerc.map(x => ({ ...x })),
      effects: []
    };
  }

  const mods = binaUcunInkIsafModifikatorlariniHesabla(state, institute.instanceId);
  const suretFaizi = Math.max(0, reqemAl(mods.totals && mods.totals[INKISAF_EFFEKT_NOVU.TEDQIQAT_SURETI_FAIZ]));
  const xercFaizi = Math.min(100, Math.max(0, reqemAl(mods.totals && mods.totals[INKISAF_EFFEKT_NOVU.TEDQIQAT_XERCI_FAIZ])));

  return {
    instituteInstanceId: metnAl(institute.instanceId),
    esasMuddetSaniye: esas,
    tedqiqatSuretiFaiz: suretFaizi,
    tedqiqatXerciEndirimFaiz: xercFaizi,
    effektivMuddetSaniye: suretFaiziniMuddetSaniyesineTetbiqEt(esas, suretFaizi),
    esasXerc: bazaXerc,
    effektivXerc: xercEndiriminiTetbiqEt(bazaXerc, xercFaizi),
    effects: Array.isArray(mods.effects) ? mods.effects.map(x => ({ ...x })) : []
  };
}

module.exports = {
  esasInstituteTap,
  suretFaiziniMuddetSaniyesineTetbiqEt,
  xercEndiriminiTetbiqEt,
  texnologiyaInkIsafModifikatorunuHesabla
};
