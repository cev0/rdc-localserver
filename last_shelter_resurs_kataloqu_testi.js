"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_RESURS_IDLERI,
  canonicalResursIdAl,
  lastShelterResursudur,
  legacyOnlyResursdur,
  canonicalResursObyektiHazirla,
  clientUcunResursContractiniAl
} = require("./last_shelter_resurs_kataloqu");

assert.deepStrictEqual(LAST_SHELTER_RESURS_IDLERI, [
  "chip", "electricity", "water", "food", "stone",
  "diamond", "money", "iron", "silver", "wood"
]);

assert.strictEqual(canonicalResursIdAl("chips"), "chip");
assert.strictEqual(canonicalResursIdAl("STONE"), "stone");
assert.strictEqual(canonicalResursIdAl("fuel"), null);
assert.strictEqual(lastShelterResursudur("silver"), true);
assert.strictEqual(lastShelterResursudur("fuel"), false);
assert.strictEqual(legacyOnlyResursdur("fuel"), true);

const normalized = canonicalResursObyektiHazirla({
  chip: 2,
  chips: 3,
  stone: 9,
  fuel: 999,
  bogus: 100,
  silver: "7"
});

assert.strictEqual(normalized.chip, 5);
assert.strictEqual(normalized.stone, 9);
assert.strictEqual(normalized.silver, 7);
assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, "fuel"), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, "bogus"), false);

const contract = clientUcunResursContractiniAl();
assert.deepStrictEqual(contract.legacyAliases, { chips: "chip" });
assert.deepStrictEqual(contract.legacyOnlyIds, ["fuel"]);
assert.strictEqual(contract.canonicalIds.length, 10);

console.log("[LAST_SHELTER_RESURS_KATALOQU_TESTI] OK");
