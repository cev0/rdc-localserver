"use strict";

const {
  KONVOY_TUTUM_TEXNOLOGIYA_ID,
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

function legacyTutumLeveliniAl(state) {
  const levels = state && state.technology && state.technology.levels;
  const raw = levels && typeof levels === "object"
    ? levels[KONVOY_TUTUM_TEXNOLOGIYA_ID]
    : 0;
  return Math.max(0, Math.min(4, tamEded(raw)));
}

function legacyTutumuAl(state) {
  return tutumLevelMelumatiniAl(legacyTutumLeveliniAl(state)).capacity;
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

function yeniFormulaKonfiqi() {
  const binaIdleri = siyahiEnv("KONVOY_BINASI_IDLERI");
  const binaTutumCedveli = cedvelEnv("KONVOY_BINASI_TUTUM_CEDVELI");
  const heroLevelBonusu = tamEdedEnv("KONVOY_HERO_LEVEL_TUTUM_BONUSU");
  const skill1Bonusu = tamEdedEnv("KONVOY_SKILL1_TUTUM_BONUSU");
  const skill6Bonusu = tamEdedEnv("KONVOY_SKILL6_TUTUM_BONUSU");

  return {
    binaIdleri,
    binaTutumCedveli,
    heroLevelBonusu,
    skill1Bonusu,
    skill6Bonusu,
    configured:
      binaIdleri.length > 0 &&
      binaTutumCedveli.length > 0 &&
      heroLevelBonusu > 0 &&
      skill1Bonusu > 0 &&
      skill6Bonusu > 0
  };
}

function konvoyTutumHesabiniAl(state, konvoyId) {
  const cfg = yeniFormulaKonfiqi();
  const legacyTutum = legacyTutumuAl(state);
  const konvoy = konvoyuTap(state, konvoyId);
  const bina = completedBinaLeveliniAl(state, cfg.binaIdleri);

  let esasBinaTutumu = 0;
  if (bina.level > 0 && cfg.binaTutumCedveli.length > 0) {
    const index = Math.min(bina.level, cfg.binaTutumCedveli.length) - 1;
    esasBinaTutumu = tamEded(cfg.binaTutumCedveli[index]);
  }

  let qehremanLevelBonusu = 0;
  let skill1Bonusu = 0;
  let skill6Bonusu = 0;
  const qehremanlar = [];

  for (const rawHeroId of Array.isArray(konvoy && konvoy.qehremanIdleri) ? konvoy.qehremanIdleri : []) {
    const hero = heroTap(state, rawHeroId);
    if (!hero) continue;

    const level = Math.max(1, tamEded(hero.level) || 1);
    const skill1Level = skillLeveliniAl(hero, 1);
    const skill6Level = skillLeveliniAl(hero, 6);

    const levelBonus = Math.max(0, level - 1) * cfg.heroLevelBonusu;
    const s1Bonus = skill1Level * cfg.skill1Bonusu;
    const s6Bonus = skill6Level * cfg.skill6Bonusu;

    qehremanLevelBonusu += levelBonus;
    skill1Bonusu += s1Bonus;
    skill6Bonusu += s6Bonus;

    qehremanlar.push({
      heroId: metnAl(hero.heroId, 128),
      level,
      skill1Level,
      skill6Level,
      levelBonus,
      skill1Bonus: s1Bonus,
      skill6Bonus: s6Bonus
    });
  }

  const yeniYekun = esasBinaTutumu + qehremanLevelBonusu + skill1Bonusu + skill6Bonusu;
  const yeniFormulaAktivdir = cfg.configured && bina.level > 0 && yeniYekun > 0;

  return {
    formulaVersion: 2,
    formulaConfigured: cfg.configured,
    formulaActive: yeniFormulaAktivdir,
    pendingReason: cfg.configured
      ? (bina.level > 0 ? "" : "completed_convoy_building_not_found")
      : "convoy_building_and_bonus_balance_not_configured",
    buildingId: bina.buildingId,
    buildingLevel: bina.level,
    esasBinaTutumu,
    qehremanLevelBonusu,
    skill1Bonusu,
    skill6Bonusu,
    yekunTutum: yeniFormulaAktivdir ? yeniYekun : legacyTutum,
    legacyFallbackTutum: legacyTutum,
    legacyFallbackLevel: legacyTutumLeveliniAl(state),
    qehremanlar
  };
}

module.exports = {
  legacyTutumLeveliniAl,
  legacyTutumuAl,
  konvoyTutumHesabiniAl
};
