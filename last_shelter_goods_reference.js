"use strict";

/*
 * Original goods.xml rows that have been directly recovered from the Last
 * Shelter v1.250.102 reference package. The currently running reference copy
 * was later price-zeroed for probing; those mutated zeroes are deliberately
 * excluded from this authoritative original-price catalog.
 */

const ORIGINAL_GOODS = Object.freeze({
  "200001": Object.freeze({
    id: "200001",
    type: 0,
    levelLimit: 1,
    price: 500,
    use: 1,
    priceAll: 100000,
    priceHot: 500
  }),
  "200002": Object.freeze({
    id: "200002",
    type: 0,
    levelLimit: 1,
    price: 2000,
    use: 0,
    priceAll: 400000,
    priceHot: 2000
  }),
  "200004": Object.freeze({
    id: "200004",
    type: 0,
    levelLimit: 1,
    price: 50,
    use: 0,
    priceAll: 10000,
    priceHot: 50,
    useAll: 1
  }),
  "200005": Object.freeze({
    id: "200005",
    type: 0,
    levelLimit: 1,
    use: 0,
    priceHot: 2000,
    notGift: 1
  }),
  "200006": Object.freeze({
    id: "200006",
    type: 0,
    levelLimit: 1,
    price: 400,
    use: 0,
    priceHot: 400
  }),
  "200008": Object.freeze({
    id: "200008",
    type: 0,
    levelLimit: 1,
    price: 1000,
    use: 1,
    priceHot: 1000,
    notGift: 1
  }),
  "200200": Object.freeze({
    id: "200200",
    type: 2,
    levelLimit: 1,
    para1: 1,
    para2: 1,
    para3: 3600,
    price: 150,
    use: 0,
    priceAll: 30000,
    priceHot: 150,
    useAll: 1
  })
});

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
