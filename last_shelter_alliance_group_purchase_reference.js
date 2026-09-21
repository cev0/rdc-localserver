"use strict";

/*
 * Verified Last Shelter v1.250.102 alliance group-purchase activity (57032).
 *
 * Four independent init snapshots agree on max=10, exchange requirements and
 * all six goods/reward/times/key rows. activityInfo.s changed between snapshots
 * (0 -> 2), so it is runtime progress and is intentionally excluded from this
 * static catalog.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_ALLIANCE_GROUP_PURCHASE = deepFreeze({
  activityId:"57032",
  observedWindow:{
    startTime:1480003200000,
    endTime:1480348800000
  },
  max:10,
  exchange:[
    { id:"1611250097", count:1 },
    { id:"1611250098", count:5 }
  ],
  offers:[
  {
    "goodsId": "207055",
    "reward": [
      {
        "id": "200364",
        "num": 6
      },
      {
        "id": "200201",
        "num": 25
      },
      {
        "id": "200226",
        "num": 20
      },
      {
        "id": "200300",
        "num": 20
      },
      {
        "id": "200309",
        "num": 5
      },
      {
        "id": "200310",
        "num": 15
      },
      {
        "id": "200319",
        "num": 5
      },
      {
        "id": "200320",
        "num": 15
      },
      {
        "id": "200329",
        "num": 5
      },
      {
        "id": "200330",
        "num": 15
      },
      {
        "id": "200339",
        "num": 5
      }
    ],
    "times": 50,
    "key": "k3"
  },
  {
    "goodsId": "207056",
    "reward": [
      {
        "id": "200364",
        "num": 9
      },
      {
        "id": "200201",
        "num": 15
      },
      {
        "id": "200226",
        "num": 20
      },
      {
        "id": "200200",
        "num": 3
      },
      {
        "id": "200300",
        "num": 6
      },
      {
        "id": "200309",
        "num": 6
      },
      {
        "id": "200301",
        "num": 3
      },
      {
        "id": "200310",
        "num": 6
      },
      {
        "id": "200319",
        "num": 6
      },
      {
        "id": "200311",
        "num": 3
      },
      {
        "id": "200320",
        "num": 6
      },
      {
        "id": "200329",
        "num": 6
      },
      {
        "id": "200321",
        "num": 3
      },
      {
        "id": "200330",
        "num": 5
      },
      {
        "id": "200339",
        "num": 5
      },
      {
        "id": "200331",
        "num": 3
      }
    ],
    "times": 100,
    "key": "k4"
  },
  {
    "goodsId": "207057",
    "reward": [
      {
        "id": "200365",
        "num": 1
      },
      {
        "id": "200366",
        "num": 1
      },
      {
        "id": "200226",
        "num": 30
      },
      {
        "id": "200200",
        "num": 5
      },
      {
        "id": "200300",
        "num": 6
      },
      {
        "id": "200309",
        "num": 6
      },
      {
        "id": "200301",
        "num": 3
      },
      {
        "id": "200310",
        "num": 6
      },
      {
        "id": "200319",
        "num": 6
      },
      {
        "id": "200311",
        "num": 3
      },
      {
        "id": "200320",
        "num": 6
      },
      {
        "id": "200329",
        "num": 6
      },
      {
        "id": "200321",
        "num": 3
      },
      {
        "id": "200330",
        "num": 5
      },
      {
        "id": "200339",
        "num": 5
      },
      {
        "id": "200331",
        "num": 3
      }
    ],
    "times": 200,
    "key": "k5"
  },
  {
    "goodsId": "207058",
    "reward": [
      {
        "id": "200364",
        "num": 5
      },
      {
        "id": "200366",
        "num": 1
      },
      {
        "id": "200226",
        "num": 30
      },
      {
        "id": "200200",
        "num": 10
      },
      {
        "id": "200300",
        "num": 6
      },
      {
        "id": "200309",
        "num": 6
      },
      {
        "id": "200301",
        "num": 5
      },
      {
        "id": "200310",
        "num": 6
      },
      {
        "id": "200319",
        "num": 6
      },
      {
        "id": "200311",
        "num": 5
      },
      {
        "id": "200320",
        "num": 6
      },
      {
        "id": "200329",
        "num": 6
      },
      {
        "id": "200321",
        "num": 5
      },
      {
        "id": "200330",
        "num": 6
      },
      {
        "id": "200339",
        "num": 6
      },
      {
        "id": "200331",
        "num": 5
      }
    ],
    "times": 500,
    "key": "k6"
  },
  {
    "goodsId": "207053",
    "reward": [
      {
        "id": "200364",
        "num": 2
      },
      {
        "id": "200201",
        "num": 30
      },
      {
        "id": "200226",
        "num": 10
      },
      {
        "id": "200300",
        "num": 10
      },
      {
        "id": "200309",
        "num": 5
      },
      {
        "id": "200310",
        "num": 5
      },
      {
        "id": "200319",
        "num": 5
      },
      {
        "id": "200320",
        "num": 10
      },
      {
        "id": "200329",
        "num": 5
      },
      {
        "id": "200330",
        "num": 5
      },
      {
        "id": "200339",
        "num": 5
      }
    ],
    "times": 0,
    "key": "k1"
  },
  {
    "goodsId": "207054",
    "reward": [
      {
        "id": "200364",
        "num": 4
      },
      {
        "id": "200201",
        "num": 25
      },
      {
        "id": "200226",
        "num": 15
      },
      {
        "id": "200300",
        "num": 15
      },
      {
        "id": "200309",
        "num": 5
      },
      {
        "id": "200310",
        "num": 5
      },
      {
        "id": "200319",
        "num": 5
      },
      {
        "id": "200320",
        "num": 10
      },
      {
        "id": "200329",
        "num": 5
      },
      {
        "id": "200330",
        "num": 10
      },
      {
        "id": "200339",
        "num": 5
      }
    ],
    "times": 20,
    "key": "k2"
  }
]
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function allianceGroupPurchaseOfferAl(goodsId) {
  const id = goodsId == null ? "" : String(goodsId).trim();
  const row = LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.offers
    .find(x => x.goodsId === id);
  return row ? clone(row) : null;
}

function allianceGroupPurchaseOffersByKeyAl() {
  const out = {};
  for (const row of LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.offers) {
    out[row.key] = clone(row);
  }
  return out;
}

function allianceGroupPurchaseRewardPlaniHazirla(goodsId) {
  const row = allianceGroupPurchaseOfferAl(goodsId);
  if (!row) return null;

  return {
    activityId:LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.activityId,
    goodsId:row.goodsId,
    key:row.key,
    times:row.times,
    reward:row.reward.map(x => ({ ...x }))
  };
}

function allianceGroupPurchaseRuntimeDefaultHazirla() {
  return {
    activityId:LAST_SHELTER_ALLIANCE_GROUP_PURCHASE.activityId,
    progress:0,
    selectedOptionalRewardIndex:0,
    lotteryNum:0,
    awardIndex:0,
    sendFlag:0
  };
}

module.exports = {
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE,
  allianceGroupPurchaseOfferAl,
  allianceGroupPurchaseOffersByKeyAl,
  allianceGroupPurchaseRewardPlaniHazirla,
  allianceGroupPurchaseRuntimeDefaultHazirla
};
