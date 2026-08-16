"use strict";

const buildingDefinitionsRaw = require("./building_definitions.json");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function faizAl() {
  const raw = Number(process.env.PVP_STORAGE_PROTECTION_PERCENT);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, raw));
}

function definitionListiniAl(definitionsRaw = buildingDefinitionsRaw) {
  if (Array.isArray(definitionsRaw)) return definitionsRaw;
  if (definitionsRaw && Array.isArray(definitionsRaw.definitions)) return definitionsRaw.definitions;
  return [];
}

function definitionXeritesiniAl(definitionsRaw = buildingDefinitionsRaw) {
  const map = new Map();
  for (const def of definitionListiniAl(definitionsRaw)) {
    const id = metnAl(def && def.id, 128);
    if (id) map.set(id, def);
  }
  return map;
}

function tamamlanmisBina(bina) {
  return !!bina && bina.isCompleted !== false && bina.isPlaced !== false;
}

function levelMelumatiniAl(def, level) {
  const wanted = Math.max(1, tamEded(level) || 1);
  const levels = Array.isArray(def && def.levels) ? def.levels : [];
  return levels.find(x => tamEded(x && x.level) === wanted) || null;
}

function anbarTutumBazisiniHesabla(state, definitionsRaw = buildingDefinitionsRaw) {
  const defs = definitionXeritesiniAl(definitionsRaw);
  const byResource = {};
  const contributions = [];

  for (const bina of Array.isArray(state && state.buildings) ? state.buildings : []) {
    if (!tamamlanmisBina(bina)) continue;
    const buildingId = metnAl(bina.buildingId, 128);
    const def = defs.get(buildingId);
    if (!def || def.providesStorage !== true) continue;

    const resourceId = metnAl(def.storageResource, 64);
    if (!resourceId || resourceId === "none") continue;

    const level = Math.max(1, tamEded(bina.level) || 1);
    const levelInfo = levelMelumatiniAl(def, level);
    const capacity = tamEded(levelInfo && levelInfo.storageCapacityBonus);
    if (capacity <= 0) continue;

    byResource[resourceId] = tamEded(byResource[resourceId]) + capacity;
    contributions.push({ buildingId, level, resourceId, storageCapacityBonus: capacity });
  }

  return {
    version: 1,
    byResource,
    contributions
  };
}

function anbarPvpQorumasiniHesabla(state, definitionsRaw = buildingDefinitionsRaw) {
  const percent = faizAl();
  const basis = anbarTutumBazisiniHesabla(state, definitionsRaw);
  const byResource = {};

  for (const [resourceId, capacity] of Object.entries(basis.byResource)) {
    byResource[resourceId] = Math.floor(tamEded(capacity) * percent / 100);
  }

  return {
    version: 1,
    enabled: percent > 0,
    protectionPercent: percent,
    storageBasisByResource: basis.byResource,
    byResource,
    contributions: basis.contributions
  };
}

module.exports = {
  faizAl,
  definitionListiniAl,
  anbarTutumBazisiniHesabla,
  anbarPvpQorumasiniHesabla
};
