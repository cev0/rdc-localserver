"use strict";

const assert = require("assert");
const {
  WORLD_CUP_ROWS,
  worldCupRowAl,
  worldCupOptionIdsAl,
  worldCupGoodsMaxAl,
  worldCupRowsByNameTypeAl
} = require("./last_shelter_worldcup_reference");

assert.strictEqual(WORLD_CUP_ROWS.length,100);
assert.strictEqual(new Set(WORLD_CUP_ROWS.map(x => x.id)).size,100);
assert.deepStrictEqual(
  WORLD_CUP_ROWS.map(x => Number(x.id)),
  Array.from({length:100},(_,i)=>i+1)
);

assert.deepStrictEqual(worldCupRowAl("1"),{"id":"1","type":"1","time_start":"2018/6/6 00:00:00","time_end":"2018/6/14 00:00:00","time_clear":"2018/6/15 00:00:00","odds_start":"3","bets_start":"100","winpoints":"30","goods_max":"gold,1000|200956,1000|200043,1000|200046,10000","options":"1|2|33","name_type":"99012200","name":"99012211"});
assert.deepStrictEqual(worldCupRowAl("49"),{"id":"49","type":"1","time_start":"2019/6/29 04:00:00","time_end":"2019/6/30 00:00:00","time_clear":"2019/7/1 04:00:00","odds_start":"2","bets_start":"100","winpoints":"20","goods_max":"gold,10000|200956,2500|200043,2500|200046,20000","options":"9|13","name_type":"99012201","name":"99012259"});
assert.deepStrictEqual(worldCupRowAl("64"),{"id":"64","type":"1","time_start":"2018/7/14 04:00:00","time_end":"2018/7/15 12:00:00","time_clear":"2018/7/16 04:00:00","odds_start":"2","bets_start":"100","winpoints":"20","goods_max":"gold,60000|200956,15000|200043,15000|200046,120000","options":"27|28","name_type":"99012204","name":"99012274"});
assert.deepStrictEqual(worldCupRowAl("65"),{"id":"65","type":"1","time_start":"2018/6/6 00:00:00","time_end":"2018/6/14 00:00:00","time_clear":"2018/6/15 00:10:00","odds_start":"16","bets_start":"100","winpoints":"160","goods_max":"gold,1000|200956,1000|200043,1000|200046,10000","options":"34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49","name_type":"99012205","name":"99012211"});
assert.deepStrictEqual(worldCupRowAl("100"),{"id":"100","type":"1","time_start":"2018/6/24 00:00:00","time_end":"2018/6/25 00:00:00","time_clear":"2018/6/26 05:10:00","odds_start":"16","bets_start":"100","winpoints":"160","goods_max":"gold,1000|200956,500|200043,500|200046,10000","options":"34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49","name_type":"99012205","name":"99012246"});

assert.deepStrictEqual(worldCupOptionIdsAl("1"),["1","2","33"]);
assert.strictEqual(worldCupOptionIdsAl("65").length,16);
assert.deepStrictEqual(
  worldCupGoodsMaxAl("64"),
  [
    {resourceId:"gold",amount:60000},
    {resourceId:"200956",amount:15000},
    {resourceId:"200043",amount:15000},
    {resourceId:"200046",amount:120000}
  ]
);

assert.deepStrictEqual(
  [
    worldCupRowsByNameTypeAl("99012200").length,
    worldCupRowsByNameTypeAl("99012201").length,
    worldCupRowsByNameTypeAl("99012202").length,
    worldCupRowsByNameTypeAl("99012203").length,
    worldCupRowsByNameTypeAl("99012204").length,
    worldCupRowsByNameTypeAl("99012205").length
  ],
  [48,12,2,1,1,36]
);

assert.strictEqual(worldCupRowAl("49").time_start,"2019/6/29 04:00:00");
assert.strictEqual(worldCupRowAl("50").time_start,"2019/6/29 04:00:00");
assert.strictEqual(worldCupRowAl("51").time_start,"2018/6/30 04:00:00");

const copy=worldCupRowAl("1");
copy.name="changed";
assert.strictEqual(WORLD_CUP_ROWS[0].name,"99012211");
assert.strictEqual(worldCupRowAl("999"),null);
assert.strictEqual(Object.isFrozen(WORLD_CUP_ROWS),true);
assert.strictEqual(Object.isFrozen(WORLD_CUP_ROWS[0]),true);

console.log("PASS: all 100 Last Shelter activity_worldcup.xml rows are preserved exactly.");
