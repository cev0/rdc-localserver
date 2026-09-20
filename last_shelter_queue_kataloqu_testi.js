"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_QUEUE_TYPES,
  getLastShelterQueueTypeByName,
  getLastShelterQueueTypeByCode,
  isLastShelterQueueCode
} = require("./last_shelter_queue_kataloqu");

assert.strictEqual(LAST_SHELTER_QUEUE_TYPES.length, 38);

for (let ordinal = 0; ordinal <= 36; ordinal += 1) {
  const entry = LAST_SHELTER_QUEUE_TYPES[ordinal];
  assert.strictEqual(entry.enumOrdinal, ordinal);
  assert.strictEqual(entry.code, ordinal);
  assert.strictEqual(getLastShelterQueueTypeByCode(ordinal), entry);
  assert.strictEqual(getLastShelterQueueTypeByName(entry.name), entry);
}

const freeBuilding = LAST_SHELTER_QUEUE_TYPES[37];
assert.deepStrictEqual(
  { name: freeBuilding.name, enumOrdinal: freeBuilding.enumOrdinal, code: freeBuilding.code },
  { name: "FREE_BUILDING", enumOrdinal: 37, code: 100 }
);
assert.strictEqual(getLastShelterQueueTypeByCode(37), null);
assert.strictEqual(getLastShelterQueueTypeByCode(100), freeBuilding);
assert.strictEqual(getLastShelterQueueTypeByName("science").code, 6);
assert.strictEqual(getLastShelterQueueTypeByName("foot_soldier").code, 1);
assert.strictEqual(getLastShelterQueueTypeByName("ride_soldier").code, 8);
assert.strictEqual(getLastShelterQueueTypeByName("bow_soldier").code, 9);
assert.strictEqual(getLastShelterQueueTypeByName("car_soldier").code, 10);
assert.strictEqual(getLastShelterQueueTypeByName("army_upgrade").code, 34);
assert.strictEqual(getLastShelterQueueTypeByName("domain_hospital").code, 35);
assert.strictEqual(getLastShelterQueueTypeByName("new_equip_material").code, 36);
assert.strictEqual(isLastShelterQueueCode(6), true);
assert.strictEqual(isLastShelterQueueCode(100), true);
assert.strictEqual(isLastShelterQueueCode(999), false);

const uniqueCodes = new Set(LAST_SHELTER_QUEUE_TYPES.map((entry) => entry.code));
assert.strictEqual(uniqueCodes.size, LAST_SHELTER_QUEUE_TYPES.length);

console.log("Last Shelter queue katalogu testi ugurla kecdi.");
