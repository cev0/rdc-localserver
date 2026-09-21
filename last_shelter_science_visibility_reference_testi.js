"use strict";

const assert=require("assert");
const {
  LAST_SHELTER_SHOW_SCIENCE_ARRAY,
  showScienceRowAl,
  showScienceArrayProjectionHazirla,
  showScienceIdsAl
}=require("./last_shelter_science_visibility_reference");

assert.strictEqual(LAST_SHELTER_SHOW_SCIENCE_ARRAY.length,52);
assert.strictEqual(new Set(showScienceIdsAl()).size,52);
assert.strictEqual(showScienceIdsAl().includes("249916"),false);

assert.deepStrictEqual(showScienceRowAl("249901"),{
  is_visible:"close",
  online:"close",
  lock:"1;1",
  id:"249901",
  version:"1.0.69",
  isShow:0
});
assert.deepStrictEqual(showScienceRowAl("249912"),{
  is_visible:"close",
  online:"close",
  lock:"1;16|735201||735601",
  id:"249912",
  version:"1.0.69",
  isShow:0
});
assert.deepStrictEqual(showScienceRowAl("249929"),{
  is_visible:"close",
  online:"close",
  lock:"1;30|781001|782401|783801|785201",
  id:"249929",
  version:"1.0.150",
  isShow:0
});
assert.deepStrictEqual(showScienceRowAl("20004000"),{
  lock:"1;1",
  id:"20004000",
  version:"1.250.009",
  isShow:1
});
assert.deepStrictEqual(showScienceRowAl("20004040"),{
  lock:"1;9",
  id:"20004040",
  version:"1.250.088",
  isShow:0
});

assert.strictEqual(
  LAST_SHELTER_SHOW_SCIENCE_ARRAY.filter(x=>x.isShow===1).length,
  3
);
assert.deepStrictEqual(
  LAST_SHELTER_SHOW_SCIENCE_ARRAY.filter(x=>x.isShow===1).map(x=>x.id),
  ["20004000","20004001","20004012"]
);

const projection=showScienceArrayProjectionHazirla();
projection[0].lock="changed";
assert.strictEqual(LAST_SHELTER_SHOW_SCIENCE_ARRAY[0].lock,"1;1");
assert.strictEqual(showScienceRowAl("missing"),null);
assert.strictEqual(Object.isFrozen(LAST_SHELTER_SHOW_SCIENCE_ARRAY),true);
assert.strictEqual(Object.isFrozen(LAST_SHELTER_SHOW_SCIENCE_ARRAY[0]),true);

console.log("PASS: Last Shelter v1.250.102 showScienceArray visibility/lock metadata is preserved exactly.");
