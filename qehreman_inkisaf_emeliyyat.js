"use strict";

const {
  MAKSIMUM_SEVIYYE,
  NOV,
  acilmaQaydasiniAl,
  yukseltmeQaydasiniAl,
  butunQaydalariAl
} = require("./qehreman_inkisaf_qaydalari");

const {
  tamEded,
  qehremanStateTeminEt
} = require("./qehreman_inkisaf_state");

function telebleriYoxla(state, tapilan, requirements) {
  const { qehreman, balances } = tapilan;

  for (const req of requirements || []) {
    const miqdar = tamEded(req && req.miqdar);
    const nov = req && req.nov;

    if (nov === NOV.LEVEL && qehreman.level < miqdar) return { ok: false, reason: "hero_level", need: miqdar, have: qehreman.level };
    if (nov === NOV.PUL && balances.money < miqdar) return { ok: false, reason: "money", need: miqdar, have: balances.money };
    if (nov === NOV.HERO_MEDAL && balances.heroMedals < miqdar) return { ok: false, reason: "hero_medal", need: miqdar, have: balances.heroMedals };
    if (nov === NOV.RARITY_MEDAL && balances.rarityMedals < miqdar) return { ok: false, reason: "rarity_medal", need: miqdar, have: balances.rarityMedals };
    if (nov === NOV.DUPLICATE && balances.duplicateCopies < miqdar) return { ok: false, reason: "same_hero_duplicate", need: miqdar, have: balances.duplicateCopies };
  }

  return { ok: true };
}

function telebleriXercle(state, tapilan, requirements) {
  const { qehreman, progression, rarityKey } = tapilan;
  const spent = [];

  for (const req of requirements || []) {
    const miqdar = tamEded(req && req.miqdar);
    const nov = req && req.nov;
    if (miqdar <= 0 || nov === NOV.LEVEL) continue;

    if (nov === NOV.PUL) state.resources.money = Math.max(0, tamEded(state.resources.money) - miqdar);
    else if (nov === NOV.HERO_MEDAL) qehreman.heroMedalCount = Math.max(0, tamEded(qehreman.heroMedalCount) - miqdar);
    else if (nov === NOV.RARITY_MEDAL) progression.rarityMedals[rarityKey] = Math.max(0, tamEded(progression.rarityMedals[rarityKey]) - miqdar);
    else if (nov === NOV.DUPLICATE) qehreman.duplicateCopies = Math.max(0, tamEded(qehreman.duplicateCopies) - miqdar);
    else continue;

    spent.push({ nov, miqdar });
  }

  return spent;
}

function gorunusuHazirla(state, heroId) {
  const tapilan = qehremanStateTeminEt(state, heroId);
  if (!tapilan) return null;

  const { qehreman, definition, rarityKey } = tapilan;

  const skills = qehreman.skills.map(skill => {
    const acilma = acilmaQaydasiniAl(skill.slotIndex);
    const nextLevel = skill.isUnlocked && skill.skillLevel < MAKSIMUM_SEVIYYE ? skill.skillLevel + 1 : 0;
    const upgradeRequirements = nextLevel ? (yukseltmeQaydasiniAl(nextLevel) || []) : [];
    const unlockCheck = skill.isUnlocked ? { ok: false, reason: "already_unlocked" } : telebleriYoxla(state, tapilan, acilma.requirements);
    const upgradeCheck = !skill.isUnlocked ? { ok: false, reason: "locked" } : nextLevel === 0 ? { ok: false, reason: "max_level" } : telebleriYoxla(state, tapilan, upgradeRequirements);

    return {
      ...skill,
      maxSkillLevel: MAKSIMUM_SEVIYYE,
      unlockRequirements: acilma.requirements,
      canUnlock: unlockCheck.ok === true,
      unlockFailReason: unlockCheck.ok ? "" : unlockCheck.reason,
      nextLevel,
      upgradeRequirements,
      canUpgrade: upgradeCheck.ok === true,
      upgradeFailReason: upgradeCheck.ok ? "" : upgradeCheck.reason
    };
  });

  const yenilenmis = qehremanStateTeminEt(state, heroId);

  return {
    heroId: definition.heroId,
    rarity: definition.rarity,
    level: qehreman.level,
    money: yenilenmis.balances.money,
    heroMedalCount: qehreman.heroMedalCount,
    duplicateCopies: qehreman.duplicateCopies,
    rarityMedalKey: rarityKey,
    rarityMedalCount: yenilenmis.balances.rarityMedals,
    skills,
    rules: butunQaydalariAl()
  };
}

function skillAc(state, heroId, slotIndex) {
  const tapilan = qehremanStateTeminEt(state, heroId);
  const slot = tamEded(slotIndex);
  if (!tapilan) return { success: false, message: "Qəhrəman tapılmadı." };
  if (slot < 1 || slot > 8) return { success: false, message: "Skill slot etibarsızdır." };

  const skill = tapilan.qehreman.skills[slot - 1];
  if (skill.isUnlocked) return { success: false, alreadyUnlocked: true, message: "Skill artıq açıqdır." };

  const qayda = acilmaQaydasiniAl(slot);
  const yoxlama = telebleriYoxla(state, tapilan, qayda.requirements);
  if (!yoxlama.ok) return { success: false, message: "Skill açılma tələbi ödənmir.", failReason: yoxlama.reason, need: yoxlama.need, have: yoxlama.have };

  const spentResources = telebleriXercle(state, tapilan, qayda.requirements);
  skill.isUnlocked = true;
  skill.skillLevel = 1;

  return { success: true, heroId: tapilan.definition.heroId, slotIndex: slot, skillLevel: 1, spentResources };
}

function skillYukselt(state, heroId, slotIndex) {
  const tapilan = qehremanStateTeminEt(state, heroId);
  const slot = tamEded(slotIndex);
  if (!tapilan) return { success: false, message: "Qəhrəman tapılmadı." };
  if (slot < 1 || slot > 8) return { success: false, message: "Skill slot etibarsızdır." };

  const skill = tapilan.qehreman.skills[slot - 1];
  if (!skill.isUnlocked) return { success: false, message: "Skill bağlıdır." };
  if (skill.skillLevel >= MAKSIMUM_SEVIYYE) return { success: false, maxLevel: true, message: "Skill maksimum səviyyədədir." };

  const oldLevel = skill.skillLevel;
  const newLevel = oldLevel + 1;
  const requirements = yukseltmeQaydasiniAl(newLevel) || [];
  const yoxlama = telebleriYoxla(state, tapilan, requirements);
  if (!yoxlama.ok) return { success: false, message: "Skill upgrade tələbi ödənmir.", failReason: yoxlama.reason, need: yoxlama.need, have: yoxlama.have };

  const spentResources = telebleriXercle(state, tapilan, requirements);
  skill.skillLevel = newLevel;

  return { success: true, heroId: tapilan.definition.heroId, slotIndex: slot, oldLevel, newLevel, spentResources };
}

module.exports = {
  gorunusuHazirla,
  skillAc,
  skillYukselt
};
