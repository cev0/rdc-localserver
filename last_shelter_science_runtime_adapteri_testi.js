"use strict";

const assert = require("assert");
const {
  scienceQueueMesguldur,
  scienceQueueSec,
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

const queueState = { queues: [
  { uuid: "science-1", qid: 1, type: "SCIENCE", status: "free" },
  { uuid: "science-2", qid: 2, type: "SCIENCE", status: "free" },
  { uuid: "build-1", qid: 1, type: "BUILDING", status: "free" }
] };
assert.strictEqual(scienceQueueSec(queueState, "").uuid, "science-1");
assert.strictEqual(scienceQueueSec(queueState, "science-2").uuid, "science-2");
assert.strictEqual(scienceQueueSec(queueState, "build-1"), null);
assert.strictEqual(scienceQueueSec({ queues: [{ uuid: "science-1", qid: 1, type: "SCIENCE", status: "running" }] }, "science-1"), null);

assert.deepStrictEqual(verifiedScienceResearchPlanHazirla({}, { quuid: "q-1" }, 1000), { ok: false, code: "SCIENCE_ITEM_ID_REQUIRED" });
assert.deepStrictEqual(verifiedScienceResearchPlanHazirla({}, { itemId: "999999", quuid: "q-1" }, 1000), { ok: false, code: "SCIENCE_ITEM_UNVERIFIED" });
assert.deepStrictEqual(verifiedScienceResearchPlanHazirla({ queues: [] }, { itemId: "901000" }, 1000), { ok: false, code: "BUILDING_QUEUE_FULL" });

const blankQueuePlan = verifiedScienceResearchPlanHazirla(queueState, { itemId: "901000" }, 1000);
assert.strictEqual(blankQueuePlan.ok, true);
assert.strictEqual(blankQueuePlan.queue.uuid, "science-1");
assert.strictEqual(blankQueuePlan.queue.qid, 1);

assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla({ queues: [{ uuid: "q-1", qid: 1, type: "SCIENCE", status: "running" }] }, { itemId: "901000", quuid: "q-1" }, 1000),
  { ok: false, code: "BUILDING_QUEUE_FULL" }
);
assert.deepStrictEqual(
  verifiedScienceResearchPlanHazirla({ queues: [{ uuid: "q-1", qid: 1, type: "SCIENCE", status: "free" }], science: { "901000": 1 } }, { itemId: "901000", quuid: "q-1" }, 1000),
  { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" }
);

// Exact init queue projection uses numeric type=6 and lives under
// lastShelterStarterAccountRuntime. The primary qid=1 queue is immediately free.
const starterQueueState = {
  lastShelterStarterAccountRuntime: {
    queues: [
      {
        itemObj: {},
        startTime: 0,
        updateTime: 0,
        endTime: 0,
        type: 6,
        uuid: "starter-science-1",
        qid: 1,
        isHelped: 0
      },
      {
        itemObj: {},
        startTime: 0,
        updateTime: 0,
        endTime: 5000,
        type: 6,
        uuid: "starter-science-2",
        qid: 2,
        isHelped: 0
      }
    ]
  },
  science: {}
};

assert.strictEqual(
  scienceQueueSec(
    starterQueueState,
    "",
    1000
  ).uuid,
  "starter-science-1"
);

// ScienceService explicit quuid path requires now >= queue.endTime.
assert.strictEqual(
  scienceQueueSec(
    starterQueueState,
    "starter-science-2",
    1000
  ),
  null
);
assert.strictEqual(
  scienceQueueSec(
    starterQueueState,
    "starter-science-2",
    6000
  ).uuid,
  "starter-science-2"
);

const starterPlan =
  verifiedScienceResearchPlanHazirla(
    starterQueueState,
    {
      itemId: "901000",
      quuid: "starter-science-1"
    },
    1000
  );

assert.strictEqual(
  starterPlan.ok,
  true
);

const starterApplied =
  verifiedScienceResearchPlaniniStateEt(
    starterQueueState,
    starterPlan
  );

assert.strictEqual(
  starterApplied.ok,
  true
);

const occupiedStarterQueue =
  starterQueueState
    .lastShelterStarterAccountRuntime
    .queues[0];

assert.strictEqual(
  occupiedStarterQueue.type,
  6
);
assert.strictEqual(
  occupiedStarterQueue.typeCode,
  6
);
assert.strictEqual(
  occupiedStarterQueue.typeName,
  "SCIENCE"
);
assert.deepStrictEqual(
  occupiedStarterQueue.itemObj,
  { itemId: "901000" }
);
assert.strictEqual(
  occupiedStarterQueue.startTime,
  1000
);
assert.strictEqual(
  occupiedStarterQueue.updateTime,
  91000
);
assert.strictEqual(
  occupiedStarterQueue.totalTime,
  90000
);
assert.strictEqual(
  scienceQueueMesguldur(
    starterQueueState,
    1000
  ),
  true
);
assert.deepStrictEqual(
  verifiedScienceResearchYekunlasdir(
    starterQueueState,
    90999
  ),
  []
);
assert.strictEqual(
  verifiedScienceResearchYekunlasdir(
    starterQueueState,
    91000
  ).length,
  1
);
assert.strictEqual(
  starterQueueState.science["901000"],
  1
);

const VERIFIED_NODES = [
  { itemId: "901000", seconds: 90, para1: "801", quality: 1 },
  { itemId: "901100", seconds: 90, para1: "802", quality: 1 },
  { itemId: "901200", seconds: 180, para1: "803", quality: 2 },
  { itemId: "901300", seconds: 180, para1: "804", quality: 2 }
];

for (const node of VERIFIED_NODES) {
  const queueUuid = `q-${node.itemId}`;
  const nodeState = { queues: [{ uuid: queueUuid, qid: 1, type: "SCIENCE", status: "free" }], science: {} };
  const nodePlan = verifiedScienceResearchPlanHazirla(
    nodeState,
    { itemId: node.itemId, quuid: queueUuid, gold: 7 },
    1000
  );
  assert.strictEqual(nodePlan.ok, true, node.itemId);
  assert.strictEqual(nodePlan.protocol, "science.research");
  assert.strictEqual(nodePlan.itemId, node.itemId);
  assert.strictEqual(nodePlan.queue.uuid, queueUuid);
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
  assert.strictEqual(nodeState.queues.length, 1, "selected persisted queue must be reused, not duplicated");
  assert.strictEqual(scienceQueueMesguldur(nodeState), true);
  assert.deepStrictEqual(verifiedScienceResearchYekunlasdir(nodeState, nodePlan.queue.finishUnixMs - 1), []);
  const completedNode = verifiedScienceResearchYekunlasdir(nodeState, nodePlan.queue.finishUnixMs);
  assert.strictEqual(completedNode.length, 1);
  assert.strictEqual(completedNode[0].itemId, node.itemId);
  assert.strictEqual(nodeState.science[node.itemId], 1);
  assert.strictEqual(nodeState.queues[0].status, "completed");
  assert.strictEqual(scienceQueueMesguldur(nodeState), false);
  assert.strictEqual(scienceArtıqArasdirilib(nodeState, node.itemId), true);
  assert.deepStrictEqual(
    verifiedScienceResearchPlanHazirla(nodeState, { itemId: node.itemId, quuid: queueUuid }, nodePlan.queue.finishUnixMs + 1),
    { ok: false, code: "SCIENCE_ALREADY_RESEARCHED" }
  );
}

console.log("PASS: verified Last Shelter science runtime selects/reuses free SCIENCE queues and enforces exact timing/effects.");
