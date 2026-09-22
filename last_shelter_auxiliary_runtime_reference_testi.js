"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_CAREER_INFO,
  LAST_SHELTER_HIRE_ARMY_SHOP_DEFAULT,
  LAST_SHELTER_MINE_DEFAULT,
  LAST_SHELTER_WORLD_FORTRESS_DEFAULT,
  LAST_SHELTER_RECOVER_DURABILITY_DEFAULT,
  LAST_SHELTER_RESCUE_CENTER_DEFAULT,
  LAST_SHELTER_MIXED_INFO_DEFAULT,
  LAST_SHELTER_LOTTERY_REFERENCE,
  LAST_SHELTER_CARGO_REFERENCE,
  LAST_SHELTER_BUSINESSMAN_OBSERVED,
  LAST_SHELTER_DAY_AND_NIGHT_RUNTIME,
  rewardTokenParseEt,
  lotteryEntryListParseEt,
  lastShelterAuxiliaryRuntimeDefaultHazirla,
  lastShelterAuxiliaryRuntimeTeminEt
} = require("./last_shelter_auxiliary_runtime_reference");

assert.deepStrictEqual(
  LAST_SHELTER_CAREER_INFO.map(x => [x.careerId,x.talentArray.length]),
  [["222000",7],["222001",7],["222002",6]]
);

assert.deepStrictEqual(LAST_SHELTER_HIRE_ARMY_SHOP_DEFAULT,{
  gridNum:0,refreshGold:100,nextFreeReFresh:0,refreshTimes:0,items:[]
});

assert.deepStrictEqual(LAST_SHELTER_MINE_DEFAULT,{
  call:0,level:1,xml_miner:2,mineTime:0,exp:0,miner:0,xml_exp:1
});

assert.strictEqual(LAST_SHELTER_WORLD_FORTRESS_DEFAULT.length,1);
assert.strictEqual(LAST_SHELTER_WORLD_FORTRESS_DEFAULT[0].maxDefence,10000);
assert.strictEqual(LAST_SHELTER_WORLD_FORTRESS_DEFAULT[0].maxMember,7);
assert.strictEqual(LAST_SHELTER_WORLD_FORTRESS_DEFAULT[0].fortressLevel,1);

assert.deepStrictEqual(LAST_SHELTER_RECOVER_DURABILITY_DEFAULT,{
  "200065":0,"200078":0,"200079":0
});
assert.deepStrictEqual(LAST_SHELTER_RESCUE_CENTER_DEFAULT,{
  operateType:0,startTime:"0",endTime:"0",beanList:[]
});
assert.deepStrictEqual(LAST_SHELTER_MIXED_INFO_DEFAULT,{
  materialBackup:1,
  popRate:"gift_pop;50|nmonth_pop;50",
  todayLoginTimes:1,
  scoreSwitch:true,
  discoveryRemainCount:50
});

assert.strictEqual(LAST_SHELTER_LOTTERY_REFERENCE.diamond,200);
assert.strictEqual(LAST_SHELTER_LOTTERY_REFERENCE.isNewLottery,1);
assert.strictEqual(LAST_SHELTER_LOTTERY_REFERENCE.isOpen,"1");
assert.strictEqual(
  lotteryEntryListParseEt(LAST_SHELTER_LOTTERY_REFERENCE.normal).length,
  9
);
assert.deepStrictEqual(
  rewardTokenParseEt(LAST_SHELTER_CARGO_REFERENCE.rewardInfo),
  {kind:"goods",id:"210120",amount:1}
);

assert.deepStrictEqual(LAST_SHELTER_DAY_AND_NIGHT_RUNTIME,{
  night:"3",day:"300000"
});
assert.deepStrictEqual(LAST_SHELTER_BUSINESSMAN_OBSERVED,{
  isOpen:0,startTime:1789617600000,endTime:1790308800000
});

const runtime = lastShelterAuxiliaryRuntimeDefaultHazirla();
assert.strictEqual(runtime.currentCapacity,0);
assert.strictEqual(runtime.maxCapacity,0);
assert.strictEqual(runtime.cityDefValue,0);
assert.deepStrictEqual(runtime.armyFormation,[]);
assert.deepStrictEqual(runtime.hospital,[]);
assert.deepStrictEqual(runtime.defenseInfo,[]);
assert.strictEqual(runtime.cargo.rewardTime,0);
assert.strictEqual(runtime.lottery.todayCount,0);
assert.strictEqual(runtime.repayinfo.payPoint,0);
assert.deepStrictEqual(runtime.repayinfo.claimedPoints,[]);
assert.strictEqual(runtime.killWorldBossNumber,0);
assert.strictEqual(runtime.killActivityBossNumber,0);
assert.deepStrictEqual(runtime.heroprison,[]);
assert.deepStrictEqual(runtime.chatShield,[]);
assert.strictEqual(runtime.hasPassword,false);
assert.strictEqual(runtime.isOpenedKingdomAct,false);
assert.deepStrictEqual(runtime.kingdomSeasonObj,{riseInfo:[]});
assert.strictEqual(runtime.cityDefRecoverRecord,0);
assert.strictEqual(runtime.mailTranslation,false);
assert.strictEqual(runtime.activationStoptime,0);
assert.deepStrictEqual(runtime.exchangeGift,[]);
assert.strictEqual(runtime.resourcePoints.length,13);
assert.deepStrictEqual(runtime.resourcePoints[0],{showId:20001401,x:18,y:23,rtType:0});
assert.deepStrictEqual(runtime.resourcePoints[12],{showId:20001441,x:28,y:45,rtType:11});

const state = {};
const first = lastShelterAuxiliaryRuntimeTeminEt(state);
first.mine.exp = 11;
first.repayinfo.payPoint = 400;
first.killWorldBossNumber = 2;
first.resourcePoints[0].x = 19;
const second = lastShelterAuxiliaryRuntimeTeminEt(state);
assert.strictEqual(first,second);
assert.strictEqual(second.mine.exp,11);
assert.strictEqual(second.repayinfo.payPoint,400);
assert.strictEqual(second.killWorldBossNumber,2);
assert.strictEqual(second.resourcePoints[0].x,19);

const legacyRepayState={
  lastShelterRepay:{
    payPoint:"2000",
    claimedPoints:["400",400,-1]
  }
};
const normalizedLegacy=
  lastShelterAuxiliaryRuntimeTeminEt(
    legacyRepayState
  );
assert.strictEqual(
  normalizedLegacy.repayinfo.payPoint,
  2000
);
assert.deepStrictEqual(
  normalizedLegacy.repayinfo.claimedPoints,
  [400]
);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(
    legacyRepayState,
    "lastShelterRepay"
  ),
  false
);

console.log("PASS: verified Last Shelter auxiliary fresh-account runtime references are preserved.");
