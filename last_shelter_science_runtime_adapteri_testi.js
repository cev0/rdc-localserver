"use strict";

const assert = require("assert");
const {
  scienceQueueMesguldur,
  scienceArtıqArasdirilib,
  verifiedScienceResearchPlanHazirla
} = require("./last_shelter_science_runtime_adapteri");

assert.strictEqual(scienceQueueMesguldur({ queues: [] }), false);
assert.strictEqual(scienceQueueMesguldur({ queues: [{ type: "SCIENCE", status: "running" }] }), true);
assert.strictEqual(scienceQueueMesguldur({ queues: [{ queueType: "SCIENCE", status: "completed" }] }), false);

assert.strictEqual(scienceArtıqArasdirilib({ science: { "901000": 1 } }, "901000"), true);
assert.strictEqual(scienceArtıqArasdirilib({ science: [{ itemId: "901000", level: 1 }] }, "901000"), true);
assert.strictEqual(scienceArtıqArasdirilib({ science: {} }, "901000"), false);

assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla({}, { quuid: "q-1" }, 1000),
  { ok: false, code: "SCIENCE_ITEM_ID_REQUIRED" }
);
assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla({}, { itemId: "999999", quuid: "q-1" }, 1000),
  { ok: false, code: "SCIENCE_ITEM_UNVERIFIED" }
);
assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla({}, { itemId: "901000" }, 1000),
  { ok: false, code: "SCIENCE_QUEUE_UUID_REQUIRED" }
);
assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla(
    { queues: [{ type: "SCIENCE", status: "running" }] },
    { itemId: "901000", quuid: "q-1" },
    1000
  ),
  { ok: false, code: "BUILDING_QUEUE_FULL" }
);
assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla(
    { science: { "901000": 1 } },
    { itemId: "901000", quuid: "q-1" },
    1000
  ),
  { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" }
);

const plan = verifiedScienceResearchPlanHazirla(
  { queues: [], science: {} },
  { itemId: "901000", quuid: "q-verified", gold: 7 },
  1000
);
assert.strictEqual(plan.ok, true);
assert.strictEqual(plan.protocol, "science.research");
assert.strictEqual(plan.itemId, "901000");
assert.strictEqual(plan.queue.uuid, "q-verified");
assert.strictEqual(plan.queue.type, "SCIENCE");
assert.strictEqual(plan.queue.startUnixMs, 1000);
assert.strictEqual(plan.queue.finishUnixMs, 91000);
assert.strictEqual(plan.researchTimeSeconds, 90);
assert.strictEqual(plan.buildingCondition, "403001");
assert.deepStrictEqual(plan.researchNeed, [
  { typeCode: 0, amount: 0 },
  { typeCode: 1, amount: 0 },
  { typeCode: 2, amount: 0 },
  { typeCode: 3, amount: 0 },
  { typeCode: 14, amount: 1000 }
]);
assert.strictEqual(plan.optionalGold, 7);
assert.strictEqual(plan.effect.para1, "801");
assert.strictEqual(plan.source, "last_shelter_v1.250.102_verified");

console.log("PASS: verified Last Shelter science runtime adapter enforces queue and catalog semantics.");
