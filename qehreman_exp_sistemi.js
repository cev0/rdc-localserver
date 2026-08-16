"use strict";

const { qehremaniTap } = require("./qehreman_kataloqu");
const { EXP_MUKAFATLARI } = require("./qehreman_recruit_qaydalari");
const { qehremanRecruitStateTeminEt } = require("./qehreman_recruit_sistemi");

const QEHRAMAN_MAX_LEVEL = 50;

// Açar = çatılacaq level, dəyər = əvvəlki leveldən həmin levelə keçid EXP-i.
// Məsələn Lv1 -> Lv2 üçün 10 EXP, Lv49 -> Lv50 üçün 9,360,000 EXP.
const QEHRAMAN_EXP_CEDVELI = Object.freeze({
  2: 10,
  3: 50,
  4: 440,
  5: 2500,
  6: 5400,
  7: 7840,
  8: 8960,
  9: 10080,
  10: 12320,
  11: 13440,
  12: 14560,
  13: 47040,
  14: 54880,
  15: 62720,
  16: 70560,
  17: 86240,
  18: 94080,
  19: 101920,
  20: 109760,
  21: 235200,
  22: 329280,
  23: 470400,
  24: 611520,
  25: 705600,
  26: 893760,
  27: 957600,
  28: 1021440,
  29: 1085280,
  30: 1149120,
  31: 1212960,
  32: 1276800,
  33: 1404480,
  34: 1532160,
  35: 2234400,
  36: 2460000,
  37: 2710000,
  38: 2980000,
  39: 3280000,
  40: 3610000,
  41: 3970000,
  42: 4370000,
  43: 4810000,
  44: 5290000,
  45: 5820000,
  46: 6400000,
  47: 7040000,
  48: 7740000,
  49: 8510000,
  50: 9360000
});

function tamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function telebOlunanExp(level, maxLevel = QEHRAMAN_MAX_LEVEL) {
  const limit = Math.min(QEHRAMAN_MAX_LEVEL, Math.max(1, tamEded(maxLevel) || QEHRAMAN_MAX_LEVEL));
  const seviye = Math.min(limit, Math.max(1, tamEded(level) || 1));
  if (seviye >= limit) return 0;
  return tamEded(QEHRAMAN_EXP_CEDVELI[seviye + 1]);
}

function toplamExpTelebi(maxLevel = QEHRAMAN_MAX_LEVEL) {
  const limit = Math.min(QEHRAMAN_MAX_LEVEL, Math.max(1, tamEded(maxLevel) || QEHRAMAN_MAX_LEVEL));
  let toplam = 0;
  for (let nextLevel = 2; nextLevel <= limit; nextLevel++) {
    toplam += tamEded(QEHRAMAN_EXP_CEDVELI[nextLevel]);
  }
  return toplam;
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

  const maxLevel = Math.min(
    QEHRAMAN_MAX_LEVEL,
    Math.max(1, tamEded(definition.maxLevel) || QEHRAMAN_MAX_LEVEL)
  );

  // Köhnə snapshot-da Lv50-dən yuxarı qəhrəman qalıbsa authoritative limitə endir.
  hero.level = Math.min(maxLevel, Math.max(1, tamEded(hero.level) || 1));
  hero.exp = hero.level >= maxLevel ? 0 : tamEded(hero.exp);

  if (hero.level >= maxLevel) {
    return { success: false, message: "Qəhrəman maksimum səviyyədədir." };
  }

  const oldLevel = hero.level;
  const oldExp = hero.exp;
  let qalanExp = Math.max(1, tamEded(item.expValuePerItem)) * istifadeSayi;

  while (qalanExp > 0 && hero.level < maxLevel) {
    const teleb = telebOlunanExp(hero.level, maxLevel);
    if (teleb <= 0) break;

    const catmayan = Math.max(0, teleb - hero.exp);

    if (qalanExp >= catmayan) {
      qalanExp -= catmayan;
      hero.level++;
      hero.exp = 0;
    }
    else {
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
  QEHRAMAN_MAX_LEVEL,
  QEHRAMAN_EXP_CEDVELI,
  telebOlunanExp,
  toplamExpTelebi,
  expItemIstifadeEt
};
