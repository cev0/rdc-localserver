"use strict";

/*
 * Verified Last Shelter v1.250.102 troopTranList from a fresh-account init.
 * The four transfer trees and their 12 point IDs are kept raw. No semantic
 * names are invented for transfer type or pointType until server handlers are
 * independently recovered.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_TROOP_TRANSFER_TREES = deepFreeze([
  {
    "total": 10,
    "level": 0,
    "todayTranTimes": 0,
    "details": [
      {
        "level": 0,
        "pointType": "1",
        "id": "109000"
      },
      {
        "level": 0,
        "pointType": "2",
        "id": "109010"
      },
      {
        "level": 0,
        "pointType": "3",
        "id": "109020"
      },
      {
        "level": 0,
        "pointType": "4",
        "id": "109027"
      },
      {
        "level": 0,
        "pointType": "5",
        "id": "109034"
      },
      {
        "level": 0,
        "pointType": "6",
        "id": "109036"
      },
      {
        "level": 0,
        "pointType": "7",
        "id": "109038"
      },
      {
        "level": 0,
        "pointType": "8",
        "id": "109040"
      },
      {
        "level": 0,
        "pointType": "9",
        "id": "109042"
      },
      {
        "level": 0,
        "pointType": "10",
        "id": "109044"
      },
      {
        "level": 0,
        "pointType": "11",
        "id": "109046"
      },
      {
        "level": 0,
        "pointType": "12",
        "id": "109048"
      }
    ],
    "power": 0,
    "type": 1,
    "exp": 0,
    "singleCostAmount": 10
  },
  {
    "total": 10,
    "level": 0,
    "todayTranTimes": 0,
    "details": [
      {
        "level": 0,
        "pointType": "1",
        "id": "109050"
      },
      {
        "level": 0,
        "pointType": "2",
        "id": "109060"
      },
      {
        "level": 0,
        "pointType": "3",
        "id": "109070"
      },
      {
        "level": 0,
        "pointType": "4",
        "id": "109077"
      },
      {
        "level": 0,
        "pointType": "5",
        "id": "109084"
      },
      {
        "level": 0,
        "pointType": "6",
        "id": "109086"
      },
      {
        "level": 0,
        "pointType": "7",
        "id": "109088"
      },
      {
        "level": 0,
        "pointType": "8",
        "id": "109090"
      },
      {
        "level": 0,
        "pointType": "9",
        "id": "109092"
      },
      {
        "level": 0,
        "pointType": "10",
        "id": "109094"
      },
      {
        "level": 0,
        "pointType": "11",
        "id": "109096"
      },
      {
        "level": 0,
        "pointType": "12",
        "id": "109098"
      }
    ],
    "power": 0,
    "type": 2,
    "exp": 0,
    "singleCostAmount": 10
  },
  {
    "total": 10,
    "level": 0,
    "todayTranTimes": 0,
    "details": [
      {
        "level": 0,
        "pointType": "1",
        "id": "109100"
      },
      {
        "level": 0,
        "pointType": "2",
        "id": "109110"
      },
      {
        "level": 0,
        "pointType": "3",
        "id": "109120"
      },
      {
        "level": 0,
        "pointType": "4",
        "id": "109127"
      },
      {
        "level": 0,
        "pointType": "5",
        "id": "109134"
      },
      {
        "level": 0,
        "pointType": "6",
        "id": "109136"
      },
      {
        "level": 0,
        "pointType": "7",
        "id": "109138"
      },
      {
        "level": 0,
        "pointType": "8",
        "id": "109140"
      },
      {
        "level": 0,
        "pointType": "9",
        "id": "109142"
      },
      {
        "level": 0,
        "pointType": "10",
        "id": "109144"
      },
      {
        "level": 0,
        "pointType": "11",
        "id": "109146"
      },
      {
        "level": 0,
        "pointType": "12",
        "id": "109148"
      }
    ],
    "power": 0,
    "type": 3,
    "exp": 0,
    "singleCostAmount": 10
  },
  {
    "total": 10,
    "level": 0,
    "todayTranTimes": 0,
    "details": [
      {
        "level": 0,
        "pointType": "1",
        "id": "109150"
      },
      {
        "level": 0,
        "pointType": "2",
        "id": "109160"
      },
      {
        "level": 0,
        "pointType": "3",
        "id": "109170"
      },
      {
        "level": 0,
        "pointType": "4",
        "id": "109177"
      },
      {
        "level": 0,
        "pointType": "5",
        "id": "109184"
      },
      {
        "level": 0,
        "pointType": "6",
        "id": "109186"
      },
      {
        "level": 0,
        "pointType": "7",
        "id": "109188"
      },
      {
        "level": 0,
        "pointType": "8",
        "id": "109190"
      },
      {
        "level": 0,
        "pointType": "9",
        "id": "109192"
      },
      {
        "level": 0,
        "pointType": "10",
        "id": "109194"
      },
      {
        "level": 0,
        "pointType": "11",
        "id": "109196"
      },
      {
        "level": 0,
        "pointType": "12",
        "id": "109198"
      }
    ],
    "power": 0,
    "type": 4,
    "exp": 0,
    "singleCostAmount": 10
  }
]);

function troopTransferTreeAl(type) {
  const n = Number(type);
  const found = LAST_SHELTER_TROOP_TRANSFER_TREES.find(x => x.type === n);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

function troopTransferPointAl(type, pointType) {
  const tree = troopTransferTreeAl(type);
  if (!tree) return null;

  const key = String(pointType);
  const point = tree.details.find(x => String(x.pointType) === key);
  return point ? { ...point } : null;
}

function troopTransferRuntimeDefaultHazirla() {
  return LAST_SHELTER_TROOP_TRANSFER_TREES.map(tree => ({
    type: tree.type,
    total: tree.total,
    level: tree.level,
    todayTranTimes: tree.todayTranTimes,
    power: tree.power,
    exp: tree.exp,
    singleCostAmount: tree.singleCostAmount,
    details: tree.details.map(x => ({ ...x }))
  }));
}

module.exports = {
  LAST_SHELTER_TROOP_TRANSFER_TREES,
  troopTransferTreeAl,
  troopTransferPointAl,
  troopTransferRuntimeDefaultHazirla
};
