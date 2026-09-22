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

// Golden values evaluated with OpenJDK 17 from ScienceService's bytecode
// arithmetic. These cases distinguish float32 from a JS double calculation.
const { verifiedScienceResourceCost: resourceCost, verifiedScienceGoodsCost: goodsCost,
  verifiedScienceTimeMs: timeMs, javaInt } = require("./last_shelter_science_cost_contract");
assert.strictEqual(resourceCost(16777217,0,{SCIENCE_COST_FUEL_RATE:-13.37,SCIENCE_COST_ALL_RATE:-7.5,
  SCIENCE_REDUCE_COST_ALL_RATE:-11.1,TECHNOLOGY_COST_RESOURCE:3.3},17),10247316);
assert.strictEqual(resourceCost(140000001,14,{SCIENCE_RESEARCH_MONEY_COST:33.3,SCIENCE_COST_ALL_RATE:-7.5,
  SCIENCE_REDUCE_COST_ALL_RATE:-11.1,TECHNOLOGY_COST_MONEY:-3.3},17),69317994);
assert.strictEqual(resourceCost(99999999,2),100000000);
assert.strictEqual(resourceCost(2147483600,1,{SCIENCE_COST_METAL_RATE:100,SCIENCE_COST_ALL_RATE:100}),2147483647);
assert.strictEqual(goodsCost(16777217,"200956",{SCIENCE_RESEARCH_ITEM_REDUCE:-12.345,
  SCIENCE_RESEARCH_SILVER_REDUCE:10.9},17),12206026);
assert.strictEqual(goodsCost(500,"210163",{SCIENCE_RESEARCH_ITEM_REDUCE:-120}),0);
assert.strictEqual(timeMs(2650240,1,{NORMAL_SCIENCE_RESEARCH_TIME:17.7},13.3),2023084032);
assert.strictEqual(timeMs(1234567,2,{CAR_SCIENCE_RESEARCH_TIME:7.5},99.9),595258944);
assert.strictEqual(javaInt(Infinity),2147483647);
assert.strictEqual(javaInt(-Infinity),-2147483648);
assert.strictEqual(javaInt(NaN),0);
console.log("PASS: Java float32 rounding, integer saturation and goods/time stages match golden results.");
