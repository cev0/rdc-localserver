"use strict";

/*
 * Verified Last Shelter repayment/recharge-reward reference from four init
 * snapshots. Reward thresholds, colors and reward payloads are stable across
 * all captures. payPoint is player runtime state (300 in one snapshot, 0 in
 * the others), so it is not stored as static configuration.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_REPAY_REFERENCE = deepFreeze({
  observedWindow:{
    startTime:1479916800000,
    endTime:1480435200000
  },
  payRewards:[
  {
    "point": 400,
    "reward": [
      {
        "value": 400,
        "type": 5
      },
      {
        "value": {
          "id": "200392",
          "num": 1
        },
        "type": 7
      }
    ],
    "color": 1
  },
  {
    "point": 2000,
    "reward": [
      {
        "value": 2000,
        "type": 5
      },
      {
        "value": {
          "id": "200906",
          "num": 2
        },
        "type": 7
      }
    ],
    "color": 1
  },
  {
    "point": 30000,
    "reward": [
      {
        "value": 20000,
        "type": 5
      },
      {
        "value": {
          "id": "200902",
          "num": 2
        },
        "type": 7
      },
      {
        "value": {
          "id": "209717",
          "num": 5
        },
        "type": 7
      }
    ],
    "color": 2
  },
  {
    "point": 120000,
    "reward": [
      {
        "value": 60000,
        "type": 5
      },
      {
        "value": {
          "id": "209717",
          "num": 5
        },
        "type": 7
      },
      {
        "value": {
          "id": "200402",
          "num": 20
        },
        "type": 7
      }
    ],
    "color": 2
  },
  {
    "point": 450000,
    "reward": [
      {
        "value": 200000,
        "type": 5
      },
      {
        "value": {
          "id": "200047",
          "num": 10000
        },
        "type": 7
      },
      {
        "value": {
          "id": "208006",
          "num": 2
        },
        "type": 7
      },
      {
        "value": {
          "id": "208008",
          "num": 5
        },
        "type": 7
      }
    ],
    "color": 3
  },
  {
    "point": 1200000,
    "reward": [
      {
        "value": 400000,
        "type": 5
      },
      {
        "value": {
          "id": "200202",
          "num": 100
        },
        "type": 7
      },
      {
        "value": {
          "id": "208017",
          "num": 10
        },
        "type": 7
      },
      {
        "value": {
          "id": "208006",
          "num": 5
        },
        "type": 7
      },
      {
        "value": {
          "id": "200463",
          "num": 5
        },
        "type": 7
      }
    ],
    "color": 3
  }
]
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function repayRewardThresholdAl(point) {
  const n = Number(point);
  if (!Number.isFinite(n)) return null;
  const row = LAST_SHELTER_REPAY_REFERENCE.payRewards
    .find(x => x.point === Math.trunc(n));
  return row ? clone(row) : null;
}

function repayEligibleRewardsAl(payPoint) {
  const n = Math.max(0,Math.trunc(Number(payPoint) || 0));
  return LAST_SHELTER_REPAY_REFERENCE.payRewards
    .filter(x => n >= x.point)
    .map(clone);
}

function repayRuntimeDefaultHazirla() {
  return {
    payPoint:0,
    claimedPoints:[]
  };
}

module.exports = {
  LAST_SHELTER_REPAY_REFERENCE,
  repayRewardThresholdAl,
  repayEligibleRewardsAl,
  repayRuntimeDefaultHazirla
};
