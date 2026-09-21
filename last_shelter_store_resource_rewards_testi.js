"use strict";

const assert = require("assert");
const {
  STORE_RESOURCE_REWARDS,
  getVerifiedStoreReward,
  getVerifiedStoreRewardIds
} = require("./last_shelter_store_resource_rewards");

assert.strictEqual(
  getVerifiedStoreRewardIds().length,
  401,
  "Complete reference init.store catalog must contain all 401 verified rows."
);

assert.deepStrictEqual(
  getVerifiedStoreReward("200500"),
  [
  {
    "value": {
      "id": "200331",
      "num": 2
    },
    "type": 7
  },
  {
    "value": {
      "id": "200301",
      "num": 2
    },
    "type": 7
  }
]
);

assert.deepStrictEqual(
  getVerifiedStoreReward("200560"),
  [
  {
    "value": 2000,
    "type": 0
  },
  {
    "value": 2000,
    "type": 3
  }
]
);

assert.deepStrictEqual(
  getVerifiedStoreReward(200650),
  [
  {
    "value": 1000,
    "type": 10
  },
  {
    "value": 1000,
    "type": 11
  },
  {
    "value": {
      "id": "200390",
      "num": 2
    },
    "type": 7
  }
]
);

assert.deepStrictEqual(
  getVerifiedStoreReward("209612"),
  [
  {
    "value": {
      "id": "203362",
      "num": 1
    },
    "type": 7
  }
]
);

assert.strictEqual(
  getVerifiedStoreReward("unverified"),
  null
);

assert.strictEqual(
  Object.isFrozen(STORE_RESOURCE_REWARDS),
  true
);
assert.strictEqual(
  Object.isFrozen(STORE_RESOURCE_REWARDS["200500"]),
  true
);
assert.strictEqual(
  Object.isFrozen(STORE_RESOURCE_REWARDS["200500"][0]),
  true
);

// Returned copies must be mutable without altering the authoritative catalog.
const copy =
  getVerifiedStoreReward("200500");

copy[0].value.num = 999;

assert.strictEqual(
  STORE_RESOURCE_REWARDS["200500"][0].value.num,
  2
);

for (const [id, reward] of Object.entries(STORE_RESOURCE_REWARDS)) {
  assert.ok(/^\d+$/.test(id));
  assert.ok(Array.isArray(reward));

  for (const entry of reward) {
    assert.ok(
      Number.isInteger(entry.type),
      "Reward type must remain the numeric server type id."
    );
    assert.ok(
      Object.prototype.hasOwnProperty.call(entry, "value"),
      "Every reward entry must preserve its observed value."
    );
  }
}

console.log(
  "PASS: all 401 verified Last Shelter init.store reward bundles are preserved."
);
