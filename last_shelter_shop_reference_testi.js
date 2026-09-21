"use strict";

const assert = require("assert");
const {
  SHOP_ROWS,
  shopRowAl,
  shopRowIdsAl,
  itemTupleRawlariniAl
} = require("./last_shelter_shop_reference");

assert.deepStrictEqual(
  shopRowIdsAl(),
  [
    "200000001","200000002","200000003","200000004",
    "200000005","200000006","200000007","200000008"
  ]
);

assert.deepStrictEqual(
  {
    condition:shopRowAl("200000001").condition,
    timeType:shopRowAl("200000001").timeType,
    start:shopRowAl("200000001").start,
    end:shopRowAl("200000001").end
  },
  {
    condition:"87532",
    timeType:5,
    start:"2;1;00;00;00",
    end:"4;1;00;00;00"
  }
);

assert.deepStrictEqual(
  itemTupleRawlariniAl(shopRowAl("200000003")),
  [
    "211239;5;40;60","211233;5;40;60","211236;5;40;60",
    "211278;5;40;60","211279;5;40;60","211280;5;40;60",
    "211267;5;30;40","211268;5;30;40","211269;5;30;40"
  ]
);

assert.strictEqual(shopRowAl("200000006").condition,"87530");
assert.strictEqual(shopRowAl("200000006").timeType,1);
assert.strictEqual(shopRowAl("200000006").start,"2018-06-12-00-00");
assert.strictEqual(shopRowAl("200000008").end,"2018-07-23-00-00");

assert.deepStrictEqual(
  itemTupleRawlariniAl(shopRowAl("200000001")),
  itemTupleRawlariniAl(shopRowAl("200000006"))
);
assert.deepStrictEqual(
  itemTupleRawlariniAl(shopRowAl("200000002")),
  itemTupleRawlariniAl(shopRowAl("200000007"))
);
assert.deepStrictEqual(
  itemTupleRawlariniAl(shopRowAl("200000003")),
  itemTupleRawlariniAl(shopRowAl("200000008"))
);

const copy = shopRowAl("200000001");
copy.name = "changed";
assert.strictEqual(SHOP_ROWS["200000001"].name,"88000527");

assert.strictEqual(shopRowAl("999"),null);
assert.deepStrictEqual(itemTupleRawlariniAl(null),[]);
assert.strictEqual(Object.isFrozen(SHOP_ROWS),true);

console.log(
  "PASS: first eight verified Last Shelter shop.xml rows are preserved without inventing tuple semantics."
);
