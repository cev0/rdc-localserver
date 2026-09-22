"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE,
  allianceGroupPurchaseOfferAl,
  allianceGroupPurchaseOffersByKeyAl,
  allianceGroupPurchaseRewardPlaniHazirla,
  allianceGroupPurchaseRuntimeDefaultHazirla
} = require("./last_shelter_alliance_group_purchase_reference");

assert.strictEqual(LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.activityId,"57032");
assert.strictEqual(LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.max,10);
assert.deepStrictEqual(
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.observedWindow,
  {startTime:1480003200000,endTime:1480348800000}
);
assert.deepStrictEqual(
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.exchange,
  [
    {id:"1611250097",count:1},
    {id:"1611250098",count:5}
  ]
);
assert.strictEqual(LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.offers.length,6);

const byKey = allianceGroupPurchaseOffersByKeyAl();
assert.deepStrictEqual(Object.keys(byKey).sort(),["k1","k2","k3","k4","k5","k6"]);
assert.deepStrictEqual(
  [byKey.k1.times,byKey.k2.times,byKey.k3.times,byKey.k4.times,byKey.k5.times,byKey.k6.times],
  [0,20,50,100,200,500]
);
assert.deepStrictEqual(
  [byKey.k1.goodsId,byKey.k2.goodsId,byKey.k3.goodsId,byKey.k4.goodsId,byKey.k5.goodsId,byKey.k6.goodsId],
  ["207053","207054","207055","207056","207057","207058"]
);

const offer = allianceGroupPurchaseOfferAl("207058");
assert.strictEqual(offer.reward.length,16);
assert.deepStrictEqual(offer.reward[0],{id:"200364",num:5});
assert.deepStrictEqual(offer.reward[1],{id:"200366",num:1});
assert.deepStrictEqual(offer.reward[3],{id:"200200",num:10});
assert.deepStrictEqual(offer.reward[15],{id:"200331",num:5});

const plan = allianceGroupPurchaseRewardPlaniHazirla("207053");
assert.deepStrictEqual(plan,{
  activityId:"57032",
  goodsId:"207053",
  key:"k1",
  times:0,
  reward:[{"id":"200364","num":2},{"id":"200201","num":30},{"id":"200226","num":10},{"id":"200300","num":10},{"id":"200309","num":5},{"id":"200310","num":5},{"id":"200319","num":5},{"id":"200320","num":10},{"id":"200329","num":5},{"id":"200330","num":5},{"id":"200339","num":5}]
});
assert.strictEqual(allianceGroupPurchaseRewardPlaniHazirla("nope"),null);

// Mutating a lookup copy must not alter the authoritative source.
offer.reward[0].num = 999;
assert.strictEqual(
  allianceGroupPurchaseOfferAl("207058").reward[0].num,
  5
);

assert.deepStrictEqual(
  allianceGroupPurchaseRuntimeDefaultHazirla(),
  {
    activityId:"57032",
    progress:0,
    selectedOptionalRewardIndex:0,
    lotteryNum:0,
    awardIndex:0,
    sendFlag:0
  }
);

console.log("PASS: verified Last Shelter alliance group-purchase offers/rewards are preserved.");
