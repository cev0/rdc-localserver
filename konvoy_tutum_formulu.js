"use strict";

const {
  tutumLevelMelumatiniAl
} = require("./konvoy_tutum_qaydalari");

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function siyahiEnv(ad) {
  return String(process.env[ad] || "")
    .split(",")
    .map(x => metnAl(x, 128))
    .filter(Boolean);
}

function tamEdedEnv(ad) {
  const n = Number(process.env[ad]);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function cedvelEnv(ad) {
  const raw = String(process.env[ad] || "").trim();
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(tamEded) : [];
  }
  catch (_) {
    return [];
  }
}

function legacyTutumLeveliniAl() {
  return 0;
}

function legacyTutumuAl() {
  return tutumLevelMelumatiniAl(0).capacity;
}

function heroTap(state, heroId) {
  const id = metnAl(heroId, 128);
  return Array.isArray(state && state.heroes)
    ? state.heroes.find(x => x && metnAl(x.heroId, 128) === id) || null
    : null;
}

function skillLeveliniAl(hero, slotIndex) {
  if (!hero || !Array.isArray(hero.skills)) return 0;
  const skill = hero.skills.find(x => x && tamEded(x.slotIndex) === slotIndex);
  if (!skill || skill.isUnlocked === false) return 0;
  return Math.max(0, tamEded(skill.skillLevel));
}

function konvoyuTap(state, konvoyId) {
  const id = metnAl(konvoyId, 64);
  const items = state && state.konvoylar && Array.isArray(state.konvoylar.items)
    ? state.konvoylar.items
    : [];
  return items.find(x => x && metnAl(x.konvoyId, 64) === id) || null;
}

function completedBinaLeveliniAl(state, binaIdleri) {
  if (!Array.isArray(state && state.buildings) || !Array.isArray(binaIdleri) || binaIdleri.length === 0) {
    return { buildingId: "", level: 0 };
  }

  let netice = { buildingId: "", level: 0 };
  for (const bina of state.buildings) {
    if (!bina || bina.isCompleted !== true) continue;
    const id = metnAl(bina.buildingId, 128);
    if (!binaIdleri.includes(id)) continue;
    const level = Math.max(1, tamEded(bina.level) || 1);
    if (level > netice.level) netice = { buildingId: id, level };
  }
  return netice;
}

function cedveldenSeviyeDeyeriniAl(cedvel, level) {
  const seviye = Math.max(0, tamEded(level));
  if (seviye <= 0 || !Array.isArray(cedvel) || cedvel.length === 0) return 0;
  const index = Math.min(seviye, cedvel.length) - 1;
  return tamEded(cedvel[index]);
}

function yeniFormulaKonfiqi() {
  const binaIdleri = siyahiEnv("KONVOY_BINASI_IDLERI");
  const binaTutumCedveli = cedvelEnv("KONVOY_BINASI_TUTUM_CEDVELI");
  const heroLevelTutumCedveli = cedvelEnv("KONVOY_HERO_LEVEL_TUTUM_CEDVELI");
  const heroLevelBonusu = tamEdedEnv("KONVOY_HERO_LEVEL_TUTUM_BONUSU");
  const skill1TutumCedveli = cedvelEnv("KONVOY_SKILL1_TUTUM_CEDVELI");
  const skill6LiderlikFaizCedveli = cedvelEnv("KONVOY_SKILL6_LIDERLIK_FAIZ_CEDVELI");

  const heroLevelConfigured = heroLevelTutumCedveli.length > 0 || heroLevelBonusu > 0;

  return {
    binaIdleri,
    binaTutumCedveli,
    heroLevelTutumCedveli,
    heroLevelBonusu,
    skill1TutumCedveli,
    skill6LiderlikFaizCedveli,
    configured:
      binaIdleri.length > 0 &&
      binaTutumCedveli.length > 0 &&
      heroLevelConfigured &&
      skill1TutumCedveli.length >= 10 &&
      skill6LiderlikFaizCedveli.length >= 10
  };
}

function heroLevelTutumBonusunuAl(cfg, level) {
  if (cfg.heroLevelTutumCedveli.length > 0) {
    return cedveldenSeviyeDeyeriniAl(cfg.heroLevelTutumCedveli, level);
  }
  return Math.max(0, Math.max(1, tamEded(level) || 1) - 1) * cfg.heroLevelBonusu;
}

function konvoyTutumHesabiniAl(state, konvoyId) {
  const cfg = yeniFormulaKonfiqi();
  const fallbackTutum = legacyTutumuAl();
  const konvoy = konvoyuTap(state, konvoyId);
  const bina = completedBinaLeveliniAl(state, cfg.binaIdleri);

  let esasBinaTutumu = 0;
  if (bina.level > 0 && cfg.binaTutumCedveli.length > 0) {
    esasBinaTutumu = cedveldenSeviyeDeyeriniAl(cfg.binaTutumCedveli, bina.level);
  }

  let qehremanLevelBonusu = 0;
  let skill1EsasBonusu = 0;
  let skill6LiderlikBonusu = 0;
  const qehremanlar = [];

  for (const rawHeroId of Array.isArray(konvoy && konvoy.qehremanIdleri) ? konvoy.qehremanIdleri : []) {
    const hero = heroTap(state, rawHeroId);
    if (!hero) continue;

    const level = Math.max(1, tamEded(hero.level) || 1);
    const skill1Level = skillLeveliniAl(hero, 1);
    const skill6Level = skillLeveliniAl(hero, 6);

    const levelBonus = heroLevelTutumBonusunuAl(cfg, level);
    const s1EsasBonus = cedveldenSeviyeDeyeriniAl(cfg.skill1TutumCedveli, skill1Level);
    const s6LiderlikFaizi = cedveldenSeviyeDeyeriniAl(cfg.skill6LiderlikFaizCedveli, skill6Level);
    const s6LiderlikBonusu = Math.floor((s1EsasBonus * s6LiderlikFaizi) / 100);

    qehremanLevelBonusu += levelBonus;
    skill1EsasBonusu += s1EsasBonus;
    skill6LiderlikBonusu += s6LiderlikBonusu;

    qehremanlar.push({
      heroId: metnAl(hero.heroId, 128),
      level,
      skill1Level,
      skill6Level,
      levelBonus,
      skill1EsasBonus: s1EsasBonus,
      skill6LiderlikFaizi: s6LiderlikFaizi,
      skill6LiderlikBonusu: s6LiderlikBonusu,
      heroTutumCemi: levelBonus + s1EsasBonus + s6LiderlikBonusu
    });
  }

  const yeniYekun = esasBinaTutumu + qehremanLevelBonusu + skill1EsasBonusu + skill6LiderlikBonusu;
  const yeniFormulaAktivdir = cfg.configured && bina.level > 0 && yeniYekun > 0;

  return {
    formulaVersion: 3,
    formulaConfigured: cfg.configured,
    formulaActive: yeniFormulaAktivdir,
    pendingReason: cfg.configured
      ? (bina.level > 0 ? "" : "completed_convoy_building_not_found")
      : "convoy_building_hero_level_skill1_skill6_tables_not_configured",
    buildingId: bina.buildingId,
    buildingLevel: bina.level,
    esasBinaTutumu,
    qehremanLevelBonusu,
    skill1EsasBonusu,
    skill6LiderlikBonusu,
    yekunTutum: yeniFormulaAktivdir ? yeniYekun : fallbackTutum,
    legacyFallbackTutum: fallbackTutum,
    legacyFallbackLevel: 0,
    legacyCapacityTechnologyDisabled: true,
    qehremanlar
  };
}

module.exports = {
  legacyTutumLeveliniAl,
  legacyTutumuAl,
  konvoyTutumHesabiniAl
};
