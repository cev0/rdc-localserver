"use strict";

const assert = require("assert");
const {
  lastShelterItemBuyIcraEt
} = require("./last_shelter_item_runtime");

const state = {
  lastShelterGoldWallet:{
    gold:1000,
    paidGold:500
  }
};

let uuidN = 0;
const uuidFactory = () =>
  "purchase-" + (++uuidN);

let result =
  lastShelterItemBuyIcraEt(
    state,
    {
      itemId:"200200",
      num:2,
      batch:0
    },
    { uuidFactory }
  );

assert.strictEqual(result.success,true);
assert.strictEqual(result.costGold,300);
assert.strictEqual(result.remainGold,1200);
assert.strictEqual(result.effectiveCount,2);
assert.strictEqual(result.item.itemId,"200200");
assert.strictEqual(result.item.count,3);
assert.strictEqual(result.item.para1,"1");
assert.strictEqual(result.item.para2,"1");
assert.strictEqual(result.item.para3,"3600");
assert.deepStrictEqual(
  state.lastShelterGoldWallet,
  {gold:700,paidGold:500}
);

// A verified normal good not present in starter inventory creates a new row.
result =
  lastShelterItemBuyIcraEt(
    state,
    {
      itemId:"200001",
      num:1,
      batch:0
    },
    { uuidFactory }
  );

assert.strictEqual(result.success,true);
assert.strictEqual(result.costGold,500);
assert.strictEqual(result.remainGold,700);
assert.strictEqual(result.item.itemId,"200001");
assert.strictEqual(result.item.count,1);
assert.strictEqual(result.item.use,"1");

const before =
  JSON.stringify(state);

const unknown =
  lastShelterItemBuyIcraEt(
    state,
    {
      itemId:"200201",
      num:1,
      batch:0
    },
    { uuidFactory }
  );

assert.strictEqual(unknown.success,false);
assert.strictEqual(unknown.code,"INVALID_OPT");
assert.strictEqual(
  JSON.stringify(state),
  before,
  "Unverified original goods price must not mutate wallet/inventory."
);

// Paid gold is consumed only after free gold is exhausted.
state.lastShelterGoldWallet = {
  gold:100,
  paidGold:1000
};

const mixed =
  lastShelterItemBuyIcraEt(
    state,
    {
      itemId:"200001",
      num:2,
      batch:0
    },
    { uuidFactory }
  );

assert.strictEqual(mixed.success,true);
assert.deepStrictEqual(
  state.lastShelterGoldWallet,
  {gold:0,paidGold:100}
);
assert.strictEqual(mixed.remainGold,100);

console.log("PASS: Last Shelter item.buy mutates verified wallet and inventory atomically.");
