"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_FIRST_PAY_REWARD,
  LAST_SHELTER_ONLINE_DURATION,
  LAST_SHELTER_HELICOPTER,
  onlineDurationRewardAl,
  onlineDurationRewardsSnapshotHazirla,
  helicopterTaskTemplateAl,
  lastShelterEngagementRuntimeDefaultHazirla,
  lastShelterEngagementRuntimeTeminEt
} = require("./last_shelter_engagement_reward_reference");

assert.deepStrictEqual(LAST_SHELTER_FIRST_PAY_REWARD, [
  { type:7, value:{ num:4, id:"200301" } },
  { type:7, value:{ num:4, id:"200331" } },
  { type:7, value:{ num:6, id:"200200" } },
  { type:7, value:{ num:5, id:"200364" } }
]);

assert.strictEqual(LAST_SHELTER_ONLINE_DURATION.onlineDurationRecruitHero, "240041");
assert.strictEqual(LAST_SHELTER_ONLINE_DURATION.rewards.length, 6);
assert.deepStrictEqual(
  LAST_SHELTER_ONLINE_DURATION.rewards.map(x => [x.entryId,x.durationMax,x.rewardState]),
  [["1",5,1],["2",3,2],["3",3,2],["4",3,2],["5",3,2],["6",3,2]]
);
assert.deepStrictEqual(
  LAST_SHELTER_ONLINE_DURATION.rewards.map(x => x.rewardArray[0].value),
  [30,40,50,60,80,100]
);
assert.deepStrictEqual(
  onlineDurationRewardAl("6").rewardArray[2],
  { type:7, value:{ num:5, id:"200200" } }
);

assert.deepStrictEqual(LAST_SHELTER_HELICOPTER.recordDefaults, {
  freeRefreshCount:0,
  todayTaskCount:0,
  todayTaskCountLimit:10
});
assert.strictEqual(LAST_SHELTER_HELICOPTER.cdgoldk, 1);
assert.strictEqual(LAST_SHELTER_HELICOPTER.refugeeLimit, 4);
assert.deepStrictEqual(
  LAST_SHELTER_HELICOPTER.taskTemplates.map(x => x.id),
  [330017,330018,330019,330076,330110]
);
assert.deepStrictEqual(
  helicopterTaskTemplateAl(330017).rewardInfo,
  [{type:0,value:931},{type:3,value:399}]
);
assert.deepStrictEqual(
  helicopterTaskTemplateAl(330110).rewardInfo,
  [{type:0,value:24045},{type:3,value:16030}]
);
assert.strictEqual(helicopterTaskTemplateAl(999999), null);

for (const row of LAST_SHELTER_HELICOPTER.taskTemplates) {
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(row,"startTime"),
    false,
    "Dynamic reference-account startTime must not become static config."
  );
  assert.strictEqual(row.observedInitialState,1);
}

const runtime = lastShelterEngagementRuntimeDefaultHazirla();
assert.strictEqual(runtime.firstPayRewardClaimed,false);
assert.strictEqual(runtime.onlineDuration.rewards.length,6);
assert.strictEqual(runtime.helicopter.record.todayTaskCountLimit,10);
assert.strictEqual(runtime.helicopter.taskState.length,5);

const state = {};
const projected = onlineDurationRewardsSnapshotHazirla(state);
assert.strictEqual(projected.length,6);
projected[0].duration=99;
assert.strictEqual(onlineDurationRewardsSnapshotHazirla(state)[0].duration,0);
const first = lastShelterEngagementRuntimeTeminEt(state);
first.firstPayRewardClaimed = true;
const second = lastShelterEngagementRuntimeTeminEt(state);
assert.strictEqual(second.firstPayRewardClaimed,true);

console.log("PASS: Last Shelter first-pay, online-duration, and helicopter reward contracts are preserved.");
