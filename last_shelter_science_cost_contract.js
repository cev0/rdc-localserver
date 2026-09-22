"use strict";

// ScienceService.getResearchResourceCost/getScienceGoodsNeed/getTimeCost.
// Java performs float32 operations and truncates at specific stages. Rounding
// once at the end with JS doubles changes prices for large science levels.
const f = Math.fround;
const SCIENCE_COST_EFFECT_BY_RESOURCE = Object.freeze({
  fuel: "SCIENCE_COST_FUEL_RATE", food: "SCIENCE_COST_FOOD_RATE",
  iron: "SCIENCE_COST_IRON_RATE", metal: "SCIENCE_COST_METAL_RATE"
});
const SCIENCE_COST_EFFECTS = Object.freeze({
  money: "SCIENCE_RESEARCH_MONEY_COST", all: "SCIENCE_COST_ALL_RATE",
  reduceAll: "SCIENCE_REDUCE_COST_ALL_RATE", itemReduce: "SCIENCE_RESEARCH_ITEM_REDUCE",
  silverReduce: "SCIENCE_RESEARCH_SILVER_REDUCE"
});
const SCIENCE_TIME_EFFECTS = Object.freeze({
  normal: "NORMAL_SCIENCE_RESEARCH_TIME", car: "CAR_SCIENCE_RESEARCH_TIME",
  soldier: "SOILDER_SCIENCE_RESEARCH_TIME"
});
const SCIENCE_EFFECT_IDS = Object.freeze({
  SCIENCE_RESEARCH: 69, SCIENCE_COST_FUEL_RATE: 185, SCIENCE_COST_FOOD_RATE: 186,
  SCIENCE_COST_IRON_RATE: 187, SCIENCE_COST_METAL_RATE: 188, SCIENCE_COST_ALL_RATE: 189,
  SCIENCE_REDUCE_COST_ALL_RATE: 199, SCIENCE_RESEARCH_ITEM_REDUCE: 232,
  SCIENCE_RESEARCH_SILVER_REDUCE: 391, NORMAL_SCIENCE_RESEARCH_TIME: 724,
  CAR_SCIENCE_RESEARCH_TIME: 725, SOILDER_SCIENCE_RESEARCH_TIME: 726,
  SCIENCE_RESEARCH_MONEY_COST: 727, TECHNOLOGY_COST_MONEY: 991, TECHNOLOGY_COST_RESOURCE: 997
});
const COST_EFFECT_BY_CODE = Object.freeze({
  0: SCIENCE_COST_EFFECT_BY_RESOURCE.fuel, 1: SCIENCE_COST_EFFECT_BY_RESOURCE.metal,
  2: SCIENCE_COST_EFFECT_BY_RESOURCE.iron, 3: SCIENCE_COST_EFFECT_BY_RESOURCE.food
});
function javaInt(value) {
  if (Number.isNaN(value)) return 0;
  return Math.max(-2147483648, Math.min(2147483647, Math.trunc(value))) || 0;
}
function effect(effects, name) {
  const value = Number(effects?.[name] ?? effects?.[SCIENCE_EFFECT_IDS[name]] ?? 0);
  if (!Number.isFinite(value)) throw new Error(`Invalid science effect: ${name}`);
  return f(value);
}
function factor(percent) { return f(1 + f(f(percent) / 100)); }
function verifiedScienceMoneyCost(baseCost, percent) {
  const divisor = factor(percent);
  return divisor > 0 ? javaInt(f(f(baseCost) / divisor)) : null;
}
function verifiedScienceCostPrefix(baseCost, resourceRate, allRate) {
  return f(f(f(baseCost) * factor(resourceRate)) * factor(allRate));
}
function verifiedScienceResourceCost(baseCost, typeCode, effects = {}, heroPercent = 0) {
  let cost = javaInt(baseCost);
  if (typeCode === 14) {
    cost = verifiedScienceMoneyCost(cost, effect(effects, SCIENCE_COST_EFFECTS.money));
    if (cost == null) return null;
  }
  const rate = COST_EFFECT_BY_CODE[typeCode] ? effect(effects, COST_EFFECT_BY_CODE[typeCode]) : 0;
  cost = javaInt(f(verifiedScienceCostPrefix(cost, rate, effect(effects, SCIENCE_COST_EFFECTS.all)) *
    factor(effect(effects, SCIENCE_COST_EFFECTS.reduceAll))));
  cost = javaInt(f(f(cost) * factor(effect(effects,
    typeCode === 14 ? "TECHNOLOGY_COST_MONEY" : "TECHNOLOGY_COST_RESOURCE"))));
  if (heroPercent !== 0) cost = javaInt(cost * (1 - javaInt(heroPercent) / 100));
  return Math.max(0, cost);
}
function verifiedScienceGoodsCost(baseCost, itemId, effects = {}, heroPercent = 0) {
  let cost = javaInt(f(f(baseCost) * factor(effect(effects, SCIENCE_COST_EFFECTS.itemReduce))));
  if (heroPercent !== 0) cost = javaInt(cost * (1 - javaInt(heroPercent) / 100));
  if (String(itemId) === "200956") cost = javaInt(f(f(cost) - effect(effects, SCIENCE_COST_EFFECTS.silverReduce)));
  return Math.max(0, cost);
}
function verifiedScienceTimeMs(seconds, effectType, effects = {}, academyStationEffect = 0) {
  const key = { 1: SCIENCE_TIME_EFFECTS.normal, 2: SCIENCE_TIME_EFFECTS.car, 3: SCIENCE_TIME_EFFECTS.soldier }[effectType];
  const total = f(f(academyStationEffect) + (key ? effect(effects, key) : 0));
  const divisor = factor(total);
  if (!(divisor > 0) || !Number.isFinite(seconds) || seconds < 0) return null;
  const time = Math.trunc(f(f(seconds * 1000) / divisor));
  return Number.isSafeInteger(time) && time >= 0 ? time : null;
}
module.exports = {
  SCIENCE_COST_EFFECT_BY_RESOURCE, SCIENCE_COST_EFFECTS, SCIENCE_TIME_EFFECTS, SCIENCE_EFFECT_IDS,
  javaInt, verifiedScienceMoneyCost, verifiedScienceCostPrefix,
  verifiedScienceResourceCost, verifiedScienceGoodsCost, verifiedScienceTimeMs
};
