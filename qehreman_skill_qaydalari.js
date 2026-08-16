"use strict";

const { QEHRAMAN_NADIRLIK } = require("./qehreman_kataloqu");

const QEHRAMAN_RELEASE_CLASS = Object.freeze({
  NORMAL: "normal",
  S: "s",
  SP: "sp"
});

const SKILL_MAKSIMUM_LEVEL = 10;

const SKILL_WISDOM_XERCI = Object.freeze({
  [QEHRAMAN_NADIRLIK.YASIL]: Object.freeze([0, 0, 5, 10, 15, 20, 30, 40, 60, 90, 125]),
  [QEHRAMAN_NADIRLIK.GOY]: Object.freeze([0, 0, 10, 15, 20, 30, 40, 60, 85, 120, 175]),
  [QEHRAMAN_NADIRLIK.BENOVSEYI]: Object.freeze([0, 0, 15, 20, 30, 40, 60, 90, 125, 180, 270]),
  [QEHRAMAN_NADIRLIK.NARINCI]: Object.freeze([0, 0, 20, 30, 45, 60, 90, 130, 200, 270, 400])
});

const NARINCI_NORMAL_UNLOCK = Object.freeze({
  1: Object.freeze({ heroLevel: 1, money: 0, wisdom: 0, rare: 0, epic: 0, legendary: 0, duplicate: 0 }),
  2: Object.freeze({ heroLevel: 6, money: 200000, wisdom: 50, rare: 0, epic: 0, legendary: 0, duplicate: 0 }),
  3: Object.freeze({ heroLevel: 12, money: 300000, wisdom: 100, rare: 3, epic: 0, legendary: 0, duplicate: 0 }),
  4: Object.freeze({ heroLevel: 20, money: 400000, wisdom: 0, rare: 5, epic: 10, legendary: 0, duplicate: 0 }),
  5: Object.freeze({ heroLevel: 25, money: 600000, wisdom: 0, rare: 7, epic: 0, legendary: 1, duplicate: 0 }),
  6: Object.freeze({ heroLevel: 35, money: 1000000, wisdom: 0, rare: 10, epic: 0, legendary: 0, duplicate: 1 }),
  7: Object.freeze({ heroLevel: 45, money: 2000000, wisdom: 0, rare: 0, epic: 2, legendary: 0, duplicate: 0 }),
  8: Object.freeze({ heroLevel: 50, money: 4000000, wisdom: 0, rare: 0, epic: 0, legendary: 3, duplicate: 0 })
});

const NARINCI_SEASON_UNLOCK = Object.freeze({
  1: NARINCI_NORMAL_UNLOCK[1],
  2: NARINCI_NORMAL_UNLOCK[2],
  3: NARINCI_NORMAL_UNLOCK[3],
  4: NARINCI_NORMAL_UNLOCK[4],
  5: NARINCI_NORMAL_UNLOCK[5],
  6: NARINCI_NORMAL_UNLOCK[6],
  7: Object.freeze({ heroLevel: 45, money: 2000000, wisdom: 0, rare: 0, epic: 0, legendary: 1, duplicate: 1 }),
  8: Object.freeze({ heroLevel: 50, money: 4000000, wisdom: 0, rare: 0, epic: 0, legendary: 2, duplicate: 1 })
});

function releaseClassNormallasdir(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === QEHRAMAN_RELEASE_CLASS.S) return QEHRAMAN_RELEASE_CLASS.S;
  if (raw === QEHRAMAN_RELEASE_CLASS.SP) return QEHRAMAN_RELEASE_CLASS.SP;
  return QEHRAMAN_RELEASE_CLASS.NORMAL;
}

function skillWisdomXerciniAl(rarity, hedefLevel) {
  const level = Math.max(1, Math.min(SKILL_MAKSIMUM_LEVEL, Math.trunc(Number(hedefLevel) || 1)));
  const table = SKILL_WISDOM_XERCI[Number(rarity)];
  return Array.isArray(table) ? Math.max(0, Number(table[level]) || 0) : 0;
}

function skillWisdomCeminiAl(rarity) {
  const table = SKILL_WISDOM_XERCI[Number(rarity)];
  if (!Array.isArray(table)) return 0;
  return table.reduce((sum, value, index) => index >= 2 ? sum + (Number(value) || 0) : sum, 0);
}

function skillUnlockProfiliniAl(definition, slotIndex) {
  const slot = Math.trunc(Number(slotIndex) || 0);
  if (!definition || slot < 1 || slot > 8) return null;

  // Hazırda tam təsdiqlənmiş unlock cədvəli yalnız narıncı döyüş qəhrəmanları üçündür.
  // Aşağı rarity-lər üçün rəqəm uydurulmur; ayrıca data gələnədək unlock API onları bloklayır.
  if (Number(definition.rarity) !== QEHRAMAN_NADIRLIK.NARINCI) return null;

  const releaseClass = releaseClassNormallasdir(definition.releaseClass);
  const profile = releaseClass === QEHRAMAN_RELEASE_CLASS.NORMAL
    ? NARINCI_NORMAL_UNLOCK
    : NARINCI_SEASON_UNLOCK;

  return profile[slot] ? { ...profile[slot] } : null;
}

module.exports = {
  QEHRAMAN_RELEASE_CLASS,
  SKILL_MAKSIMUM_LEVEL,
  SKILL_WISDOM_XERCI,
  NARINCI_NORMAL_UNLOCK,
  NARINCI_SEASON_UNLOCK,
  releaseClassNormallasdir,
  skillWisdomXerciniAl,
  skillWisdomCeminiAl,
  skillUnlockProfiliniAl
};
