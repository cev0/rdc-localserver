"use strict";

// ============================================================
// QƏHRƏMAN KATALOQU
// ------------------------------------------------------------
// Hero ID-ləri Unity HeroDefinition asset-ləri ilə 1:1 eynidir.
// Vizual məlumat Unity-də, server-authoritative gameplay təsnifatı burada qalır.
// ============================================================

const QEHRAMAN_NADIRLIK = Object.freeze({
  YASIL: 0,
  GOY: 1,
  BENOVSEYI: 2,
  NARINCI: 3
});

const QEHRAMAN_ISTIFADE_SAHESI = Object.freeze({
  DOYUS: "doyus",
  RESURS: "resurs",
  TEXNOLOGIYA: "texnologiya"
});

const QEHRAMANLAR = Object.freeze([
  Object.freeze({
    heroId: "doyuscu",
    displayName: "Doyuscu",
    rarity: QEHRAMAN_NADIRLIK.YASIL,
    istifadeSahesi: QEHRAMAN_ISTIFADE_SAHESI.DOYUS,
    startingLevel: 1,
    maxLevel: 50,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "war_master",
    displayName: "War Master",
    rarity: QEHRAMAN_NADIRLIK.GOY,
    istifadeSahesi: QEHRAMAN_ISTIFADE_SAHESI.DOYUS,
    startingLevel: 1,
    maxLevel: 50,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "iron_maiden",
    displayName: "Iron Maiden",
    rarity: QEHRAMAN_NADIRLIK.BENOVSEYI,
    istifadeSahesi: QEHRAMAN_ISTIFADE_SAHESI.DOYUS,
    startingLevel: 1,
    maxLevel: 50,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "feroman",
    displayName: "Feroman",
    rarity: QEHRAMAN_NADIRLIK.NARINCI,
    istifadeSahesi: QEHRAMAN_ISTIFADE_SAHESI.DOYUS,
    startingLevel: 1,
    maxLevel: 50,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "qiz",
    displayName: "Qiz",
    rarity: QEHRAMAN_NADIRLIK.NARINCI,
    istifadeSahesi: QEHRAMAN_ISTIFADE_SAHESI.DOYUS,
    startingLevel: 1,
    maxLevel: 50,
    duplicateCopiesRequiredForSkill6: 1,
    duplicateCopiesRequiredForSkill8: 2
  }),
  Object.freeze({
    heroId: "qiz2",
    displayName: "Qiz2",
    rarity: QEHRAMAN_NADIRLIK.NARINCI,
    istifadeSahesi: QEHRAMAN_ISTIFADE_SAHESI.DOYUS,
    startingLevel: 1,
    maxLevel: 50,
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

function istifadeSahesineGoreQehremanlariAl(istifadeSahesi) {
  const acar = String(istifadeSahesi || "").trim().toLowerCase();
  return QEHRAMANLAR
    .filter(qehreman => qehreman.istifadeSahesi === acar)
    .map(qehreman => ({ ...qehreman }));
}

function qehremanKonvoyaYerleseBiler(heroId) {
  const qehreman = qehremaniTap(heroId);
  return !!qehreman &&
    qehreman.istifadeSahesi === QEHRAMAN_ISTIFADE_SAHESI.DOYUS;
}

module.exports = {
  QEHRAMAN_NADIRLIK,
  QEHRAMAN_ISTIFADE_SAHESI,
  QEHRAMANLAR,
  qehremanIdNormallasdir,
  qehremaniTap,
  butunQehremanlariAl,
  istifadeSahesineGoreQehremanlariAl,
  qehremanKonvoyaYerleseBiler
};
