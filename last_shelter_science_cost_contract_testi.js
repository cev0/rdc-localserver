"use strict";

const assert = require("assert");
const {
  SCIENCE_COST_EFFECT_BY_RESOURCE,
  SCIENCE_COST_EFFECTS,
  SCIENCE_TIME_EFFECTS,
  verifiedScienceMoneyCost,
  verifiedScienceCostPrefix
} = require("./last_shelter_science_cost_contract");

assert.deepStrictEqual(SCIENCE_COST_EFFECT_BY_RESOURCE, {
  fuel: "SCIENCE_COST_FUEL_RATE",
  food: "SCIENCE_COST_FOOD_RATE",
  iron: "SCIENCE_COST_IRON_RATE",
  metal: "SCIENCE_COST_METAL_RATE"
});

assert.strictEqual(SCIENCE_COST_EFFECTS.money, "SCIENCE_RESEARCH_MONEY_COST");
assert.strictEqual(SCIENCE_COST_EFFECTS.all, "SCIENCE_COST_ALL_RATE");
assert.strictEqual(SCIENCE_COST_EFFECTS.reduceAll, "SCIENCE_REDUCE_COST_ALL_RATE");
assert.strictEqual(SCIENCE_COST_EFFECTS.itemReduce, "SCIENCE_RESEARCH_ITEM_REDUCE");
assert.strictEqual(SCIENCE_COST_EFFECTS.silverReduce, "SCIENCE_RESEARCH_SILVER_REDUCE");
assert.deepStrictEqual(SCIENCE_TIME_EFFECTS, {
  normal: "NORMAL_SCIENCE_RESEARCH_TIME",
  car: "CAR_SCIENCE_RESEARCH_TIME",
  soldier: "SOILDER_SCIENCE_RESEARCH_TIME"
});

// Java bytecode: base / (1 + effect/100), f2i truncation.
assert.strictEqual(verifiedScienceMoneyCost(1000, 25), 800);
assert.strictEqual(verifiedScienceMoneyCost(1000, 33), 751);
assert.strictEqual(verifiedScienceMoneyCost(1000, 0), 1000);
assert.strictEqual(verifiedScienceMoneyCost(1000, -100), null);

// Verified common prefix only; no unverified reduction stage is assumed.
assert.strictEqual(verifiedScienceCostPrefix(1000, 10, 20), 1320);
assert.strictEqual(verifiedScienceCostPrefix(1000, 0, 0), 1000);

console.log("Last Shelter science cost contract regression OK");
