"use strict";

const { qehremaniTap } = require("./qehreman_kataloqu");
const { EXP_MUKAFATLARI } = require("./qehreman_recruit_qaydalari");
const { qehremanRecruitStateTeminEt } = require("./qehreman_recruit_sistemi");

function tamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function telebOlunanExp(level, maxLevel) {
  const seviye = Math.max(1, tamEded(level) || 1);
  if (seviye >= Math.max(1, tamEded(maxLevel) || 1)) return 0;
  return 100 + ((seviye - 1) * 40);
}

function ownedHeroTap(state, heroId) {
  const acar = String(heroId || "").trim().toLowerCase();
  return state && Array.isArray(state.heroes)
    ? state.heroes.find(x => x && String(x.heroId || "").trim().toLowerCase() === acar) || null
    : null;
}

function expItemIstifadeEt(state, heroId, rewardId, count, nowMs = Date.now()) {
  const recruit = qehremanRecruitStateTeminEt(state, nowMs);
  const definition = qehremaniTap(heroId);
  const hero = ownedHeroTap(state, heroId);
  const item = EXP_MUKAFATLARI[rewardId];
  const istifadeSayi = Math.max(1, tamEded(count));

  if (!definition) return { success: false, message: "Qəhrəman tapılmadı." };
  if (!hero) return { success: false, message: "Qəhrəman oyunçuya məxsus deyil." };
  if (!item) return { success: false, message: "EXP item tapılmadı." };

  const inventar = tamEded(recruit.expItems[rewardId]);
  if (inventar < istifadeSayi) {
    return { success: false, message: "Kifayət qədər EXP item yoxdur." };
  }

  const maxLevel = Math.max(1, tamEded(definition.maxLevel) || 60);
  hero.level = Math.max(1, tamEded(hero.level) || 1);
  hero.exp = tamEded(hero.exp);

  if (hero.level >= maxLevel) {
    return { success: false, message: "Qəhrəman maksimum səviyyədədir." };
  }

  const oldLevel = hero.level;
  const oldExp = hero.exp;
  let qalanExp = Math.max(1, tamEded(item.expValuePerItem)) * istifadeSayi;

  while (qalanExp > 0 && hero.level < maxLevel) {
    const teleb = telebOlunanExp(hero.level, maxLevel);
    const catmayan = Math.max(0, teleb - hero.exp);

    if (qalanExp >= catmayan) {
      qalanExp -= catmayan;
      hero.level++;
      hero.exp = 0;
    } else {
      hero.exp += qalanExp;
      qalanExp = 0;
    }
  }

  if (hero.level >= maxLevel) {
    hero.level = maxLevel;
    hero.exp = 0;
  }

  recruit.expItems[rewardId] = inventar - istifadeSayi;

  return {
    success: true,
    heroId: definition.heroId,
    rewardId,
    usedItemCount: istifadeSayi,
    oldLevel,
    newLevel: hero.level,
    levelsGained: hero.level - oldLevel,
    oldExp,
    newExp: hero.exp,
    requiredExpForNextLevel: telebOlunanExp(hero.level, maxLevel),
    reachedMaxLevel: hero.level >= maxLevel,
    remainingItemCount: recruit.expItems[rewardId]
  };
}

module.exports = {
  telebOlunanExp,
  expItemIstifadeEt
};
