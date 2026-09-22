"use strict";

/*
 * Directly recovered Last Shelter v1.250.102 shop.xml rows.
 *
 * All 48 rows are loaded from the checksummed source snapshot. The four semicolon
 * fields inside itemRaw are intentionally kept raw until the corresponding
 * shop handler proves their individual semantics.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const { sourceCatalog } = require("./last_shelter_source_catalog");
const SHOP_ROWS = deepFreeze(Object.fromEntries(sourceCatalog.rows("shop").map(raw => {
  const { item, time_type, ...rest } = raw;
  return [raw.id, { ...rest, type: Number(raw.type), timeType: Number(time_type), itemRaw: item }];
})));
sourceCatalog.release("shop");

function shopRowAl(id) {
  const row = SHOP_ROWS[String(id)];
  return row ? { ...row } : null;
}

function itemTupleRawlariniAl(row) {
  if (!row || typeof row.itemRaw !== "string") {
    return [];
  }

  return row.itemRaw
    .split("|")
    .map(x => x.trim())
    .filter(Boolean);
}

function shopRowIdsAl() {
  return Object.keys(SHOP_ROWS);
}

module.exports = {
  SHOP_ROWS,
  shopRowAl,
  shopRowIdsAl,
  itemTupleRawlariniAl
};
