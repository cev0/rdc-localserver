"use strict";

const SLOT_SAYI = 8;
const MAKSIMUM_SEVIYYE = 10;

const NOV = Object.freeze({
  LEVEL: "hero_level",
  PUL: "money",
  HERO_MEDAL: "hero_medal",
  RARITY_MEDAL: "rarity_medal",
  DUPLICATE: "same_hero_duplicate"
});

function t(nov, miqdar) {
  return { nov, miqdar };
}

const ACILMA = Object.freeze({
  1: [],
  2: [t(NOV.LEVEL, 10)],
  3: [t(NOV.LEVEL, 20), t(NOV.PUL, 100000)],
  4: [t(NOV.LEVEL, 25), t(NOV.PUL, 300000), t(NOV.HERO_MEDAL, 1)],
  5: [t(NOV.LEVEL, 30), t(NOV.HERO_MEDAL, 2)],
  6: [t(NOV.LEVEL, 35), t(NOV.PUL, 1000000), t(NOV.DUPLICATE, 1)],
  7: [t(NOV.LEVEL, 45), t(NOV.RARITY_MEDAL, 10)],
  8: [t(NOV.LEVEL, 50), t(NOV.PUL, 4000000), t(NOV.DUPLICATE, 2), t(NOV.RARITY_MEDAL, 3)]
});

const YUKSELTME = Object.freeze({
  2: [t(NOV.PUL, 10000), t(NOV.HERO_MEDAL, 1)],
  3: [t(NOV.PUL, 15000), t(NOV.HERO_MEDAL, 1)],
  4: [t(NOV.PUL, 20000), t(NOV.HERO_MEDAL, 2)],
  5: [t(NOV.PUL, 25000), t(NOV.HERO_MEDAL, 2)],
  6: [t(NOV.PUL, 30000), t(NOV.HERO_MEDAL, 3)],
  7: [t(NOV.PUL, 35000), t(NOV.HERO_MEDAL, 3)],
  8: [t(NOV.PUL, 40000), t(NOV.HERO_MEDAL, 4)],
  9: [t(NOV.PUL, 45000), t(NOV.HERO_MEDAL, 4)],
  10: [t(NOV.PUL, 50000), t(NOV.HERO_MEDAL, 5)]
});

function acilmaQaydasiniAl(slotIndex) {
  const slot = Number(slotIndex);
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_SAYI) return null;
  return {
    slotIndex: slot,
    unlockedAtStart: slot === 1,
    startingLevel: 1,
    maxLevel: MAKSIMUM_SEVIYYE,
    requirements: (ACILMA[slot] || []).map(x => ({ ...x }))
  };
}

function yukseltmeQaydasiniAl(targetLevel) {
  const level = Number(targetLevel);
  const qayda = YUKSELTME[level];
  return qayda ? qayda.map(x => ({ ...x })) : null;
}

function butunQaydalariAl() {
  return Array.from({ length: SLOT_SAYI }, (_, i) => acilmaQaydasiniAl(i + 1));
}

module.exports = {
  SLOT_SAYI,
  MAKSIMUM_SEVIYYE,
  NOV,
  acilmaQaydasiniAl,
  yukseltmeQaydasiniAl,
  butunQaydalariAl
};
