"use strict";

// UserResource.ResourceType.getByValue uses enum ordinals in the supplied JAR.
// In ScienceService's switch WOOD uses the fuel effect, STONE the metal effect.
const RESOURCE_TYPE_NAMES = Object.freeze([
  "WOOD", "STONE", "IRON", "FOOD", "SILVER", "GOLD", "CHIP", "DIAMOND",
  "CHIP_ACC", "RESCUE_CENTER", "GOLD_COIN", "WATER", "ELECTRICITY", "PEOPLE",
  "MONEY", "ENERGY_ITEM"
]);
const RESOURCE_STATE_KEYS = Object.freeze({
  0: "wood", 1: "stone", 2: "iron", 3: "food", 4: "silver",
  6: "chip", 7: "diamond", 11: "water", 12: "electricity", 14: "money"
});
function resourceTypeAl(code) {
  const index = Number(code);
  return Number.isInteger(index) && index >= 0 && index < RESOURCE_TYPE_NAMES.length
    ? { code: index, name: RESOURCE_TYPE_NAMES[index], stateKey: RESOURCE_STATE_KEYS[index] || null }
    : null;
}
module.exports = { RESOURCE_TYPE_NAMES, RESOURCE_STATE_KEYS, resourceTypeAl };
