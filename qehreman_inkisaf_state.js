"use strict";

const { qehremaniTap, QEHRAMAN_NADIRLIK } = require("./qehreman_kataloqu");
const { SLOT_SAYI, MAKSIMUM_SEVIYYE } = require("./qehreman_inkisaf_qaydalari");

function tamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum).toLowerCase() : "";
}

function nadirlikAcariniAl(rarity) {
  switch (Number(rarity)) {
    case QEHRAMAN_NADIRLIK.GOY: return "goy";
    case QEHRAMAN_NADIRLIK.BENOVSEYI: return "benovseyi";
    case QEHRAMAN_NADIRLIK.NARINCI: return "narinci";
    default: return "yasil";
  }
}

function inkisafStateTeminEt(state) {
  if (!state || typeof state !== "object") throw new Error("Qəhrəman inkişaf state-i yoxdur.");

  if (!state.heroProgression || typeof state.heroProgression !== "object" || Array.isArray(state.heroProgression)) {
    state.heroProgression = {};
  }

  const progression = state.heroProgression;
  progression.version = 1;

  if (!progression.rarityMedals || typeof progression.rarityMedals !== "object" || Array.isArray(progression.rarityMedals)) {
    progression.rarityMedals = {};
  }

  for (const acar of ["yasil", "goy", "benovseyi", "narinci"]) {
    progression.rarityMedals[acar] = tamEded(progression.rarityMedals[acar]);
  }

  return progression;
}

function ownedQehremaniTap(state, heroId) {
  const id = metnAl(heroId);
  if (!id || !state || !Array.isArray(state.heroes)) return null;
  return state.heroes.find(x => x && metnAl(x.heroId) === id) || null;
}

function qehremanStateTeminEt(state, heroId) {
  const progression = inkisafStateTeminEt(state);
  const qehreman = ownedQehremaniTap(state, heroId);
  if (!qehreman) return null;

  const definition = qehremaniTap(qehreman.heroId);
  if (!definition) return null;

  qehreman.level = Math.max(1, tamEded(qehreman.level) || 1);
  qehreman.duplicateCopies = tamEded(qehreman.duplicateCopies);
  qehreman.heroMedalCount = tamEded(qehreman.heroMedalCount);

  const movcud = Array.isArray(qehreman.skills) ? qehreman.skills : [];
  const skills = [];

  for (let slot = 1; slot <= SLOT_SAYI; slot++) {
    const evvelki = movcud.find(x => x && tamEded(x.slotIndex) === slot);
    const aciqdir = slot === 1 || (evvelki && evvelki.isUnlocked === true);
    skills.push({
      slotIndex: slot,
      isUnlocked: aciqdir,
      skillLevel: aciqdir
        ? Math.max(1, Math.min(MAKSIMUM_SEVIYYE, tamEded(evvelki && evvelki.skillLevel) || 1))
        : 0
    });
  }

  qehreman.skills = skills;
  const rarityKey = nadirlikAcariniAl(definition.rarity);

  return {
    qehreman,
    definition,
    progression,
    rarityKey,
    balances: {
      money: tamEded(state.resources && state.resources.money),
      heroMedals: qehreman.heroMedalCount,
      duplicateCopies: qehreman.duplicateCopies,
      rarityMedals: tamEded(progression.rarityMedals[rarityKey])
    }
  };
}

function qehremanMedaliElaveEt(state, heroId, miqdar) {
  const tapilan = qehremanStateTeminEt(state, heroId);
  if (!tapilan) return 0;
  tapilan.qehreman.heroMedalCount += tamEded(miqdar);
  return tapilan.qehreman.heroMedalCount;
}

function nadirlikMedaliElaveEt(state, rarity, miqdar) {
  const progression = inkisafStateTeminEt(state);
  const acar = nadirlikAcariniAl(rarity);
  progression.rarityMedals[acar] += tamEded(miqdar);
  return progression.rarityMedals[acar];
}

module.exports = {
  tamEded,
  inkisafStateTeminEt,
  qehremanStateTeminEt,
  qehremanMedaliElaveEt,
  nadirlikMedaliElaveEt
};
