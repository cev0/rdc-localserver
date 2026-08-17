"use strict";

const {
  INKISAF_EFFEKT_NOVU,
  binaUcunInkIsafModifikatorlariniHesabla
} = require("./qehreman_inkisaf_sistemi");

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function binaUcunResursInkIsafiniAl(state, buildingInstanceId) {
  const modifier = binaUcunInkIsafModifikatorlariniHesabla(state, buildingInstanceId);
  const productionPct = Math.max(
    0,
    reqemAl(modifier && modifier.totals && modifier.totals[INKISAF_EFFEKT_NOVU.ISTEHSAL_FAIZ])
  );
  const effects = Array.isArray(modifier && modifier.effects)
    ? modifier.effects.filter(x => x && x.type === INKISAF_EFFEKT_NOVU.ISTEHSAL_FAIZ)
    : [];

  return {
    buildingInstanceId: String(buildingInstanceId || "").trim().toLowerCase(),
    developmentProductionPct: productionPct,
    effects: effects.map(x => ({ ...x }))
  };
}

function istehsalMiqdariniHesabla(baseAmount, technologyProductionPct, developmentProductionPct) {
  const baza = Math.max(0, reqemAl(baseAmount));
  const texnologiya = Math.max(0, reqemAl(technologyProductionPct));
  const inkisaf = Math.max(0, reqemAl(developmentProductionPct));
  const totalProductionPct = texnologiya + inkisaf;

  return {
    baseAmount: baza,
    technologyProductionPct: texnologiya,
    developmentProductionPct: inkisaf,
    totalProductionPct,
    finalAmount: Math.max(0, Math.floor(baza * (100 + totalProductionPct) / 100))
  };
}

function stateUcunBinaIstehsaliniHesabla(state, buildingInstanceId, baseAmount, technologyProductionPct) {
  const inkisaf = binaUcunResursInkIsafiniAl(state, buildingInstanceId);
  const hesab = istehsalMiqdariniHesabla(
    baseAmount,
    technologyProductionPct,
    inkisaf.developmentProductionPct
  );

  return {
    ...hesab,
    developmentEffects: inkisaf.effects
  };
}

module.exports = {
  binaUcunResursInkIsafiniAl,
  istehsalMiqdariniHesabla,
  stateUcunBinaIstehsaliniHesabla
};
