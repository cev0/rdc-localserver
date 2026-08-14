"use strict";

const KONVOY_TUTUM_TEXNOLOGIYA_ID = "konvoy_qosun_tutumu";

const KONVOY_TUTUM_BALANSI = Object.freeze([
  Object.freeze({ level: 0, capacity: 5000 }),
  Object.freeze({
    level: 1,
    capacity: 7500,
    requiredHqLevel: 2,
    requiredInstituteLevel: 1,
    researchTimeSeconds: 300,
    cost: Object.freeze([
      Object.freeze({ type: "wood", amount: 300 }),
      Object.freeze({ type: "money", amount: 250 })
    ])
  }),
  Object.freeze({
    level: 2,
    capacity: 10000,
    requiredHqLevel: 3,
    requiredInstituteLevel: 2,
    researchTimeSeconds: 900,
    cost: Object.freeze([
      Object.freeze({ type: "wood", amount: 700 }),
      Object.freeze({ type: "iron", amount: 250 }),
      Object.freeze({ type: "money", amount: 600 })
    ])
  }),
  Object.freeze({
    level: 3,
    capacity: 15000,
    requiredHqLevel: 5,
    requiredInstituteLevel: 4,
    researchTimeSeconds: 1800,
    cost: Object.freeze([
      Object.freeze({ type: "wood", amount: 1600 }),
      Object.freeze({ type: "iron", amount: 800 }),
      Object.freeze({ type: "fuel", amount: 250 }),
      Object.freeze({ type: "money", amount: 1400 })
    ])
  }),
  Object.freeze({
    level: 4,
    capacity: 20000,
    requiredHqLevel: 6,
    requiredInstituteLevel: 6,
    researchTimeSeconds: 3600,
    cost: Object.freeze([
      Object.freeze({ type: "wood", amount: 3200 }),
      Object.freeze({ type: "iron", amount: 1600 }),
      Object.freeze({ type: "fuel", amount: 700 }),
      Object.freeze({ type: "money", amount: 2800 })
    ])
  })
]);

function tutumLevelMelumatiniAl(level) {
  const temiz = Math.max(0, Math.min(4, Math.trunc(Number(level) || 0)));
  return KONVOY_TUTUM_BALANSI[temiz] || KONVOY_TUTUM_BALANSI[0];
}

module.exports = {
  KONVOY_TUTUM_TEXNOLOGIYA_ID,
  KONVOY_TUTUM_BALANSI,
  tutumLevelMelumatiniAl
};
