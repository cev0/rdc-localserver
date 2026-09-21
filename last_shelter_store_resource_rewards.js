"use strict";

// Authoritative reward bundles observed in the Last Shelter v1.250.102
// reference server init.store payload. Numeric reward type semantics are kept raw
// until their server-side enum mapping is independently verified.
const STORE_RESOURCE_REWARDS = Object.freeze({
  "200560": Object.freeze([{ value: 2000, type: 0 }, { value: 2000, type: 3 }]),
  "200561": Object.freeze([{ value: 8000, type: 0 }, { value: 1300, type: 2 }, { value: 8000, type: 3 }]),
  "200562": Object.freeze([{ value: 20000, type: 0 }, { value: 800, type: 1 }, { value: 3300, type: 2 }, { value: 20000, type: 3 }]),
  "200563": Object.freeze([{ value: 100000, type: 0 }, { value: 4100, type: 1 }, { value: 16600, type: 2 }, { value: 100000, type: 3 }]),
  "200564": Object.freeze([{ value: 1000, type: 0 }, { value: 1000, type: 3 }]),
  "200565": Object.freeze([{ value: 2800, type: 0 }, { value: 400, type: 2 }, { value: 2800, type: 3 }]),
  "200566": Object.freeze([{ value: 6100, type: 0 }, { value: 200, type: 1 }, { value: 500, type: 2 }, { value: 6100, type: 3 }]),
  "200567": Object.freeze([{ value: 30500, type: 0 }, { value: 1000, type: 1 }, { value: 2500, type: 2 }, { value: 30500, type: 3 }]),
  "200650": Object.freeze([{ value: 1000, type: 10 }, { value: 1000, type: 11 }, { value: Object.freeze({ id: "200390", num: 2 }), type: 7 }]),
  "200651": Object.freeze([{ value: 3000, type: 10 }, { value: 3000, type: 11 }, { value: Object.freeze({ id: "200390", num: 5 }), type: 7 }]),
  "200652": Object.freeze([{ value: 5000, type: 10 }, { value: 5000, type: 11 }, { value: Object.freeze({ id: "200302", num: 2 }), type: 7 }]),
  "200653": Object.freeze([{ value: 7000, type: 10 }, { value: 7000, type: 11 }, { value: Object.freeze({ id: "200302", num: 8 }), type: 7 }]),
  "200654": Object.freeze([{ value: 10000, type: 10 }, { value: 10000, type: 11 }, { value: Object.freeze({ id: "200364", num: 5 }), type: 7 }]),
  "200655": Object.freeze([{ value: 1000, type: 10 }, { value: 1000, type: 11 }, { value: Object.freeze({ id: "200207", num: 1 }), type: 7 }]),
  "200656": Object.freeze([{ value: 2000, type: 10 }, { value: 2000, type: 11 }, { value: Object.freeze({ id: "200306", num: 5 }), type: 7 }]),
  "200657": Object.freeze([{ value: 3000, type: 10 }, { value: 3000, type: 11 }, { value: Object.freeze({ id: "200205", num: 2 }), type: 7 }]),
  "200658": Object.freeze([{ value: 4000, type: 10 }, { value: 4000, type: 11 }, { value: Object.freeze({ id: "200326", num: 12 }), type: 7 }]),
  "200659": Object.freeze([{ value: 5000, type: 10 }, { value: 5000, type: 11 }, { value: Object.freeze({ id: "200205", num: 3 }), type: 7 }])
});

function getVerifiedStoreReward(id) {
  const reward = STORE_RESOURCE_REWARDS[String(id)];
  return reward ? reward.map(entry => ({ ...entry, value: typeof entry.value === "object" ? { ...entry.value } : entry.value })) : null;
}

module.exports = { STORE_RESOURCE_REWARDS, getVerifiedStoreReward };
