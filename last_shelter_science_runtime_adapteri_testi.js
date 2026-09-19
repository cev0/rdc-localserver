"use strict";

const assert = require("assert");
const {
  scienceQueueMesguldur,
  scienceArtıqArasdirilib,
  verifiedScienceResearchPlanHazirla,
  verifiedScienceResearchPlaniniStateEt,
  verifiedScienceResearchYekunlasdir
} = require("./last_shelter_science_runtime_adapteri");

assert.strictEqual(scienceQueueMesguldur({ queues: [] }), false);
assert.strictEqual(scienceQueueMesguldur({ queues: [{ type: "SCIENCE", status: "running" }] }), true);
assert.strictEqual(scienceQueueMesguldur({ queues: [{ queueType: "SCIENCE", status: "completed" }] }), false);
assert.strictEqual(scienceArtıqArasdirilib({ science: { "901000": 1 } }, "901000"), true);
assert.strictEqual(scienceArtıqArasdirilib({ science: [{ itemId: "901000", level: 1 }] }, "901000"), true);
assert.strictEqual(scienceArtıqArasdirilib({ science: {} }, "901000"), false);

assert.deepStrictEqual(verifiedScienceResearchPlanHazirla({}, { quuid: "q-1" }, 1000), { ok: false, code: "SCIENCE_ITEM_ID_REQUIRED" });
assert.deepStrictEqual(verifiedScienceResearchPlanHazirla({}, { itemId: "999999", quuid: "q-1" }, 1000), { ok: false, code: "SCIENCE_ITEM_UNVERIFIED" });
assert.deepStrictEqual(verifiedScienceResearchPlanHazirla({}, { itemId: "901000" }, 1000), { ok: false, code: "SCIENCE_QUEUE_UUID_REQUIRED" });
assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla({ queues: [{ type: "SCIENCE", status: "running" }] }, { itemId: "901000", quuid: "q-1" }, 1000),
  { ok: false, code: "BUILDING_QUEUE_FULL" }
);
assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla({ science: { "901000": 1 } }, { itemId: "901000", quuid: "q-1" }, 1000),
  { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" }
);

const VERIFIED_NODES = [
  { itemId: "901000", seconds: 90, para1: "801", quality: 1 },
  { itemId: "901100", seconds: 90, para1: "802", quality: 1 },
  { itemId: "901200", seconds: 180, para1: "803", quality: 2 },
  { itemId: "901300", seconds: 180, para1: "804", quality: 2 }
];

for (const node of VERIFIED_NODES) {
  const nodeState = { queues: [], science: {} };
  const nodePlan = verifiedScienceResearchPlanHazirla(
    nodeState,
    { itemId: node.itemId, quuid: `q-${node.itemId}`, gold: 7 },
    1000
  );
  assert.strictEqual(nodePlan.ok, true, node.itemId);
  assert.strictEqual(nodePlan.protocol, "science.research");
  assert.strictEqual(nodePlan.itemId, node.itemId);
  assert.strictEqual(nodePlan.queue.uuid, `q-${node.itemId}`);
  assert.strictEqual(nodePlan.queue.type, "SCIENCE");
  assert.strictEqual(nodePlan.queue.startUnixMs, 1000);
  assert.strictEqual(nodePlan.queue.finishUnixMs, 1000 + node.seconds * 1000);
  assert.strictEqual(nodePlan.researchTimeSeconds, node.seconds);
  assert.strictEqual(nodePlan.buildingCondition, "403001");
  assert.deepStrictEqual(nodePlan.researchNeed, [
    { typeCode: 0, amount: 0 }, { typeCode: 1, amount: 0 }, { typeCode: 2, amount: 0 },
    { typeCode: 3, amount: 0 }, { typeCode: 14, amount: 1000 }
  ]);
  assert.strictEqual(nodePlan.optionalGold, 7);
  assert.strictEqual(nodePlan.effect.para1, node.para1);
  assert.strictEqual(nodePlan.source, "last_shelter_v1.250.102_verified");

  const appliedNode = verifiedScienceResearchPlaniniStateEt(nodeState, nodePlan);
  assert.strictEqual(appliedNode.ok, true);
  assert.strictEqual(scienceQueueMesguldur(nodeState), true);
  assert.deepStrictEqual(
    verifiedScienceResearchYekunlasdir(nodeState, nodePlan.queue.finishUnixMs - 1),
    []
  );
  const completedNode = verifiedScienceResearchYekunlasdir(nodeState, nodePlan.queue.finishUnixMs);
  assert.strictEqual(completedNode.length, 1);
  assert.strictEqual(completedNode[0].itemId, node.itemId);
  assert.strictEqual(nodeState.science[node.itemId], 1);
  assert.strictEqual(nodeState.queues[0].status, "completed");
  assert.strictEqual(scienceQueueMesguldur(nodeState), false);
  assert.strictEqual(scienceArtıqArasdirilib(nodeState, node.itemId), true);
  assert.deepStrictEqual(
    verifiedScienceResearchPlanHazirla(nodeState, { itemId: node.itemId, quuid: `repeat-${node.itemId}` }, nodePlan.queue.finishUnixMs + 1),
    { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" }
  );
}

console.log("PASS: all verified Last Shelter science nodes enforce exact queue, timing, effect and completion semantics.");
