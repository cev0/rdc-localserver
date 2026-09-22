"use strict";
const assert = require("assert");
const {
  sourceScienceResearchPlan, sourceScienceResearch, sourceScienceUpgrade,
  sourceSecondScienceQueueUnlocked, sourceScienceEffects
} = require("./last_shelter_science_mutation");
const { verifiedScienceResearchYekunlasdir, verifiedScienceResearchDeadlineAtMs } = require("./last_shelter_science_runtime_adapteri");
const { scienceLevelAl } = require("./last_shelter_science_prerequisite_runtime");
const { RuntimeCommandRouter } = require("./runtime_command_router");
const { lastShelterQueueScienceCommandleriniQeydEt } = require("./runtime_last_shelter_queue_science_commands");
const { postgresAuthoritativeMutationExecutorYarat } = require("./runtime_pg_authoritative_mutation");
const { stateIdempotencyExecutorYarat } = require("./runtime_request_idempotency");
const clone = value => JSON.parse(JSON.stringify(value));
function fixture() {
  return { playerId: "p1", resources: { money: 100000, wood: 100000, iron: 100000, stone: 100000, food: 100000 },
    buildings: [{ buildingId: "institute", instanceId: "academy", isCompleted: true, level: 1 }],
    queues: [{ uuid: "q1", type: 6, qid: 1, updateTime: 0, endTime: 0, itemObj: {} }], science: {} };
}

const plain = fixture(), untouched = clone(plain);
const plan = sourceScienceResearchPlan(plain, { itemId: "901000", finishUnixMs: 1, costs: {} }, 1000);
assert(plan.ok);
assert.strictEqual(plan.queue.finishUnixMs, 91000);
assert.strictEqual(plan.costs.resources.money, 1000);
assert.deepStrictEqual(plain, untouched, "Planning cannot initialize wallets/queues or debit state");
plain.buildings = [];
const noAcademy = clone(plain);
assert.strictEqual(sourceScienceResearch(plain, { itemId: "901000", buildingLevel: 99 }, 1000).code, "BUILDING_CONDITION_NOT_MET");
assert.deepStrictEqual(plain, noAcademy);
plain.buildings = untouched.buildings;
plain.resources.money = 999;
const poor = clone(plain);
assert.strictEqual(sourceScienceResearch(plain, { itemId: "901000" }, 1000).code, "USERRESOURCE_IS_NOT_ENOUGH");
assert.deepStrictEqual(plain, poor);
assert.strictEqual(sourceScienceResearch(plain, { itemId: "901000", gold: 1 }, 1000).code, "SCIENCE_GOLD_TOPUP_UNMIGRATED");
assert.deepStrictEqual(plain, poor);
assert.strictEqual(sourceScienceResearch(plain, { itemId: "901000", gold: -1 }, 1000).code, "INVALID_OPT");

const multi = fixture();
assert.strictEqual(sourceScienceResearch(multi, { itemId: "901700" }, 1000).code, "SCIENCE_CONDITION_NOT_MET");
multi.science["901600"] = 1;
const first = sourceScienceResearch(multi, { itemId: "901700" }, 1000);
assert(first.ok);
assert.strictEqual(multi.resources.wood, 94300);
assert.strictEqual(multi.resources.iron, 98200);
assert.strictEqual(multi.resources.money, 97000);
const busy = clone(multi);
assert(!sourceScienceResearch(multi, { itemId: "901700" }, 2000).ok);
assert.deepStrictEqual(multi, busy);
assert.strictEqual(verifiedScienceResearchDeadlineAtMs(multi), first.queue.finishUnixMs);
assert.deepStrictEqual(verifiedScienceResearchYekunlasdir(multi, first.queue.finishUnixMs - 1), []);
assert.strictEqual(sourceScienceUpgrade(multi, { itemId: "901000", quuid: "q1" }, first.queue.finishUnixMs).ok, false);
assert.strictEqual(sourceScienceUpgrade(multi, { itemId: "901700", quuid: "q1" }, first.queue.finishUnixMs - 1001).code, "SCIENCE_CD_NOT_REACHED");
assert.strictEqual(verifiedScienceResearchYekunlasdir(multi, first.queue.finishUnixMs).length, 1);
assert.strictEqual(multi.science["901700"], 1);
assert.deepStrictEqual(verifiedScienceResearchYekunlasdir(multi, first.queue.finishUnixMs), []);
const reloaded = clone(multi);
const second = sourceScienceResearch(reloaded, { itemId: "901700" }, first.queue.finishUnixMs + 1);
assert(second.ok);
assert.strictEqual(second.targetLevel, 2);
assert.strictEqual(second.costs.resources.wood, 8600);
assert.strictEqual(second.costs.resources.money, 4200);
assert.strictEqual(second.queue.totalTime, 1020000);
verifiedScienceResearchYekunlasdir(reloaded, second.queue.finishUnixMs);
assert.strictEqual(reloaded.science["901700"], 2);
assert.strictEqual(sourceScienceEffects(reloaded)[807], 15, "Use current level plus the prerequisite node, not cumulative level totals");
assert.strictEqual(sourceScienceResearch(reloaded, { itemId: "901701" }, second.queue.finishUnixMs).code, "SCIENCE_ITEM_UNVERIFIED");
reloaded.science["901700"] = 5;
assert.strictEqual(sourceScienceResearch(reloaded, { itemId: "901700" }, second.queue.finishUnixMs).code, "SCIENCE_ALREADY_RESEARCHED");

const goods = fixture();
goods.lastShelterStarterAccountRuntime = { items: [{ itemId: "210163", count: 4 }] };
const goodsBefore = clone(goods);
assert.strictEqual(sourceScienceResearch(goods, { itemId: "902500" }, 1000).code, "SILVER_MEDAL_NOT_ENOUGH");
assert.deepStrictEqual(goods, goodsBefore, "Item shortage must not debit resources or start a queue");
goods.lastShelterStarterAccountRuntime.items.push({ itemId: "210163", count: 2 });
assert(sourceScienceResearch(goods, { itemId: "902500" }, 1000).ok);
assert.strictEqual(goods.lastShelterStarterAccountRuntime.items.reduce((n, item) => n + item.count, 0), 1);
assert.strictEqual(goods.resources.money, 97400);

const arrayState = fixture();
arrayState.science = [{ itemId: "901000", level: 1, marker: "keep" }];
const arrayPlan = sourceScienceResearch(arrayState, { itemId: "901100" }, 1000);
verifiedScienceResearchYekunlasdir(arrayState, arrayPlan.queue.finishUnixMs);
assert.deepStrictEqual(arrayState.science[0], { itemId: "901000", level: 1, marker: "keep" });
assert.strictEqual(scienceLevelAl(arrayState, "901100"), 1);

const two = fixture();
two.queues.push({ uuid: "q2", qid: 2, type: 6, updateTime: 0, endTime: 9999999, itemObj: {} });
two.secondQueueUnlocked = true;
assert.strictEqual(sourceSecondScienceQueueUnlocked(two), false);
assert.strictEqual(sourceScienceResearch(two, { itemId: "901000", quuid: "q2" }, 1000).code, "BUILDING_QUEUE_FULL");
two.lastShelterHeroRuntime = { heroes: [{ heroId: 42, skills: [{ skillId: "61012" }] }] };
assert.strictEqual(sourceSecondScienceQueueUnlocked(two), false, "Owning a hero without stationing is insufficient");
two.buildings[0].heroId = "42";
assert.strictEqual(sourceSecondScienceQueueUnlocked(two), true);
assert(sourceScienceResearch(two, { itemId: "901000", quuid: "q2" }, 1000).ok);
assert(sourceScienceResearch(two, { itemId: "901100" }, 1000).ok);
assert.strictEqual(sourceScienceUpgrade(two, { itemId: "901000", quuid: "q2" }, 90000).level, 1);
assert.strictEqual(two.queues[0].status, "running", "Explicit upgrade cannot finish another queue early");

const modifiers = fixture();
modifiers.lastShelterScienceRuntime = { externalEffects: { SCIENCE_RESEARCH_MONEY_COST: 25, NORMAL_SCIENCE_RESEARCH_TIME: 50 } };
const modified = sourceScienceResearch(modifiers, { itemId: "901000", effects: { SCIENCE_COST_ALL_RATE: -100 } }, 1000);
assert(modified.ok);
assert.strictEqual(modified.costs.resources.money, 800);
assert.strictEqual(modified.queue.totalTime, 60000);

(async () => {
  // Use the real router, persistence wrapper and replay executor with a
  // transactional serialized store. This does not claim a live PostgreSQL test.
  const live = fixture();
  let persisted = clone(live), clock = 1000, rollback = false, commits = 0;
  const sent = [];
  const authoritative = postgresAuthoritativeMutationExecutorYarat({
    getOrCreatePlayerState: () => live,
    prepareLockedState: state => verifiedScienceResearchYekunlasdir(state, clock),
    transactionExecutor: async (_id, _live, operation) => {
      const locked = clone(persisted), sentBefore = sent.length;
      const result = await operation(locked);
      assert.strictEqual(sent.length, sentBefore, "No success response before commit");
      if (rollback) throw new Error("simulated commit failure");
      if (result.deyisdi) { persisted = clone(locked); commits++; }
    }
  });
  const router = new RuntimeCommandRouter({ authoritativeMutationExecutor: authoritative,
    idempotencyExecutor: stateIdempotencyExecutorYarat({ getPlayerState: () => live, nowMs: () => clock }),
    logger: { error() {} }
  });
  lastShelterQueueScienceCommandleriniQeydEt(router, { getOrCreatePlayerState: () => live });
  const request = { type: "science.research", requestId: "science-1", itemId: "901000" };
  const dispatch = (msg = request) => router.dispatch({ msg, ws: { _authedPlayerId: "p1" }, nowMs: () => clock, send: (_ws, payload) => sent.push(payload) });
  await dispatch();
  const response = clone(sent.at(-1)), afterStart = clone(persisted);
  assert.strictEqual(response.type, "science.research");
  assert.strictEqual(persisted.resources.money, 99000);
  live.resources.money = 1; // stale RAM must not replace committed state.
  await dispatch();
  assert.deepStrictEqual(sent.at(-1), response);
  assert.deepStrictEqual(persisted, afterStart);
  assert.strictEqual(commits, 1);
  clock = 92000;
  await dispatch({ type: "science.upgrade", requestId: "finish-1", itemId: "901000", quuid: "q1" });
  assert.strictEqual(persisted.science["901000"], 1);
  assert.strictEqual(sent.at(-1).level, 1);
  const beforeRollback = clone(persisted), liveBeforeRollback = clone(live);
  rollback = true;
  await dispatch({ type: "science.research", requestId: "science-2", itemId: "901100" });
  assert.strictEqual(sent.at(-1).code, "COMMAND_HANDLER_FAILED");
  assert.deepStrictEqual(persisted, beforeRollback);
  assert.deepStrictEqual(live, liveBeforeRollback);
  rollback = false;
  await dispatch({ type: "science.research", requestId: "science-2", itemId: "901100" });
  assert.strictEqual(persisted.resources.money, 98000, "Retry after rollback debits once");
  const beforeMismatch = clone(persisted.resources);
  await dispatch({ type: "science.research", requestId: "spoof", playerId: "p2", itemId: "901200" });
  assert.strictEqual(sent.at(-1).code, "PLAYER_ID_MISMATCH");
  assert.deepStrictEqual(persisted.resources, beforeMismatch);
  console.log("PASS: source science costs, levels, prerequisites, goods, stationing, reload, replay and transaction rollback.");
})().catch(error => { console.error(error); process.exitCode = 1; });
