"use strict";

const { qehremaniTap } = require("./qehreman_kataloqu");
const {
  SKILL_MAKSIMUM_LEVEL,
  releaseClassNormallasdir,
  skillSlotSayiniAl,
  skillSlotEtibarlidir,
  skillWisdomXerciniAl,
  skillUnlockProfiliniAl
} = require("./qehreman_skill_qaydalari");

function tamEded(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function metn(value, max = 128) {
  return typeof value === "string" ? value.trim().slice(0, max).toLowerCase() : "";
}

function ownedHeroTap(state, heroId) {
  const id = metn(heroId, 128);
  return Array.isArray(state && state.heroes)
    ? state.heroes.find(x => x && metn(x.heroId, 128) === id) || null
    : null;
}

function skillMaterialStateTeminEt(state) {
  if (!state || typeof state !== "object") throw new Error("Oyunçu state-i yoxdur.");
  if (!state.heroSkillMaterials || typeof state.heroSkillMaterials !== "object" || Array.isArray(state.heroSkillMaterials)) {
    state.heroSkillMaterials = {};
  }
  const m = state.heroSkillMaterials;
  m.version = 1;
  m.wisdom = tamEded(m.wisdom);
  m.rare = tamEded(m.rare);
  m.epic = tamEded(m.epic);
  m.legendary = tamEded(m.legendary);
  return m;
}

function heroSkillStateTeminEt(hero, definition = null) {
  if (!hero || typeof hero !== "object") return [];
  if (!Array.isArray(hero.skills)) hero.skills = [];
  const maxSlot = definition ? skillSlotSayiniAl(definition) : 8;

  const temiz = [];
  const seen = new Set();
  for (const raw of hero.skills) {
    const slotIndex = Math.trunc(Number(raw && raw.slotIndex) || 0);
    if (slotIndex < 1 || slotIndex > maxSlot || seen.has(slotIndex)) continue;
    seen.add(slotIndex);
    temiz.push({
      slotIndex,
      isUnlocked: raw && raw.isUnlocked === true,
      skillLevel: Math.max(1, Math.min(SKILL_MAKSIMUM_LEVEL, tamEded(raw && raw.skillLevel) || 1))
    });
  }

  if (!seen.has(1)) temiz.push({ slotIndex: 1, isUnlocked: true, skillLevel: 1 });
  for (const skill of temiz) if (skill.slotIndex === 1) skill.isUnlocked = true;

  temiz.sort((a, b) => a.slotIndex - b.slotIndex);
  hero.skills = temiz;
  return hero.skills;
}

function skillTap(hero, slotIndex, definition = null) {
  const slot = Math.trunc(Number(slotIndex) || 0);
  heroSkillStateTeminEt(hero, definition);
  return hero.skills.find(x => x && x.slotIndex === slot) || null;
}

function skillYarat(hero, slotIndex, unlocked, definition) {
  const slot = Math.trunc(Number(slotIndex) || 0);
  if (!skillSlotEtibarlidir(definition, slot)) return null;
  let skill = skillTap(hero, slot, definition);
  if (!skill) {
    skill = { slotIndex: slot, isUnlocked: unlocked === true, skillLevel: 1 };
    hero.skills.push(skill);
    hero.skills.sort((a, b) => a.slotIndex - b.slotIndex);
  }
  return skill;
}

function pulBalansiniAl(state) {
  return state && state.resources && Number.isFinite(Number(state.resources.money))
    ? tamEded(state.resources.money)
    : 0;
}

function unlockTelebBalansi(state, hero, requirement) {
  const materials = skillMaterialStateTeminEt(state);
  return {
    money: pulBalansiniAl(state),
    wisdom: materials.wisdom,
    rare: materials.rare,
    epic: materials.epic,
    legendary: materials.legendary,
    duplicate: tamEded(hero && hero.duplicateCopies),
    requirement: { ...requirement }
  };
}

function telebCatir(balance) {
  const req = balance.requirement || {};
  for (const key of ["money", "wisdom", "rare", "epic", "legendary", "duplicate"]) {
    if (tamEded(balance[key]) < tamEded(req[key])) return false;
  }
  return true;
}

function unlockXerciniCix(state, hero, requirement) {
  const materials = skillMaterialStateTeminEt(state);
  const req = requirement || {};
  state.resources.money = pulBalansiniAl(state) - tamEded(req.money);
  materials.wisdom -= tamEded(req.wisdom);
  materials.rare -= tamEded(req.rare);
  materials.epic -= tamEded(req.epic);
  materials.legendary -= tamEded(req.legendary);
  hero.duplicateCopies = tamEded(hero.duplicateCopies) - tamEded(req.duplicate);
}

function qehremanSkilliniAc(state, heroId, slotIndex) {
  const definition = qehremaniTap(heroId);
  const hero = ownedHeroTap(state, heroId);
  const slot = Math.trunc(Number(slotIndex) || 0);

  if (!definition || !hero) return { success: false, message: "Qəhrəman oyunçuya məxsus deyil." };
  if (!skillSlotEtibarlidir(definition, slot)) {
    return { success: false, message: `Bu nadirlikdə maksimum ${skillSlotSayiniAl(definition)} skill slotu var.` };
  }

  hero.level = Math.max(1, Math.min(50, tamEded(hero.level) || 1));
  const existing = skillTap(hero, slot, definition);
  if (existing && existing.isUnlocked === true) {
    return { success: true, alreadyUnlocked: true, heroId: definition.heroId, slotIndex: slot, skillLevel: existing.skillLevel };
  }

  const requirement = skillUnlockProfiliniAl(definition, slot);
  if (!requirement) {
    return {
      success: false,
      profileConfigured: false,
      message: "Bu qəhrəman nadirliyi üçün skill açılma balansı hələ tam təsdiqlənməyib. Server rəqəm uydurmur."
    };
  }

  if (hero.level < tamEded(requirement.heroLevel)) {
    return { success: false, profileConfigured: true, message: `Qəhrəman Lv${requirement.heroLevel} olmalıdır.`, requirement };
  }

  const balance = unlockTelebBalansi(state, hero, requirement);
  if (!telebCatir(balance)) {
    return { success: false, profileConfigured: true, message: "Skill açmaq üçün tələb olunan pul və ya medallar kifayət deyil.", balance };
  }

  unlockXerciniCix(state, hero, requirement);
  const skill = skillYarat(hero, slot, true, definition);
  skill.isUnlocked = true;
  skill.skillLevel = Math.max(1, tamEded(skill.skillLevel) || 1);

  return {
    success: true,
    alreadyUnlocked: false,
    heroId: definition.heroId,
    slotIndex: slot,
    skillLevel: skill.skillLevel,
    spent: { ...requirement },
    materials: { ...skillMaterialStateTeminEt(state) },
    money: pulBalansiniAl(state),
    duplicateCopies: tamEded(hero.duplicateCopies)
  };
}

function qehremanSkilliniYukselt(state, heroId, slotIndex) {
  const definition = qehremaniTap(heroId);
  const hero = ownedHeroTap(state, heroId);
  const slot = Math.trunc(Number(slotIndex) || 0);
  if (!definition || !hero) return { success: false, message: "Qəhrəman oyunçuya məxsus deyil." };
  if (!skillSlotEtibarlidir(definition, slot)) {
    return { success: false, message: `Bu nadirlikdə maksimum ${skillSlotSayiniAl(definition)} skill slotu var.` };
  }

  const skill = skillTap(hero, slot, definition);
  if (!skill || skill.isUnlocked !== true) return { success: false, message: "Skill hələ açılmayıb." };
  if (skill.skillLevel >= SKILL_MAKSIMUM_LEVEL) return { success: false, message: "Skill maksimum Lv10 səviyyəsindədir." };

  const oldLevel = skill.skillLevel;
  const newLevel = oldLevel + 1;
  const wisdomCost = skillWisdomXerciniAl(definition.rarity, newLevel);
  if (wisdomCost <= 0) return { success: false, message: "Bu nadirlik üçün skill inkişaf xərci tapılmadı." };

  const materials = skillMaterialStateTeminEt(state);
  if (materials.wisdom < wisdomCost) {
    return { success: false, message: `Kifayət qədər Hikmət medalı yoxdur. Tələb: ${wisdomCost}.`, wisdomCost, wisdomBalance: materials.wisdom };
  }

  materials.wisdom -= wisdomCost;
  skill.skillLevel = newLevel;

  return {
    success: true,
    heroId: definition.heroId,
    slotIndex: slot,
    oldLevel,
    newLevel,
    wisdomCost,
    wisdomBalance: materials.wisdom
  };
}

function qehremanSkillMelumatiniHazirla(state, heroId) {
  const definition = qehremaniTap(heroId);
  const hero = ownedHeroTap(state, heroId);
  if (!definition || !hero) return { success: false, message: "Qəhrəman oyunçuya məxsus deyil." };

  hero.level = Math.max(1, Math.min(50, tamEded(hero.level) || 1));
  heroSkillStateTeminEt(hero, definition);
  const materials = skillMaterialStateTeminEt(state);
  const skills = [];
  const slotCount = skillSlotSayiniAl(definition);

  for (let slot = 1; slot <= slotCount; slot++) {
    const skill = skillTap(hero, slot, definition);
    const requirement = skillUnlockProfiliniAl(definition, slot);
    const unlocked = !!skill && skill.isUnlocked === true;
    const skillLevel = unlocked ? skill.skillLevel : 1;
    const nextLevel = Math.min(SKILL_MAKSIMUM_LEVEL, skillLevel + 1);
    skills.push({
      slotIndex: slot,
      isUnlocked: unlocked,
      skillLevel,
      maxSkillLevel: SKILL_MAKSIMUM_LEVEL,
      unlockProfileConfigured: !!requirement,
      unlockRequirement: requirement,
      nextUpgradeWisdomCost: unlocked && skillLevel < SKILL_MAKSIMUM_LEVEL
        ? skillWisdomXerciniAl(definition.rarity, nextLevel)
        : 0
    });
  }

  return {
    success: true,
    heroId: definition.heroId,
    rarity: definition.rarity,
    releaseClass: releaseClassNormallasdir(definition.releaseClass),
    heroLevel: hero.level,
    skillSlotCount: slotCount,
    duplicateCopies: tamEded(hero.duplicateCopies),
    money: pulBalansiniAl(state),
    materials: { ...materials },
    skills
  };
}

module.exports = {
  skillMaterialStateTeminEt,
  heroSkillStateTeminEt,
  qehremanSkilliniAc,
  qehremanSkilliniYukselt,
  qehremanSkillMelumatiniHazirla
};
