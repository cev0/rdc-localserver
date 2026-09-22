"use strict";

const assert = require("assert");

const {
  VIP_STORE_PROTOCOL,
  VIP_STORE_GOODS,
  VIP_STORE_STATE_EFFECT_IDS,
  vipStoreGoodunuAl
} = require("./last_shelter_vip_store_reference");

const {
  lastShelterVipStoreStateHazirla,
  lastShelterVipStoreStateTeminEt,
  vipStorePanelInfoHazirla
} = require("./last_shelter_vip_store_runtime");

const {
  ORIGINAL_GOODS,
  originalGoodAl
} = require("./last_shelter_goods_reference");

const {
  SHOP_ROWS,
  shopRowAl,
  itemTupleRawlariniAl
} = require("./last_shelter_shop_reference");

assert.strictEqual(
  VIP_STORE_PROTOCOL.requestHandler,
  "VipStoreMessageHandler"
);
assert.strictEqual(
  VIP_STORE_PROTOCOL.panelMethod,
  "newPanelInfo"
);
assert.strictEqual(
  VIP_STORE_PROTOCOL.verifiedCaptureCount,
  3
);
assert.strictEqual(
  VIP_STORE_GOODS.length,
  10
);
assert.strictEqual(
  VIP_STORE_STATE_EFFECT_IDS.length,
  54
);
assert.strictEqual(
  VIP_STORE_STATE_EFFECT_IDS[0].effectId,
  "73001"
);
assert.strictEqual(
  VIP_STORE_STATE_EFFECT_IDS[53].effectId,
  "73054"
);

assert.deepStrictEqual(
  vipStoreGoodunuAl(1023),
  {
    viplimit: 1,
    num: 1,
    vipnumlimit: 0,
    isspecial: 0,
    itemId: "200201",
    price: 75,
    currency: 10,
    id: 1023,
    buylimit: 99999,
    exp: 5000000,
    group: 1,
    order: 500
  }
);

const state = {
  lastShelterVipStore:
    lastShelterVipStoreStateHazirla()
};

state.lastShelterVipStore
  .purchaseCounts["1000"] = 3;

const ensured =
  lastShelterVipStoreStateTeminEt(
    state
  );

assert.strictEqual(
  ensured.level,
  1
);
assert.strictEqual(
  ensured.purchaseCounts["1000"],
  3
);
assert.strictEqual(
  ensured.purchaseCounts["1023"],
  0
);

const panel =
  vipStorePanelInfoHazirla(
    state,
    1789704000
  );

assert.strictEqual(
  panel.vipstore.refreshTime,
  1789704000
);
assert.strictEqual(
  panel.vipstore.goods.length,
  10
);
assert.strictEqual(
  panel.vipstore.goods[0].buyAmount,
  3
);
assert.strictEqual(
  panel.vipstore.maxviplevel,
  3
);
assert.strictEqual(
  panel.vipstore.lvUpNeedExp,
  25250000
);
assert.deepStrictEqual(
  panel.vipstore.vip_effects,
  {}
);

assert.strictEqual(
  Object.keys(ORIGINAL_GOODS).length,
  1066
);
assert.strictEqual(
  originalGoodAl("200001").price,
  500
);
assert.strictEqual(
  originalGoodAl("200200").price,
  150
);
assert.strictEqual(
  originalGoodAl("200200").para3,
  3600
);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(
    originalGoodAl("200005"),
    "price"
  ),
  false
);

assert.strictEqual(
  Object.keys(SHOP_ROWS).length,
  48
);
assert.strictEqual(
  shopRowAl("200000001").condition,
  "87532"
);
assert.strictEqual(
  itemTupleRawlariniAl(
    shopRowAl("200000001")
  ).length,
  8
);
assert.strictEqual(
  itemTupleRawlariniAl(
    shopRowAl("200000002")
  ).length,
  10
);

console.log(
  "PASS: verified Last Shelter goods/shop/VIP-store economy reference is preserved."
);
