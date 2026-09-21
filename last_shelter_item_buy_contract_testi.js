"use strict";

const assert = require("assert");

const {
  LAST_SHELTER_ITEM_BUY_PROTOCOL,
  javaIntMultiply,
  salesSetirleriniParseEt,
  goodsTipRouteAl,
  requestModunuAl,
  tekAlisPlaniniHazirla,
  paketAlisPlaniniHazirla,
  itemBuyPlaniniHazirla
} = require("./last_shelter_item_buy_contract");

assert.strictEqual(
  LAST_SHELTER_ITEM_BUY_PROTOCOL.requestId,
  "item.buy"
);
assert.strictEqual(
  LAST_SHELTER_ITEM_BUY_PROTOCOL.synchronizedUserRequest,
  true
);
assert.strictEqual(
  LAST_SHELTER_ITEM_BUY_PROTOCOL.itemLockRequired,
  true
);
assert.deepStrictEqual(
  LAST_SHELTER_ITEM_BUY_PROTOCOL.requestFields,
  {
    itemId: "itemId",
    count: "num",
    batchFlag: "batch"
  }
);
assert.deepStrictEqual(
  LAST_SHELTER_ITEM_BUY_PROTOCOL.responseFields,
  [
    "remainGold",
    "costGold"
  ]
);

assert.deepStrictEqual(
  salesSetirleriniParseEt(
    "1;15|10;120|100;1100|1000;10000"
  ),
  {
    success: true,
    entries: [
      { count: 1, totalPrice: 15 },
      { count: 10, totalPrice: 120 },
      { count: 100, totalPrice: 1100 },
      { count: 1000, totalPrice: 10000 }
    ]
  }
);

assert.strictEqual(
  goodsTipRouteAl("7"),
  "material"
);
assert.strictEqual(
  goodsTipRouteAl("9"),
  "part"
);
assert.strictEqual(
  goodsTipRouteAl("0"),
  "item"
);

assert.strictEqual(
  requestModunuAl({
    batch: 1
  }),
  "batch"
);
assert.strictEqual(
  requestModunuAl({
    batch: 0
  }),
  "single"
);
assert.strictEqual(
  requestModunuAl({}),
  "single"
);

assert.deepStrictEqual(
  tekAlisPlaniniHazirla(
    {
      price: "50",
      type: "0"
    },
    3
  ),
  {
    success: true,
    mode: "single",
    effectiveCount: 3,
    costGold: 150,
    appendRoute: "item"
  }
);

assert.deepStrictEqual(
  tekAlisPlaniniHazirla(
    {
      price: "15",
      sales:
        "1;15|10;120|100;1100|1000;10000",
      type: "0"
    },
    10
  ),
  {
    success: true,
    mode: "single",
    effectiveCount: 10,
    costGold: 120,
    appendRoute: "item"
  }
);

assert.deepStrictEqual(
  tekAlisPlaniniHazirla(
    {
      price: "15",
      sales:
        "1;15|10;120|100;1100|1000;10000",
      type: "0"
    },
    7
  ),
  {
    success: true,
    mode: "single",
    effectiveCount: 1,
    costGold: 15,
    appendRoute: "item"
  }
);

const denied =
  tekAlisPlaniniHazirla(
    {
      price: "15",
      denyBuy: "1"
    },
    1
  );

assert.strictEqual(
  denied.success,
  false
);
assert.strictEqual(
  denied.reason,
  "deny_buy"
);
assert.strictEqual(
  denied.errorCode,
  "INVALID_OPT"
);

// Batch path mirrors ItemManager.buyItemBatch: raw price*count;
// sales and denyBuy are not evaluated by that method.
assert.deepStrictEqual(
  paketAlisPlaniniHazirla(
    {
      price: "50",
      sales: "10;120",
      denyBuy: "1",
      type: "7"
    },
    10
  ),
  {
    success: true,
    mode: "batch",
    effectiveCount: 10,
    costGold: 500,
    appendRoute: "material"
  }
);

assert.strictEqual(
  javaIntMultiply(
    2_000_000_000,
    2
  ),
  -294_967_296
);

const overflow =
  paketAlisPlaniniHazirla(
    {
      price: "2000000000"
    },
    2
  );

assert.strictEqual(
  overflow.success,
  false
);
assert.strictEqual(
  overflow.reason,
  "param_error"
);

const plan =
  itemBuyPlaniniHazirla(
    {
      itemId: "200001",
      num: 2,
      batch: 0
    },
    {
      price: "500",
      type: "0"
    }
  );

assert.strictEqual(
  plan.success,
  true
);
assert.strictEqual(
  plan.itemId,
  "200001"
);
assert.strictEqual(
  plan.costGold,
  1000
);
assert.strictEqual(
  plan.effectiveCount,
  2
);
assert.strictEqual(
  plan.requiresServerGoldDebit,
  true
);
assert.strictEqual(
  plan.goldCostType,
  "ITEM"
);
assert.strictEqual(
  plan.goodsGetType,
  "BUY"
);

const badPrice =
  itemBuyPlaniniHazirla(
    {
      itemId: "200001",
      num: 1
    },
    {
      price: "0"
    }
  );

assert.strictEqual(
  badPrice.success,
  false
);
assert.strictEqual(
  badPrice.errorCode,
  "INVALID_OPT"
);

console.log(
  "PASS: Last Shelter item.buy server-authoritative purchase contract is preserved."
);
