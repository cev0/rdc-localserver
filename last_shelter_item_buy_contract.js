"use strict";

/*
 * Verified Last Shelter v1.250.102 item.buy / ItemManager contract.
 *
 * Source semantics come from the server-side BuyItem and ItemManager bytecode.
 * This module intentionally does not guess RDC inventory persistence or the
 * UserProfile.decrAllGold paid/free-gold split. It produces the authoritative
 * purchase plan that the transaction layer must debit/apply atomically.
 */

const LAST_SHELTER_ITEM_BUY_PROTOCOL = Object.freeze({
  requestId: "item.buy",
  synchronizedUserRequest: true,
  itemLockRequired: true,
  requestFields: Object.freeze({
    itemId: "itemId",
    count: "num",
    batchFlag: "batch"
  }),
  batchRule: "batch>0",
  configName: "goods",
  invalidOptionError: "INVALID_OPT",
  responseFields: Object.freeze([
    "remainGold",
    "costGold"
  ]),
  goldCostType: "ITEM",
  goodsGetType: "BUY"
});

function tamEded(value) {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Math.trunc(value)
      : NaN;
  }

  const text =
    value == null
      ? ""
      : String(value).trim();

  if (!/^[+-]?\d+$/.test(text)) {
    return NaN;
  }

  const n = Number(text);
  return Number.isSafeInteger(n)
    ? n
    : NaN;
}

function ugursuz(reason, message) {
  return {
    success: false,
    errorCode:
      LAST_SHELTER_ITEM_BUY_PROTOCOL
        .invalidOptionError,
    reason,
    message
  };
}

function salesSetirleriniParseEt(raw) {
  const text =
    typeof raw === "string"
      ? raw.trim()
      : "";

  if (!text) {
    return {
      success: true,
      entries: []
    };
  }

  const entries = [];

  for (const segment of text.split("|")) {
    const part = segment.trim();
    if (!part) {
      continue;
    }

    const fields = part.split(";");
    if (fields.length < 2) {
      return ugursuz(
        "invalid_sales_config",
        "sales config etibarsızdır."
      );
    }

    const count = tamEded(fields[0]);
    const totalPrice = tamEded(fields[1]);

    if (
      !Number.isInteger(count) ||
      !Number.isInteger(totalPrice)
    ) {
      return ugursuz(
        "invalid_sales_config",
        "sales config rəqəmləri etibarsızdır."
      );
    }

    entries.push({
      count,
      totalPrice
    });
  }

  return {
    success: true,
    entries
  };
}

function javaIntMultiply(a, b) {
  return Math.imul(
    Math.trunc(a),
    Math.trunc(b)
  );
}

function goodsTipRouteAl(rawType) {
  const type = String(
    rawType == null
      ? ""
      : rawType
  ).trim();

  if (type === "7") {
    return "material";
  }

  if (type === "9") {
    return "part";
  }

  return "item";
}

function requestModunuAl(params) {
  const batch =
    tamEded(
      params &&
      params[
        LAST_SHELTER_ITEM_BUY_PROTOCOL
          .requestFields
          .batchFlag
      ]
    );

  return (
    Number.isInteger(batch) &&
    batch > 0
  )
    ? "batch"
    : "single";
}

function bazaQiymetiAl(goods) {
  if (
    !goods ||
    goods.price == null ||
    String(goods.price).trim() === ""
  ) {
    return ugursuz(
      "item_error",
      "goods price tapılmadı."
    );
  }

  const price =
    tamEded(goods.price);

  if (!Number.isInteger(price)) {
    return ugursuz(
      "item_error",
      "goods price etibarsızdır."
    );
  }

  return {
    success: true,
    price
  };
}

/*
 * Mirrors ItemManager.checkItemBuy(goodsMap, count).
 *
 * sales exists:
 *   - exact count match => mapped value is the total price.
 *   - no exact match => effective count is forced to 1 and base price is used.
 * no sales + count > 1:
 *   - Java signed-int multiplication is used by the original server.
 */
function tekAlisPlaniniHazirla(
  goods,
  rawCount
) {
  const priceResult =
    bazaQiymetiAl(goods);

  if (!priceResult.success) {
    return priceResult;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      goods,
      "denyBuy"
    ) &&
    String(goods.denyBuy) === "1"
  ) {
    return ugursuz(
      "deny_buy",
      "denyBuy"
    );
  }

  let count =
    tamEded(rawCount);

  let price =
    priceResult.price;

  if (
    price <= 0 ||
    !Number.isInteger(count) ||
    count <= 0
  ) {
    return ugursuz(
      "param_error",
      "price/count parametrləri etibarsızdır."
    );
  }

  const hasSales =
    Object.prototype.hasOwnProperty.call(
      goods,
      "sales"
    ) &&
    String(goods.sales || "").trim() !== "";

  if (hasSales) {
    const parsed =
      salesSetirleriniParseEt(
        String(goods.sales)
      );

    if (!parsed.success) {
      return parsed;
    }

    const exact =
      parsed.entries.find(
        entry =>
          entry.count === count
      );

    if (exact) {
      price =
        exact.totalPrice;
    }
    else {
      count = 1;
    }
  }
  else if (count > 1) {
    const cost =
      javaIntMultiply(
        price,
        count
      );

    count =
      Math.trunc(
        cost / price
      );

    price = cost;
  }

  if (
    price <= 0 ||
    count <= 0
  ) {
    return ugursuz(
      "param_error",
      "hesablanmış price/count etibarsızdır."
    );
  }

  return {
    success: true,
    mode: "single",
    effectiveCount: count,
    costGold: price,
    appendRoute:
      goodsTipRouteAl(
        goods.type
      )
  };
}

/*
 * Mirrors ItemManager.buyItemBatch.
 * The original batch path uses the raw goods.price and count directly; it does
 * not call checkItemBuy, so sales/denyBuy are not applied in this method.
 */
function paketAlisPlaniniHazirla(
  goods,
  rawCount
) {
  const priceResult =
    bazaQiymetiAl(goods);

  if (!priceResult.success) {
    return priceResult;
  }

  const unitPrice =
    priceResult.price;

  let count =
    tamEded(rawCount);

  if (
    unitPrice <= 0 ||
    !Number.isInteger(count) ||
    count <= 0
  ) {
    return ugursuz(
      "param_error",
      "price/count parametrləri etibarsızdır."
    );
  }

  const cost =
    javaIntMultiply(
      unitPrice,
      count
    );

  count =
    Math.trunc(
      cost / unitPrice
    );

  if (
    cost <= 0 ||
    count <= 0
  ) {
    return ugursuz(
      "param_error",
      "hesablanmış batch cost/count etibarsızdır."
    );
  }

  return {
    success: true,
    mode: "batch",
    effectiveCount: count,
    costGold: cost,
    appendRoute:
      goodsTipRouteAl(
        goods.type
      )
  };
}

function itemBuyPlaniniHazirla(
  params,
  goods
) {
  const fields =
    LAST_SHELTER_ITEM_BUY_PROTOCOL
      .requestFields;

  const itemId =
    params &&
    params[fields.itemId] != null
      ? String(
          params[fields.itemId]
        ).trim()
      : "";

  const count =
    params &&
    params[fields.count];

  if (!itemId) {
    return ugursuz(
      "item_error",
      "itemId tələb olunur."
    );
  }

  const mode =
    requestModunuAl(params);

  const plan =
    mode === "batch"
      ? paketAlisPlaniniHazirla(
          goods,
          count
        )
      : tekAlisPlaniniHazirla(
          goods,
          count
        );

  if (!plan.success) {
    return {
      ...plan,
      itemId,
      mode
    };
  }

  return {
    ...plan,
    itemId,
    requiresServerGoldDebit: true,
    goldCostType:
      LAST_SHELTER_ITEM_BUY_PROTOCOL
        .goldCostType,
    goodsGetType:
      LAST_SHELTER_ITEM_BUY_PROTOCOL
        .goodsGetType
  };
}

module.exports = {
  LAST_SHELTER_ITEM_BUY_PROTOCOL,
  tamEded,
  javaIntMultiply,
  salesSetirleriniParseEt,
  goodsTipRouteAl,
  requestModunuAl,
  tekAlisPlaniniHazirla,
  paketAlisPlaniniHazirla,
  itemBuyPlaniniHazirla
};
