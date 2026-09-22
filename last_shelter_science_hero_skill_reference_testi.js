"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_SCIENCE_HERO_SKILLS,
  stationBuildingTypeAl
} = require("./last_shelter_science_hero_skill_reference");

const energy = LAST_SHELTER_SCIENCE_HERO_SKILLS.ENERGY_SKILL;
assert.strictEqual(energy.id, "50046");
assert.strictEqual(energy.hero_skill, "50046");
assert.strictEqual(energy.active_skill, "1");
assert.strictEqual(energy.cd_time, "10");
assert.strictEqual(energy.state, "2");
assert.strictEqual(energy.max_level, "10");
assert.strictEqual(energy.para, "20;10");
assert.strictEqual(energy.para_add, "5;5");
assert.strictEqual(stationBuildingTypeAl(energy), "403000");
assert.strictEqual(energy.cost.split("|").length, 9);

const second = LAST_SHELTER_SCIENCE_HERO_SKILLS.SECOND_RESEARCH_QUEUE;
assert.strictEqual(second.id, "61012");
assert.strictEqual(second.state, "1");
assert.strictEqual(second.max_level, "10");
assert.strictEqual(second.para, "1");
assert.strictEqual(second.effect, "232;5");
assert.strictEqual(second.effect_add, "232;5");
assert.strictEqual(stationBuildingTypeAl(second), "403000");
assert.strictEqual(second.cost.split("|").length, 9);

assert(Object.isFrozen(LAST_SHELTER_SCIENCE_HERO_SKILLS));
assert(Object.isFrozen(energy));
assert(Object.isFrozen(second));

console.log("PASS: verified Last Shelter science hero skill source contract.");
