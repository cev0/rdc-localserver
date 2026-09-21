"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_STARTER_GOLD_WALLET,
  lastShelterGoldWalletDefaultHazirla,
  lastShelterGoldWalletTeminEt,
  totalGoldAl,
  decrAllGold,
  goldInitProjectionHazirla
} = require("./last_shelter_gold_wallet");

assert.deepStrictEqual(
  LAST_SHELTER_STARTER_GOLD_WALLET,
  { gold:40, paidGold:0 }
);

const fresh =
  lastShelterGoldWalletDefaultHazirla();

assert.deepStrictEqual(
  fresh,
  { gold:40, paidGold:0 }
);
assert.strictEqual(totalGoldAl(fresh),40);

let wallet = { gold:40, paidGold:100 };
let debit = decrAllGold(wallet,30);
assert.deepStrictEqual(debit, {
  success:true,
  costGold:30,
  gold:10,
  paidGold:100,
  remainGold:110
});

wallet = { gold:40, paidGold:100 };
debit = decrAllGold(wallet,60);
assert.deepStrictEqual(debit, {
  success:true,
  costGold:60,
  gold:0,
  paidGold:80,
  remainGold:80
});

wallet = { gold:0, paidGold:100 };
debit = decrAllGold(wallet,60);
assert.deepStrictEqual(debit, {
  success:true,
  costGold:60,
  gold:0,
  paidGold:40,
  remainGold:40
});

wallet = { gold:40, paidGold:0 };
const insufficient = decrAllGold(wallet,50);
assert.strictEqual(insufficient.success,false);
assert.strictEqual(insufficient.code,"USERGOLD_IS_NOT_ENOUGH");
assert.deepStrictEqual(wallet,{gold:40,paidGold:0});

assert.strictEqual(decrAllGold({gold:1,paidGold:0},0).success,false);

const state = {};
assert.deepStrictEqual(
  lastShelterGoldWalletTeminEt(state),
  {gold:40,paidGold:0}
);
assert.deepStrictEqual(
  goldInitProjectionHazirla(state),
  {gold:40,gold1:40,paidGold:0}
);

console.log("PASS: Last Shelter gold/paidGold wallet and decrAllGold semantics are preserved.");
