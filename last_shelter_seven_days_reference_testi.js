"use strict";

const assert = require("assert");
const {
  SEVEN_DAYS_DURATION_MS,
  LAST_SHELTER_SEVEN_DAYS_REWARD,
  LAST_SHELTER_SEVEN_DAYS_TASK_INFO,
  LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT,
  sevenDaysPageMapHazirla,
  sevenDaysTaskIdsAl,
  sevenDaysTopologyYoxla,
  sevenDaysRuntimeDefaultHazirla,
  lastShelterSevenDaysRuntimeTeminEt
} = require("./last_shelter_seven_days_reference");

assert.strictEqual(SEVEN_DAYS_DURATION_MS,604800000);
assert.strictEqual(LAST_SHELTER_SEVEN_DAYS_REWARD.length,9);
assert.strictEqual(LAST_SHELTER_SEVEN_DAYS_TASK_INFO.length,5);

const pages = sevenDaysPageMapHazirla();
assert.strictEqual(pages.length,15);
assert.deepStrictEqual(
  pages.map(x => x.pageId),
  [
    "800052","800048","800054",
    "800046","800047","800051",
    "800049","800050","800053",
    "800043","800044","800045",
    "800055","800056","800057"
  ]
);

const ids = sevenDaysTaskIdsAl();
assert.strictEqual(ids.length,100);
assert.strictEqual(new Set(ids).size,100);

assert.deepStrictEqual(sevenDaysTopologyYoxla(),{
  valid:true,
  missing:[],
  wrongType:[],
  taskCount:100
});

assert.deepStrictEqual(LAST_SHELTER_SEVEN_DAYS_ACTIVITY_DEFAULT,{
  finishFlg:0,taskCount:100,count:0,unlockFlg:1,type:49
});

const runtime = sevenDaysRuntimeDefaultHazirla(1789659007819);
assert.strictEqual(runtime.startTime,1789659007819);
assert.strictEqual(runtime.endTime,1790263807819);
assert.strictEqual(runtime.endTime-runtime.startTime,604800000);

const state = {
  lastShelterResourceRuntime:{regTime:1000}
};
const first = lastShelterSevenDaysRuntimeTeminEt(state,9999);
assert.strictEqual(first.startTime,1000);
assert.strictEqual(first.endTime,604801000);
first.count = 12;
const second = lastShelterSevenDaysRuntimeTeminEt(state,9999);
assert.strictEqual(second.count,12);

console.log("PASS: Last Shelter seven-day activity topology maps exactly to all 100 type-49 tasks.");
