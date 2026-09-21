"use strict";

/*
 * Directly recovered Last Shelter v1.250.102 shop.xml rows.
 *
 * The first eight complete rows are preserved exactly. The four semicolon
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

const SHOP_ROWS = deepFreeze({
  "200000001": {
    id:"200000001", name:"88000527", type:1, condition:"87532", timeType:5,
    start:"2;1;00;00;00", end:"4;1;00;00;00",
    itemRaw:"211251;5;40;60|211221;5;30;40|211222;5;30;40|211223;5;30;40|211255;5;20;10|211274;5;20;5|211275;5;20;5|211276;5;20;5"
  },
  "200000002": {
    id:"200000002", name:"88000592", type:1, condition:"87532", timeType:5,
    start:"4;1;00;00;00", end:"6;1;00;00;00",
    itemRaw:"211253;5;30;60|211217;5;30;40|211219;5;30;40|211252;5;30;40|211277;5;30;40|211254;5;30;40|211226;5;20;10|211227;5;20;5|211228;5;20;5|211224;5;20;5"
  },
  "200000003": {
    id:"200000003", name:"100215", type:1, condition:"87532", timeType:5,
    start:"6;1;00;00;00", end:"8;1;00;00;00",
    itemRaw:"211239;5;40;60|211233;5;40;60|211236;5;40;60|211278;5;40;60|211279;5;40;60|211280;5;40;60|211267;5;30;40|211268;5;30;40|211269;5;30;40"
  },
  "200000004": {
    id:"200000004", name:"88000527", type:1, condition:"87532", timeType:5,
    start:"8;1;00;00;00", end:"10;1;00;00;00",
    itemRaw:"211220;5;30;40|211217;5;30;40|211219;5;30;40|211252;5;30;40|211277;5;30;40|211254;5;30;40"
  },
  "200000005": {
    id:"200000005", name:"88000690", type:1, condition:"87532", timeType:5,
    start:"10;1;00;00;00", end:"12;1;00;00;00",
    itemRaw:"211251;5;40;60|211220;5;30;40|211253;5;30;60|211221;5;30;40|211222;5;30;40|211223;5;30;40"
  },
  "200000006": {
    id:"200000006", name:"88000527", type:1, condition:"87530", timeType:1,
    start:"2018-06-12-00-00", end:"2018-06-25-00-00",
    itemRaw:"211251;5;40;60|211221;5;30;40|211222;5;30;40|211223;5;30;40|211255;5;20;10|211274;5;20;5|211275;5;20;5|211276;5;20;5"
  },
  "200000007": {
    id:"200000007", name:"88000592", type:1, condition:"87530", timeType:1,
    start:"2018-06-25-00-00", end:"2018-07-09-00-00",
    itemRaw:"211253;5;30;60|211217;5;30;40|211219;5;30;40|211252;5;30;40|211277;5;30;40|211254;5;30;40|211226;5;20;10|211227;5;20;5|211228;5;20;5|211224;5;20;5"
  },
  "200000008": {
    id:"200000008", name:"100215", type:1, condition:"87530", timeType:1,
    start:"2018-07-09-00-00", end:"2018-07-23-00-00",
    itemRaw:"211239;5;40;60|211233;5;40;60|211236;5;40;60|211278;5;40;60|211279;5;40;60|211280;5;40;60|211267;5;30;40|211268;5;30;40|211269;5;30;40"
  }
});

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
