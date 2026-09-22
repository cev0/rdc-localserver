"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_QUEUE_GRACE_MS,
  LAST_SHELTER_QUEUE_STATES,
  getLastShelterQueueState,
  shouldAutoReleaseLastShelterQueue,
  isFreeLastShelterQueue
} = require("./last_shelter_queue_runtime");

const now = 1_700_000_000_000;
assert.strictEqual(LAST_SHELTER_QUEUE_GRACE_MS, 5000);

// Reference Queue.getState(): now + 5000 updateTime-dan kicikdirse ING.
assert.strictEqual(
  getLastShelterQueueState(now + 5001, now),
  LAST_SHELTER_QUEUE_STATES.ING
);

// 5 saniyelik serhed daxil olmaqla queue OUT_SYN sayilir.
assert.strictEqual(
  getLastShelterQueueState(now + 5000, now),
  LAST_SHELTER_QUEUE_STATES.OUT_SYN
);
assert.strictEqual(
  getLastShelterQueueState(now - 1, now),
  LAST_SHELTER_QUEUE_STATES.OUT_SYN
);

// Java Long.MAX_VALUE Queue.getState()-de FREE sentinel-dir.
assert.strictEqual(
  getLastShelterQueueState("9223372036854775807", now),
  LAST_SHELTER_QUEUE_STATES.FREE
);

// QueueManager expired queue-lari release edib yeniden istifade edir.
assert.strictEqual(
  shouldAutoReleaseLastShelterQueue({ typeName: "SCIENCE", updateTime: now }, now),
  true
);
assert.strictEqual(
  isFreeLastShelterQueue({ typeName: "SCIENCE", updateTime: now }, now),
  true
);

// Reference istisnasi: NEW_EQUIP_MATERIAL OUT_SYN olsa da auto-release edilmir.
assert.strictEqual(
  shouldAutoReleaseLastShelterQueue({ typeName: "NEW_EQUIP_MATERIAL", updateTime: now }, now),
  false
);
assert.strictEqual(
  isFreeLastShelterQueue({ typeName: "NEW_EQUIP_MATERIAL", updateTime: now }, now),
  false
);

// Real FREE sentinel queue istisnadan asili olmayaraq free-dir.
assert.strictEqual(
  isFreeLastShelterQueue({ typeName: "NEW_EQUIP_MATERIAL", updateTime: "9223372036854775807" }, now),
  true
);

console.log("Last Shelter queue runtime regression: PASS");
