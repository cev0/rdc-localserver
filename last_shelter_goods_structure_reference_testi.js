"use strict";

const assert = require("assert");
const {
  GOODS_STRUCTURE,
  goodsStructureAl,
  goodsStructureIdsAl,
  salesRawEntriesAl
} = require("./last_shelter_goods_structure_reference");

assert.strictEqual(goodsStructureIdsAl().length, 35);
assert.strictEqual(Object.isFrozen(GOODS_STRUCTURE), true);

assert.deepStrictEqual(
  goodsStructureAl("200016"),
  {
    id:"200016",
    type:0,
    levelLimit:1,
    use:0,
    salesRaw:"1;15|10;120|100;1100|1000;10000"
  }
);
assert.deepStrictEqual(
  salesRawEntriesAl("200016"),
  [
    { count:1, totalPrice:15 },
    { count:10, totalPrice:120 },
    { count:100, totalPrice:1100 },
    { count:1000, totalPrice:10000 }
  ]
);

assert.deepStrictEqual(
  goodsStructureAl("200201"),
  {
    id:"200201",
    type:2,
    levelLimit:1,
    para1:1,
    para2:1,
    para3:300,
    use:0,
    useAll:1
  }
);
assert.deepStrictEqual(
  goodsStructureAl("200202"),
  {
    id:"200202",
    type:2,
    levelLimit:1,
    para1:1,
    para2:1,
    para3:28800,
    use:0,
    useAll:1
  }
);
assert.deepStrictEqual(
  goodsStructureAl("200209"),
  {
    id:"200209",
    type:2,
    levelLimit:1,
    para1:4,
    para2:1,
    para3:28800,
    use:0,
    useAll:1
  }
);
assert.strictEqual(goodsStructureAl("200029").levelLimit, 10);
assert.strictEqual(goodsStructureAl("200027").para2, 86400);
assert.strictEqual(goodsStructureAl("999999"), null);

// Direct price fields from the mutated probing copy must never enter this catalog.
for (const row of Object.values(GOODS_STRUCTURE)) {
  for (const field of ["price","priceAll","priceHot"]) {
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(row, field),
      false,
      row.id + ":" + field
    );
  }
}

const copy = goodsStructureAl("200201");
copy.para3 = 1;
assert.strictEqual(GOODS_STRUCTURE["200201"].para3, 300);

console.log("PASS: verified Last Shelter goods.xml structural rows are preserved without mutated probing prices.");
