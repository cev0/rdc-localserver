"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_REPAY_REFERENCE,
  repayRewardThresholdAl,
  repayEligibleRewardsAl,
  repayRuntimeDefaultHazirla,
  lastShelterRepayRuntimeTeminEt
} = require("./last_shelter_repay_reference");

assert.deepStrictEqual(
  LAST_SHELTER_REPAY_REFERENCE.observedWindow,
  {startTime:1479916800000,endTime:1480435200000}
);
assert.deepStrictEqual(
  LAST_SHELTER_REPAY_REFERENCE.payRewards.map(x=>x.point),
  [400,2000,30000,120000,450000,1200000]
);
assert.deepStrictEqual(
  LAST_SHELTER_REPAY_REFERENCE.payRewards.map(x=>x.color),
  [1,1,2,2,3,3]
);

assert.deepStrictEqual(
  repayRewardThresholdAl(400),
  {"point":400,"reward":[{"value":400,"type":5},{"value":{"id":"200392","num":1},"type":7}],"color":1}
);
assert.deepStrictEqual(
  repayRewardThresholdAl(1200000),
  {"point":1200000,"reward":[{"value":400000,"type":5},{"value":{"id":"200202","num":100},"type":7},{"value":{"id":"208017","num":10},"type":7},{"value":{"id":"208006","num":5},"type":7},{"value":{"id":"200463","num":5},"type":7}],"color":3}
);
assert.strictEqual(repayRewardThresholdAl(12345),null);

assert.deepStrictEqual(
  repayEligibleRewardsAl(300),
  []
);
assert.deepStrictEqual(
  repayEligibleRewardsAl(2000).map(x=>x.point),
  [400,2000]
);
assert.deepStrictEqual(
  repayEligibleRewardsAl(9999999).map(x=>x.point),
  [400,2000,30000,120000,450000,1200000]
);

assert.deepStrictEqual(
  repayRuntimeDefaultHazirla(),
  {payPoint:0,claimedPoints:[]}
);

const runtimeState={
  lastShelterRepay:{
    payPoint:"2000.9",
    claimedPoints:[2000,"400",400,-1,"bad"]
  }
};
assert.deepStrictEqual(
  lastShelterRepayRuntimeTeminEt(runtimeState),
  {payPoint:2000,claimedPoints:[400,2000]}
);
const emptyState={};
assert.deepStrictEqual(
  lastShelterRepayRuntimeTeminEt(emptyState),
  {payPoint:0,claimedPoints:[]}
);

console.log("PASS: verified Last Shelter repay thresholds/rewards are preserved.");
