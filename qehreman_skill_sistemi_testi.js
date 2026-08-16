"use strict";

const assert = require("assert");
const { QEHRAMAN_NADIRLIK } = require("./qehreman_kataloqu");
const {
  skillWisdomCeminiAl,
  skillWisdomXerciniAl,
  skillUnlockProfiliniAl
} = require("./qehreman_skill_qaydalari");
const {
  qehremanSkilliniAc,
  qehremanSkilliniYukselt,
  qehremanSkillMelumatiniHazirla
} = require("./qehreman_skill_sistemi");

assert.strictEqual(skillWisdomCeminiAl(QEHRAMAN_NADIRLIK.YASIL), 395);
assert.strictEqual(skillWisdomCeminiAl(QEHRAMAN_NADIRLIK.GOY), 555);
assert.strictEqual(skillWisdomCeminiAl(QEHRAMAN_NADIRLIK.BENOVSEYI), 830);
assert.strictEqual(skillWisdomCeminiAl(QEHRAMAN_NADIRLIK.NARINCI), 1245);
assert.strictEqual(skillWisdomXerciniAl(QEHRAMAN_NADIRLIK.NARINCI, 2), 20);
assert.strictEqual(skillWisdomXerciniAl(QEHRAMAN_NADIRLIK.NARINCI, 10), 400);

const normal7 = skillUnlockProfiliniAl({ rarity: QEHRAMAN_NADIRLIK.NARINCI, releaseClass: "normal" }, 7);
assert.deepStrictEqual(normal7, { heroLevel: 45, money: 2000000, wisdom: 0, rare: 0, epic: 2, legendary: 0, duplicate: 0 });

const s7 = skillUnlockProfiliniAl({ rarity: QEHRAMAN_NADIRLIK.NARINCI, releaseClass: "s" }, 7);
assert.deepStrictEqual(s7, { heroLevel: 45, money: 2000000, wisdom: 0, rare: 0, epic: 0, legendary: 1, duplicate: 1 });
const sp8 = skillUnlockProfiliniAl({ rarity: QEHRAMAN_NADIRLIK.NARINCI, releaseClass: "sp" }, 8);
assert.deepStrictEqual(sp8, { heroLevel: 50, money: 4000000, wisdom: 0, rare: 0, epic: 0, legendary: 2, duplicate: 1 });

const state = {
  resources: { money: 10000000 },
  heroSkillMaterials: { wisdom: 1000, rare: 30, epic: 20, legendary: 10 },
  heroes: [{ heroId: "feroman", level: 50, exp: 0, duplicateCopies: 5 }]
};

let result = qehremanSkilliniAc(state, "feroman", 2);
assert.strictEqual(result.success, true);
assert.strictEqual(state.resources.money, 9800000);
assert.strictEqual(state.heroSkillMaterials.wisdom, 950);

result = qehremanSkilliniYukselt(state, "feroman", 2);
assert.strictEqual(result.success, true);
assert.strictEqual(result.oldLevel, 1);
assert.strictEqual(result.newLevel, 2);
assert.strictEqual(result.wisdomCost, 20);
assert.strictEqual(state.heroSkillMaterials.wisdom, 930);

result = qehremanSkilliniAc(state, "feroman", 6);
assert.strictEqual(result.success, true);
assert.strictEqual(state.heroes[0].duplicateCopies, 4);
assert.strictEqual(state.heroSkillMaterials.rare, 20);

result = qehremanSkilliniAc(state, "feroman", 7);
assert.strictEqual(result.success, true);
assert.strictEqual(state.heroes[0].duplicateCopies, 4);
assert.strictEqual(state.heroSkillMaterials.epic, 18);

result = qehremanSkilliniAc(state, "feroman", 8);
assert.strictEqual(result.success, true);
assert.strictEqual(state.heroes[0].duplicateCopies, 4);
assert.strictEqual(state.heroSkillMaterials.legendary, 7);

const info = qehremanSkillMelumatiniHazirla(state, "feroman");
assert.strictEqual(info.success, true);
assert.strictEqual(info.skills.length, 8);
assert.strictEqual(info.skills[1].isUnlocked, true);
assert.strictEqual(info.skills[1].skillLevel, 2);
assert.strictEqual(info.skills[1].nextUpgradeWisdomCost, 30);

const lowerRarityState = {
  resources: { money: 9999999 },
  heroSkillMaterials: { wisdom: 9999, rare: 99, epic: 99, legendary: 99 },
  heroes: [{ heroId: "doyuscu", level: 50, duplicateCopies: 99 }]
};
result = qehremanSkilliniAc(lowerRarityState, "doyuscu", 2);
assert.strictEqual(result.success, false);
assert.strictEqual(result.profileConfigured, false);

console.log("Qəhrəman skill progression testləri uğurla keçdi.");
