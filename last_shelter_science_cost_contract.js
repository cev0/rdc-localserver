"use strict";

/*
 * Verified from Last Shelter v1.250.102 ScienceService bytecode.
 * This module intentionally records only the cost pipeline semantics that are
 * directly visible in the reference. It does not guess GameEffect values or
 * the numeric ResourceType ids from science.xml.
 */

const SCIENCE_COST_EFFECT_BY_RESOURCE = Object.freeze({
  fuel: "SCIENCE_COST_FUEL_RATE",
  food: "SCIENCE_COST_FOOD_RATE",
  iron: "SCIENCE_COST_IRON_RATE",
  metal: "SCIENCE_COST_METAL_RATE"
});

const SCIENCE_COST_EFFECTS = Object.freeze({
  money: "SCIENCE_RESEARCH_MONEY_COST",
  all: "SCIENCE_COST_ALL_RATE",
  reduceAll: "SCIENCE_REDUCE_COST_ALL_RATE",
  itemReduce: "SCIENCE_RESEARCH_ITEM_REDUCE",
  silverReduce: "SCIENCE_RESEARCH_SILVER_REDUCE"
});

const SCIENCE_TIME_EFFECTS = Object.freeze({
  normal: "NORMAL_SCIENCE_RESEARCH_TIME",
  car: "CAR_SCIENCE_RESEARCH_TIME",
  soldier: "SOILDER_SCIENCE_RESEARCH_TIME"
});

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function truncateJavaInt(value) {
  return Math.trunc(finite(value, 0));
}

/*
 * ScienceService special fifth ResourceType branch:
 *   intCost / (1 + SCIENCE_RESEARCH_MONEY_COST / 100), then f2i.
 * Java f2i truncates toward zero. The reference effect value is supplied by
 * UserProfile.getGameEffect; this module does not invent that value.
 */
function verifiedScienceMoneyCost(baseCost, moneyCostEffectPercent) {
  const base = truncateJavaInt(baseCost);
  const pct = finite(moneyCostEffectPercent, 0);
  const divisor = 1 + pct / 100;
  if (!(divisor > 0)) return null;
  return truncateJavaInt(base / divisor);
}

/*
 * Visible common prefix after per-resource selection:
 *   cost *= (1 + resourceRate / 100)
 *   cost *= (1 + SCIENCE_COST_ALL_RATE / 100)
 * Remaining reduction stages are deliberately not reproduced until their
 * contiguous bytecode is verified.
 */
function verifiedScienceCostPrefix(baseCost, resourceRatePercent, allRatePercent) {
  const base = truncateJavaInt(baseCost);
  const resourceRate = finite(resourceRatePercent, 0);
  const allRate = finite(allRatePercent, 0);
  return base * (1 + resourceRate / 100) * (1 + allRate / 100);
}

module.exports = {
  SCIENCE_COST_EFFECT_BY_RESOURCE,
  SCIENCE_COST_EFFECTS,
  SCIENCE_TIME_EFFECTS,
  verifiedScienceMoneyCost,
  verifiedScienceCostPrefix
};
