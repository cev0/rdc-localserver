"use strict";

/*
 * Directly recovered shop.xml rows. Only complete rows are included.
 * Item tuple semantics are preserved raw until their four fields are verified
 * from the corresponding server handler.
 */

const SHOP_ROWS = Object.freeze({
  "200000001": Object.freeze({
    id: "200000001",
    name: "88000527",
    type: 1,
    condition: "87532",
    timeType: 5,
    start: "2;1;00;00;00",
    end: "4;1;00;00;00",
    itemRaw:
      "211251;5;40;60|211221;5;30;40|211222;5;30;40|211223;5;30;40|211255;5;20;10|211274;5;20;5|211275;5;20;5|211276;5;20;5"
  }),
  "200000002": Object.freeze({
    id: "200000002",
    name: "88000592",
    type: 1,
    condition: "87532",
    timeType: 5,
    start: "4;1;00;00;00",
    end: "6;1;00;00;00",
    itemRaw:
      "211253;5;30;60|211217;5;30;40|211219;5;30;40|211252;5;30;40|211277;5;30;40|211254;5;30;40|211226;5;20;10|211227;5;20;5|211228;5;20;5|211224;5;20;5"
  })
});

function shopRowAl(id) {
  return (
    SHOP_ROWS[
      String(id)
    ] ||
    null
  );
}

function itemTupleRawlariniAl(row) {
  if (
    !row ||
    typeof row.itemRaw !== "string"
  ) {
    return [];
  }

  return row.itemRaw
    .split("|")
    .map(x => x.trim())
    .filter(Boolean);
}

module.exports = {
  SHOP_ROWS,
  shopRowAl,
  itemTupleRawlariniAl
};
