"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_FRESH_RESOURCE_POINTS,
  LAST_SHELTER_FRESH_INIT_AUX_DEFAULTS,
  freshInitAuxRuntimeDefaultHazirla,
  freshInitAuxRuntimeTeminEt
} = require("./last_shelter_fresh_init_aux_reference");

assert.strictEqual(LAST_SHELTER_FRESH_RESOURCE_POINTS.length,13);
assert.deepStrictEqual(
  LAST_SHELTER_FRESH_RESOURCE_POINTS,
  [
    {showId:20001401,x:18,y:23,rtType:0},
    {showId:20001401,x:45,y:32,rtType:0},
    {showId:20001401,x:27,y:34,rtType:0},
    {showId:20001421,x:39,y:38,rtType:2},
    {showId:20001421,x:45,y:45,rtType:2},
    {showId:20001411,x:26,y:18,rtType:1},
    {showId:20001411,x:34,y:26,rtType:1},
    {showId:20001431,x:44,y:21,rtType:3},
    {showId:20001431,x:38,y:32,rtType:3},
    {showId:20001431,x:19,y:44,rtType:3},
    {showId:20001441,x:38,y:18,rtType:11},
    {showId:20001441,x:32,y:37,rtType:11},
    {showId:20001441,x:28,y:45,rtType:11}
  ]
);

assert.deepStrictEqual(
  LAST_SHELTER_FRESH_INIT_AUX_DEFAULTS,
  {
    killWorldBossNumber:0,
    heroprison:[],
    chatShield:[],
    hasPassword:false,
    isOpenedKingdomAct:false,
    kingdomSeasonObj:{riseInfo:[]},
    cityDefRecoverRecord:0,
    mailTranslation:false,
    killActivityBossNumber:0,
    activationStoptime:0,
    exchangeGift:[]
  }
);

const runtime = freshInitAuxRuntimeDefaultHazirla();
assert.strictEqual(runtime.resourcePoints.length,13);
runtime.resourcePoints[0].x = 999;
runtime.kingdomSeasonObj.riseInfo.push("changed");
assert.strictEqual(LAST_SHELTER_FRESH_RESOURCE_POINTS[0].x,18);
assert.deepStrictEqual(LAST_SHELTER_FRESH_INIT_AUX_DEFAULTS.kingdomSeasonObj.riseInfo,[]);

const broken = {
  killWorldBossNumber:-2,
  heroprison:null,
  chatShield:{},
  hasPassword:"false",
  isOpenedKingdomAct:null,
  kingdomSeasonObj:{riseInfo:null},
  cityDefRecoverRecord:"4",
  mailTranslation:0,
  killActivityBossNumber:"3",
  activationStoptime:"5",
  exchangeGift:null,
  resourcePoints:null
};
assert.strictEqual(freshInitAuxRuntimeTeminEt(broken),broken);
assert.strictEqual(broken.killWorldBossNumber,0);
assert.strictEqual(broken.cityDefRecoverRecord,4);
assert.strictEqual(broken.killActivityBossNumber,3);
assert.strictEqual(broken.activationStoptime,5);
assert.deepStrictEqual(broken.heroprison,[]);
assert.deepStrictEqual(broken.chatShield,[]);
assert.deepStrictEqual(broken.exchangeGift,[]);
assert.strictEqual(broken.resourcePoints.length,13);
assert.deepStrictEqual(broken.kingdomSeasonObj,{riseInfo:[]});
assert.strictEqual(broken.hasPassword,false);
assert.strictEqual(broken.isOpenedKingdomAct,false);
assert.strictEqual(broken.mailTranslation,false);

// Environment/session fields are intentionally not canonical defaults.
assert.strictEqual(Object.prototype.hasOwnProperty.call(LAST_SHELTER_FRESH_INIT_AUX_DEFAULTS,"db_utc_timestamp"),false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(LAST_SHELTER_FRESH_INIT_AUX_DEFAULTS,"baseBuildingLevel"),false);

console.log("PASS: Last Shelter v1.250.102 fresh-account auxiliary init defaults/resource points are preserved.");
