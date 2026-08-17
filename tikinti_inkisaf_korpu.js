"use strict";

const { qehremaniTap } = require("./qehreman_kataloqu");
const {
  INKISAF_SAHESI,
  INKISAF_EFFEKT_NOVU,
  binaUyğundur,
  qehremanInkIsafEffektleriniHesabla
} = require("./qehreman_inkisaf_sistemi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function tamamlanmisBinaTap(state, instanceId) {
  const id = metnAl(instanceId);
  return Array.isArray(state && state.buildings)
    ? state.buildings.find(x => x && metnAl(x.instanceId) === id && x.isCompleted === true) || null
    : null;
}

function tikintiInkIsafEffektleriniHesabla(state) {
  const assignments = state && state.qehremanTapshiriqlari && Array.isArray(state.qehremanTapshiriqlari.development)
    ? state.qehremanTapshiriqlari.development
    : [];

  const effects = [];

  for (const assignment of assignments) {
    if (!assignment) continue;

    const heroId = metnAl(assignment.heroId);
    const definition = qehremaniTap(heroId);
    const inkisaf = definition && definition.inkisaf;

    if (!inkisaf || metnAl(inkisaf.sahesi, 64) !== INKISAF_SAHESI.TIKINTI) continue;

    const assignedBuilding = tamamlanmisBinaTap(state, assignment.buildingInstanceId);
    if (!assignedBuilding || !binaUyğundur(inkisaf, assignedBuilding)) continue;

    const heroEffects = qehremanInkIsafEffektleriniHesabla(state, heroId)
      .filter(x => x && x.type === INKISAF_EFFEKT_NOVU.TIKINTI_SURETI_FAIZ);

    effects.push(...heroEffects);
  }

  const tikintiSuretiFaiz = effects.reduce(
    (cem, effect) => cem + Math.max(0, reqemAl(effect && effect.value)),
    0
  );

  return {
    tikintiSuretiFaiz,
    effects
  };
}

function tikintiMuddetiniHesabla(baseDurationMs, technologySpeedPct, developmentSpeedPct) {
  const baseMs = Math.max(0, Math.round(reqemAl(baseDurationMs)));
  const texnologiyaFaizi = Math.max(0, reqemAl(technologySpeedPct));
  const inkisafFaizi = Math.max(0, reqemAl(developmentSpeedPct));
  const umumiSuretFaizi = texnologiyaFaizi + inkisafFaizi;

  if (baseMs <= 0 || umumiSuretFaizi <= 0) {
    return {
      baseDurationMs: baseMs,
      effectiveDurationMs: baseMs,
      technologySpeedPct: texnologiyaFaizi,
      developmentSpeedPct: inkisafFaizi,
      totalSpeedPct: umumiSuretFaizi
    };
  }

  return {
    baseDurationMs: baseMs,
    effectiveDurationMs: Math.max(0, Math.round(baseMs / (1 + (umumiSuretFaizi / 100)))),
    technologySpeedPct: texnologiyaFaizi,
    developmentSpeedPct: inkisafFaizi,
    totalSpeedPct: umumiSuretFaizi
  };
}

function stateUcunTikintiMuddetiniHesabla(state, baseDurationMs, technologySpeedPct) {
  const inkisaf = tikintiInkIsafEffektleriniHesabla(state);
  const muddet = tikintiMuddetiniHesabla(
    baseDurationMs,
    technologySpeedPct,
    inkisaf.tikintiSuretiFaiz
  );

  return {
    ...muddet,
    developmentEffects: inkisaf.effects
  };
}

module.exports = {
  tikintiInkIsafEffektleriniHesabla,
  tikintiMuddetiniHesabla,
  stateUcunTikintiMuddetiniHesabla
};
