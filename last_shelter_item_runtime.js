"use strict";

const crypto = require("crypto");
const {
  originalGoodAl
} = require("./last_shelter_goods_reference");
const {
  itemBuyPlaniniHazirla
} = require("./last_shelter_item_buy_contract");
const {
  lastShelterGoldWalletTeminEt,
  decrAllGold
} = require("./last_shelter_gold_wallet");
const {
  lastShelterStarterAccountRuntimeTeminEt
} = require("./last_shelter_starter_account_reference");

function uuid32Hazirla(uuidFactory) {
  if (typeof uuidFactory === "function") {
    const value = String(uuidFactory()).trim();
    if (value) return value;
  }
  return crypto.randomBytes(16).toString("hex");
}

function positiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0
    ? Math.trunc(n)
    : 0;
}

function goodsItemProjectionHazirla(goods, itemId, count, uuidFactory) {
  const item = {
    count,
    vanishTime: 0,
    uuid: uuid32Hazirla(uuidFactory),
    itemId: String(itemId)
  };

  if (goods && goods.use != null) {
    item.use = String(goods.use);
  }

  for (const field of ["para1", "para2", "para3"]) {
    if (goods && goods[field] != null) {
      item[field] = String(goods[field]);
    }
  }

  return item;
}

function normalItemElaveEt(runtime, goods, itemId, rawCount, uuidFactory) {
  if (!runtime || !Array.isArray(runtime.items)) {
    return {
      success: false,
      code: "INVENTORY_MISSING"
    };
  }

  const count = positiveInt(rawCount);
  if (count <= 0) {
    return {
      success: false,
      code: "INVALID_COUNT"
    };
  }

  const id = String(itemId);
  const existing = runtime.items.find(
    row => row && String(row.itemId) === id
  );

  if (existing) {
    existing.count =
      positiveInt(existing.count) + count;

    return {
      success: true,
      item: JSON.parse(JSON.stringify(existing)),
      created: false
    };
  }

  const item =
    goodsItemProjectionHazirla(
      goods,
      id,
      count,
      uuidFactory
    );

  runtime.items.push(item);

  return {
    success: true,
    item: JSON.parse(JSON.stringify(item)),
    created: true
  };
}

function lastShelterItemBuyIcraEt(
  state,
  params,
  options = {}
) {
  if (!state || typeof state !== "object") {
    return {
      success: false,
      code: "STATE_MISSING"
    };
  }

  const itemId =
    params && params.itemId != null
      ? String(params.itemId).trim()
      : "";

  const goods =
    originalGoodAl(itemId);

  if (!goods) {
    return {
      success: false,
      code: "INVALID_OPT",
      reason: "unverified_goods",
      message:
        "Bu item ucun original Last Shelter goods.xml qiymeti tesdiqlenmeyib."
    };
  }

  const plan =
    itemBuyPlaniniHazirla(
      params || {},
      goods
    );

  if (!plan.success) {
    return plan;
  }

  if (plan.appendRoute !== "item") {
    return {
      success: false,
      code: "UNMIGRATED_GOODS_ROUTE",
      reason: plan.appendRoute
    };
  }

  const wallet =
    lastShelterGoldWalletTeminEt(state);

  const account =
    lastShelterStarterAccountRuntimeTeminEt(
      state,
      options.uuidFactory
    );

  const beforeWallet = {
    gold: wallet.gold,
    paidGold: wallet.paidGold
  };

  const debit =
    decrAllGold(
      wallet,
      plan.costGold
    );

  if (!debit.success) {
    return debit;
  }

  const append =
    normalItemElaveEt(
      account,
      goods,
      itemId,
      plan.effectiveCount,
      options.uuidFactory
    );

  if (!append.success) {
    wallet.gold = beforeWallet.gold;
    wallet.paidGold = beforeWallet.paidGold;

    return append;
  }

  return {
    success: true,
    itemId,
    item: append.item,
    effectiveCount:
      plan.effectiveCount,
    costGold:
      plan.costGold,
    remainGold:
      debit.remainGold,
    gold:
      debit.gold,
    paidGold:
      debit.paidGold,
    mode:
      plan.mode,
    goodsGetType:
      plan.goodsGetType,
    goldCostType:
      plan.goldCostType
  };
}

module.exports = {
  goodsItemProjectionHazirla,
  normalItemElaveEt,
  lastShelterItemBuyIcraEt
};
