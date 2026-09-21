"use strict";
const assert = require("assert");
const { STORE_RESOURCE_REWARDS, getVerifiedStoreReward } = require("./last_shelter_store_resource_rewards");

assert.deepStrictEqual(Object.keys(STORE_RESOURCE_REWARDS), [
  "200560","200561","200562","200563","200564","200565","200566","200567",
  "200650","200651","200652","200653","200654","200655","200656","200657","200658","200659"
]);
assert.deepStrictEqual(getVerifiedStoreReward("200562"), [
  { value: 20000, type: 0 }, { value: 800, type: 1 }, { value: 3300, type: 2 }, { value: 20000, type: 3 }
]);
assert.deepStrictEqual(getVerifiedStoreReward(200654), [
  { value: 10000, type: 10 }, { value: 10000, type: 11 }, { value: { id: "200364", num: 5 }, type: 7 }
]);
assert.deepStrictEqual(getVerifiedStoreReward("200658"), [
  { value: 4000, type: 10 }, { value: 4000, type: 11 }, { value: { id: "200326", num: 12 }, type: 7 }
]);
assert.strictEqual(getVerifiedStoreReward("unverified"), null);

// Returned values must be safe to mutate without corrupting authoritative catalog state.
const copy = getVerifiedStoreReward("200650");
copy[2].value.num = 999;
assert.strictEqual(STORE_RESOURCE_REWARDS["200650"][2].value.num, 2);
console.log("Last Shelter store resource reward regression passed");
