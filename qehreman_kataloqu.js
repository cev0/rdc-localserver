"use strict";

// ============================================================
// QƏHRƏMAN KATALOQU
// ------------------------------------------------------------
// Bu ID-lər Unity-dəki HeroDefinition asset-ləri ilə 1:1 eynidir.
// Server yalnız gameplay identity/classification saxlayır.
// Vizual, portret və lokalizasiya Unity asset-lərində qalır.
// ============================================================

const QEHRAMAN_NADIRLIK = Object.freeze({
  YASIL: 0,
  GOY: 1,
  BENOVSEYI: 2,
  NARINCI: 3
});

const QEHRAMANLAR = Object.freeze([
  Object.freeze({
    heroId: "doyuscu",
    displayName: "Doyuscu",
    rarity: QEHRAMAN_NADIRLIK.YASIL,
    startingLevel: 1,
    maxLevel: 60,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "war_master",
    displayName: "War Master",
    rarity: QEHRAMAN_NADIRLIK.GOY,
    startingLevel: 1,
    maxLevel: 60,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "iron_maiden",
    displayName: "Iron Maiden",
    rarity: QEHRAMAN_NADIRLIK.BENOVSEYI,
    startingLevel: 1,
    maxLevel: 60,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "feroman",
    displayName: "Feroman",
    rarity: QEHRAMAN_NADIRLIK.NARINCI,
    startingLevel: 1,
    maxLevel: 60,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "qiz",
    displayName: "Qiz",
    rarity: QEHRAMAN_NADIRLIK.NARINCI,
    startingLevel: 1,
    maxLevel: 60,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "qiz2",
    displayName: "Qiz2",
    rarity: QEHRAMAN_NADIRLIK.NARINCI,
    startingLevel: 1,
    maxLevel: 60,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  })
]);

const QEHRAMAN_XERITESI = new Map(
  QEHRAMANLAR.map(qehreman => [qehreman.heroId, qehreman])
);

function qehremanIdNormallasdir(deyer) {
  return typeof deyer === "string"
    ? deyer.trim().toLowerCase()
    : "";
}

function qehremaniTap(heroId) {
  return QEHRAMAN_XERITESI.get(
    qehremanIdNormallasdir(heroId)
  ) || null;
}

function butunQehremanlariAl() {
  return QEHRAMANLAR.map(qehreman => ({ ...qehreman }));
}

module.exports = {
  QEHRAMAN_NADIRLIK,
  QEHRAMANLAR,
  qehremanIdNormallasdir,
  qehremaniTap,
  butunQehremanlariAl
};
