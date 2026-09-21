"use strict";

/*
 * Last Shelter Survival v1.250.102 VipStoreMessageHandler/newPanelInfo
 * reference captured three times from two accounts with identical catalog
 * payloads. Currency code 10 is kept numeric: no unverified resource-name
 * mapping is invented here.
 */

const VIP_STORE_PROTOCOL = Object.freeze({
  requestHandler: "VipStoreMessageHandler",
  panelMethod: "newPanelInfo",
  responseRoot: "vipstore",
  verifiedCaptureCount: 3,
  currencyCode: 10,
  maxVipLevel: 3,
  levelUpNeedExp: 25250000
});

function good(
  id,
  itemId,
  price,
  buyLimit,
  exp,
  group,
  order
) {
  return Object.freeze({
    viplimit: 1,
    num: 1,
    vipnumlimit: 0,
    isspecial: 0,
    itemId,
    price,
    currency: 10,
    id,
    buylimit: buyLimit,
    exp,
    group,
    order
  });
}

const VIP_STORE_GOODS = Object.freeze([
  good(1000, "200304", 10000, 8, 10000, 1, 101),
  good(1001, "200334", 10000, 8, 10000, 1, 102),
  good(1002, "210138", 10000, 8, 10000, 1, 103),
  good(1003, "210148", 10000, 8, 10000, 1, 104),
  good(1004, "210116", 10000, 5, 10000, 1, 105),
  good(1005, "210106", 10000, 5, 10000, 1, 106),
  good(1011, "210105", 2700, 10, 2700, 6, 99),
  good(1014, "200056", 8000, 4, 8000, 1, 81),
  good(1020, "210273", 25000, 1, 25000, 10, 84),
  good(1023, "200201", 75, 99999, 5000000, 1, 500)
]);

const VIP_STORE_STATE_EFFECT_IDS = Object.freeze(
  Array.from(
    { length: 54 },
    (_, index) =>
      Object.freeze({
        effectId:
          String(73001 + index),
        isUnlock: true,
        isShow: true
      })
  )
);

function vipStoreGoodunuAl(id) {
  const n = Number(id);
  if (!Number.isInteger(n)) return null;
  return (
    VIP_STORE_GOODS.find(
      item => item.id === n
    ) ||
    null
  );
}

module.exports = {
  VIP_STORE_PROTOCOL,
  VIP_STORE_GOODS,
  VIP_STORE_STATE_EFFECT_IDS,
  vipStoreGoodunuAl
};
