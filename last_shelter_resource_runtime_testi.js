"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_RESOURCE_PAYLOAD_FIELDS,
  lastShelterResourceRuntimeDefaultHazirla,
  lastShelterResourceRuntimeTeminEt,
  lastShelterResourcePayloadHazirla
} = require("./last_shelter_resource_runtime");

assert.deepStrictEqual(
  LAST_SHELTER_RESOURCE_PAYLOAD_FIELDS,
  [
    "chip",
    "electricity",
    "water",
    "people",
    "food",
    "stone",
    "diamond",
    "regTime",
    "changePeople",
    "money",
    "iron",
    "silver",
    "wood",
    "maxPeople",
    "db_timezone_offset"
  ]
);

const createdAt = 1789659007819;
assert.deepStrictEqual(
  lastShelterResourceRuntimeDefaultHazirla(createdAt),
  {
    regTime: createdAt,
    people: 0,
    changePeople: 0,
    maxPeople: 0
  }
);

const state = {
  resources: {
    chips: 0,
    electricity: 500,
    water: 700,
    food: 1000,
    stone: 1500,
    diamond: 0,
    money: 1200,
    iron: 800,
    silver: 500,
    wood: 1500,
    fuel: 999
  }
};

lastShelterResourceRuntimeTeminEt(state, createdAt);

const payload =
  lastShelterResourcePayloadHazirla(
    state,
    1789659018642
  );

assert.deepStrictEqual(
  payload,
  {
    chip: 0,
    electricity: 500,
    water: 700,
    people: 0,
    food: 1000,
    stone: 1500,
    diamond: 0,
    regTime: createdAt,
    changePeople: 0,
    money: 1200,
    iron: 800,
    silver: 500,
    wood: 1500,
    maxPeople: 0,
    db_timezone_offset: 1789659018
  }
);

assert.strictEqual(
  Object.prototype.hasOwnProperty.call(payload, "fuel"),
  false,
  "Legacy RDC fuel must not leak into the verified Last Shelter resource envelope."
);

// Existing persisted population data is retained rather than recomputed.
state.lastShelterResourceRuntime.people = 74;
state.lastShelterResourceRuntime.maxPeople = 107;

const progressed =
  lastShelterResourcePayloadHazirla(
    state,
    1789658711296
  );

assert.strictEqual(progressed.people, 74);
assert.strictEqual(progressed.maxPeople, 107);
assert.strictEqual(progressed.db_timezone_offset, 1789658711);

console.log(
  "PASS: Last Shelter resource runtime envelope and persistence fields match verified reference behavior."
);
