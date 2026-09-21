"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_ACTIVITY_REFERENCE,
  activityReferenceAl,
  activityReferenceProjectionHazirla
} = require("./last_shelter_activity_reference");

assert.strictEqual(
  LAST_SHELTER_ACTIVITY_REFERENCE.length,
  12
);

assert.deepStrictEqual(
  LAST_SHELTER_ACTIVITY_REFERENCE.map(x => x.id),
  [
    "57002","57032","57041","57061",
    "57059","57063","57067","57087",
    "57089","57121","57127","57149"
  ]
);

assert.deepStrictEqual(
  activityReferenceAl("57041").reward,
  [
    { type:7, value:{ num:1, id:"207081" } },
    { type:7, value:{ num:1, id:"207082" } },
    { type:7, value:{ num:1, id:"207083" } }
  ]
);

assert.deepStrictEqual(
  activityReferenceAl("57059").reward,
  activityReferenceAl("57067").reward
);

assert.deepStrictEqual(
  activityReferenceAl("57127").reward.map(x => x.value.id),
  ["212112","212113","212114","212115"]
);

assert.deepStrictEqual(
  activityReferenceAl("57149").reward.map(x => x.value.id),
  ["212115","212113","212112","212114"]
);

assert.strictEqual(
  activityReferenceAl("57089").needMainCityLevel,
  6
);
assert.strictEqual(
  activityReferenceAl("57089").rewardnum,
  1
);

assert.strictEqual(
  activityReferenceAl("57063").startTime,
  0
);
assert.strictEqual(
  activityReferenceAl("57063").endTime,
  0
);

const projected =
  activityReferenceProjectionHazirla();

projected[0].id = "changed";

assert.strictEqual(
  LAST_SHELTER_ACTIVITY_REFERENCE[0].id,
  "57002"
);
assert.strictEqual(
  activityReferenceAl("unknown"),
  null
);
assert.strictEqual(
  Object.isFrozen(
    LAST_SHELTER_ACTIVITY_REFERENCE
  ),
  true
);

console.log(
  "PASS: verified Last Shelter init activity/reference rows are preserved without rewriting event windows."
);
