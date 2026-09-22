"use strict";

/*
 * All 1,066 goods.xml source rows. Original positive prices, absent prices,
 * denyBuy and sales are preserved. Captured price-zeroed probe responses are
 * never used to price an item purchase.
 */

const { sourceCatalog } = require("./last_shelter_source_catalog");
const FIELD_NAMES = Object.freeze({
  lv_limit: "levelLimit", price_all: "priceAll", price_hot: "priceHot",
  useall: "useAll", not_gift: "notGift"
});
const NUMERIC_FIELDS = new Set(["type", "levelLimit", "price", "priceAll", "priceHot",
  "use", "useAll", "notGift", "para1", "para2", "para3"]);
function normalizeSourceGood(raw) {
  const row = {};
  for (const [sourceKey, value] of Object.entries(raw)) {
    const key = FIELD_NAMES[sourceKey] || sourceKey;
    row[key] = NUMERIC_FIELDS.has(key) && /^(0|-?[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value))
      ? Number(value) : value;
  }
  return Object.freeze(row);
}
const ORIGINAL_GOODS = Object.freeze(Object.fromEntries(sourceCatalog.rows("goods")
  .map(raw => [raw.id, normalizeSourceGood(raw)])));
sourceCatalog.release("goods");

function originalGoodAl(itemId) {
  const id =
    itemId == null
      ? ""
      : String(itemId).trim();

  return (
    ORIGINAL_GOODS[id] ||
    null
  );
}

module.exports = {
  ORIGINAL_GOODS,
  originalGoodAl
};
