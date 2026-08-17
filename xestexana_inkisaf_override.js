"use strict";

const xestexana = require("./xestexana_sistemi");
const {
  INKISAF_EFFEKT_NOVU,
  binaUcunInkIsafModifikatorlariniHesabla
} = require("./qehreman_inkisaf_sistemi");

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function faizAzalmasiniTetbiqEt(deyer, faiz) {
  const baza = Math.max(0, reqemAl(deyer));
  const temizFaiz = Math.max(0, Math.min(100, reqemAl(faiz)));
  return Math.max(0, Math.ceil(baza * (1 - temizFaiz / 100)));
}

function xestexanaInkIsafModifikatorlariniAl(state, buildingInstanceId) {
  const hesab = binaUcunInkIsafModifikatorlariniHesabla(state, buildingInstanceId);
  const totals = hesab && hesab.totals ? hesab.totals : {};
  return {
    buildingInstanceId: String(buildingInstanceId || "").trim().toLowerCase(),
    healingSpeedPct: Math.max(0, reqemAl(totals[INKISAF_EFFEKT_NOVU.MUALICE_SURETI_FAIZ])),
    healingCostReductionPct: Math.max(0, Math.min(100, reqemAl(totals[INKISAF_EFFEKT_NOVU.MUALICE_XERCI_FAIZ]))),
    hospitalCapacityBonus: Math.max(0, tamEded(totals[INKISAF_EFFEKT_NOVU.XESTEXANA_TUTUMU])),
    effects: Array.isArray(hesab && hesab.effects) ? hesab.effects.map(x => ({ ...x })) : []
  };
}

const esasTutumHesabiniAl = xestexana.xestexanaTutumHesabiniAl;
const esasSagaltmaPreviewHazirla = xestexana.sagaltmaPreviewHazirla;

xestexana.xestexanaTutumHesabiniAl = function(state) {
  const esas = esasTutumHesabiniAl(state);
  const modifier = xestexanaInkIsafModifikatorlariniAl(state, esas.buildingInstanceId);
  const baseCapacity = tamEded(esas.tutum);
  const capacityBonus = tamEded(modifier.hospitalCapacityBonus);
  const totalCapacity = baseCapacity + capacityBonus;
  const wounded = tamEded(esas.yaraliSayi);

  return {
    ...esas,
    formulaVersion: Math.max(3, tamEded(esas.formulaVersion)),
    baseCapacity,
    developmentCapacityBonus: capacityBonus,
    tutum: totalCapacity,
    bosTutum: Math.max(0, totalCapacity - wounded),
    developmentModifier: modifier
  };
};

xestexana.sagaltmaPreviewHazirla = function(state, rawBirlikler) {
  const esas = esasSagaltmaPreviewHazirla(state, rawBirlikler);
  const tutumHesabi = xestexana.xestexanaTutumHesabiniAl(state);
  const modifier = tutumHesabi.developmentModifier || xestexanaInkIsafModifikatorlariniAl(state, tutumHesabi.buildingInstanceId);
  const endirim = Math.max(0, Math.min(100, reqemAl(modifier.healingCostReductionPct)));
  const xerc = {};

  for (const [resursId, rawMiqdar] of Object.entries(esas.xerc || {})) {
    xerc[resursId] = faizAzalmasiniTetbiqEt(rawMiqdar, endirim);
  }

  const resources = state && state.resources && typeof state.resources === "object" ? state.resources : {};
  const resursYetir = Object.entries(xerc).every(([resursId, rawMiqdar]) => (Number(resources[resursId]) || 0) >= tamEded(rawMiqdar));

  return {
    ...esas,
    xerc,
    resursYetir,
    tutumHesabi,
    developmentModifier: modifier,
    healingSpeedApplied: false,
    healingSpeedNote: modifier.healingSpeedPct > 0
      ? "Müalicə sürəti modifier-i hesablanıb, lakin hazırkı sağaltma axını ani olduğuna görə müddətə tətbiq edilmir."
      : ""
  };
};

module.exports = {
  faizAzalmasiniTetbiqEt,
  xestexanaInkIsafModifikatorlariniAl
};
