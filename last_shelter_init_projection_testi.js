"use strict";

const assert = require("assert");

const {
  lastShelterResourceRuntimeDefaultHazirla
} = require("./last_shelter_resource_runtime");
const {
  lastShelterGoldWalletDefaultHazirla
} = require("./last_shelter_gold_wallet");
const {
  starterGeneralHazirla
} = require("./last_shelter_hero_reference");
const {
  troopTransferRuntimeDefaultHazirla
} = require("./last_shelter_troop_transfer_reference");
const {
  lastShelterWorldRuntimeDefaultHazirla
} = require("./last_shelter_world_battlefield_reference");
const {
  lastShelterAllianceRuntimeDefaultHazirla
} = require("./last_shelter_alliance_runtime_contract");
const {
  starterCityRuntimeHazirla
} = require("./last_shelter_starter_city_reference");
const {
  lastShelterEngagementRuntimeDefaultHazirla
} = require("./last_shelter_engagement_reward_reference");
const {
  truckRuntimeDefaultHazirla
} = require("./last_shelter_truck_convoy_reference");
const {
  lastShelterMissionRuntimeDefaultHazirla
} = require("./last_shelter_task_reference");
const {
  lastShelterAuxiliaryRuntimeDefaultHazirla
} = require("./last_shelter_auxiliary_runtime_reference");
const {
  sevenDaysRuntimeDefaultHazirla
} = require("./last_shelter_seven_days_reference");
const {
  lastShelterStarterAccountRuntimeDefaultHazirla
} = require("./last_shelter_starter_account_reference");
const {
  fortRuntimeDefaultHazirla
} = require("./last_shelter_fort_troop_reference");
const {
  lastShelterVerifiedInitProjectionHazirla
} = require("./last_shelter_init_projection");

let seq = 0;
const uuid = () => "test-uuid-" + (++seq);

const state = {
  lastShelterGoldWallet:
    lastShelterGoldWalletDefaultHazirla(),
  lastShelterResourceRuntime:
    lastShelterResourceRuntimeDefaultHazirla(
      1789659007819
    ),
  lastShelterHeroRuntime: {
    generals: [
      starterGeneralHazirla(uuid)
    ]
  },
  troopTransferRuntime:
    troopTransferRuntimeDefaultHazirla(),
  lastShelterWorldRuntime:
    lastShelterWorldRuntimeDefaultHazirla(),
  lastShelterAllianceRuntime:
    lastShelterAllianceRuntimeDefaultHazirla(),
  lastShelterCityRuntime:
    starterCityRuntimeHazirla(uuid),
  lastShelterEngagementRuntime:
    lastShelterEngagementRuntimeDefaultHazirla(),
  lastShelterTruckRuntime:
    truckRuntimeDefaultHazirla(""),
  lastShelterMissionRuntime:
    lastShelterMissionRuntimeDefaultHazirla(),
  lastShelterAuxiliaryRuntime:
    lastShelterAuxiliaryRuntimeDefaultHazirla(),
  lastShelterSevenDaysRuntime:
    sevenDaysRuntimeDefaultHazirla(
      1789659007819
    ),
  lastShelterStarterAccountRuntime:
    lastShelterStarterAccountRuntimeDefaultHazirla(
      uuid
    ),
  lastShelterFortRuntime:
    fortRuntimeDefaultHazirla()
};

const payload =
  lastShelterVerifiedInitProjectionHazirla(
    state,
    { uid:"27817000002" }
  );

assert.deepStrictEqual(
  payload.user,
  {
    uid:"27817000002",
    gold:40,
    gold1:40,
    paidGold:0
  }
);
assert.strictEqual(payload.user.gold,40);
assert.strictEqual(payload.user.gold1,40);
assert.strictEqual(payload.user.paidGold,0);

assert.strictEqual(payload.activity.length,12);
assert.deepStrictEqual(
  payload.activity.map(x => x.id),
  [
    "57002","57032","57041","57061",
    "57059","57063","57067","57087",
    "57089","57121","57127","57149"
  ]
);

assert.strictEqual(payload.building.length,2);
assert.strictEqual(payload.buildListConfig.length,10);
assert.strictEqual(payload.items.length,2);
assert.strictEqual(payload.queue.length,12);
assert.deepStrictEqual(payload.finishedQueue,[]);
assert.strictEqual(payload.heroTemplates.length,21);
assert.strictEqual(payload.userGenerals.length,1);
assert.strictEqual(payload.userGenerals[0].generalId,"240020");
assert.strictEqual(payload.troopTranList.length,4);
assert.strictEqual(payload.troopTranList[0].level,0);
assert.strictEqual(payload.troopTranList[0].total,10);
assert.strictEqual(payload.fort.length,20);
assert.strictEqual(
  payload.fort.find(x => x.id === "107900").free,
  1
);
assert.strictEqual(
  payload.fort.filter(x => x.free > 0).length,
  1
);
assert.strictEqual(payload.truckInfo.length,1);
assert.strictEqual(payload.truckInfo[0].xmlId,"20001001");

assert.strictEqual(payload.store.length,401);
assert.deepStrictEqual(
  payload.store.find(x => x.id === "200500"),
  {
    id:"200500",
    reward:[
      {value:{id:"200331",num:2},type:7},
      {value:{id:"200301",num:2},type:7}
    ]
  }
);
assert.deepStrictEqual(
  payload.store.find(x => x.id === "200560"),
  {
    id:"200560",
    reward:[
      {value:2000,type:0},
      {value:2000,type:3}
    ]
  }
);
assert.deepStrictEqual(
  payload.store.find(x => x.id === "209612"),
  {
    id:"209612",
    reward:[
      {value:{id:"203362",num:1},type:7}
    ]
  }
);

assert.strictEqual(payload.missileList.length,6);
assert.deepStrictEqual(
  payload.missileList.map(x => x.missileId),
  ["53301","53302","53303","53304","53305","53306"]
);
assert.deepStrictEqual(
  payload.missileList.find(x => x.missileId === "53301"),
  {
    unlockFlag:0,
    missileId:"53301",
    unlock:true,
    plugin:"",
    money:1000000,
    electricity:2500000,
    food:1000000,
    time:3600,
    item_need:"212007;800",
    totalNum:0,
    unReceive:0,
    lastLaunchTime:0
  }
);
assert.strictEqual(
  payload.missileList.find(x => x.missileId === "53305").launch_cd,
  14400
);
assert.strictEqual(payload.missileList.some(x => x.missileId === "53307"),false);

assert.strictEqual(payload.showScienceArray.length,52);
assert.strictEqual(
  payload.showScienceArray.find(x => x.id === "249912").lock,
  "1;16|735201||735601"
);
assert.deepStrictEqual(
  payload.showScienceArray.filter(x => x.isShow === 1).map(x => x.id),
  ["20004000","20004001","20004012"]
);
assert.strictEqual(
  payload.showScienceArray.find(x => x.id === "20004040").version,
  "1.250.088"
);

assert.strictEqual(payload.task.length,205);
assert.strictEqual(
  payload.task.filter(x => x.type1 === 49).length,
  100
);
assert.strictEqual(
  payload.task.filter(x => x.type1 === 50).length,
  100
);
assert.strictEqual(
  payload.task.filter(x => x.type1 === 1).length,
  5
);

assert.strictEqual(payload.chapterTask.hasNextChapter,true);
assert.strictEqual(
  payload.chapterTask.chaterTask.uid,
  "27817000002"
);
assert.strictEqual(
  payload.chapterTask.chapterSubTaskArray.length,
  5
);
assert.strictEqual(payload.taskPoint,0);

assert.strictEqual(payload.sevenDaysActivity.taskInfo.length,5);
assert.strictEqual(
  payload.sevenDaysActivity.activityInfo.taskCount,
  100
);
assert.strictEqual(
  payload.sevenDaysActivity.activityInfo.uid,
  "27817000002"
);
assert.strictEqual(
  payload.sevenDaysActivity.activityInfo.endTime -
  payload.sevenDaysActivity.activityInfo.startTime,
  604800000
);

assert.strictEqual(payload.firstPayReward.length,4);
assert.strictEqual(
  payload.onlineDuration.onlineDurationRewards.length,
  6
);
assert.strictEqual(
  payload.onlineDuration.onlineDurationRecruitHero,
  "240041"
);
assert.strictEqual(
  payload.helicopter_info.helicopters.length,
  5
);
assert.strictEqual(
  payload.helicopter_info.record.todayTaskCountLimit,
  10
);

assert.deepStrictEqual(payload.world.enemy,[]);
assert.deepStrictEqual(payload.world.m,[]);
assert.strictEqual(payload.world.maxstamina,100);
assert.strictEqual(payload.world.stamina,100);
assert.strictEqual(
  payload.world.lastStaminaTime,
  "9223372036854775807"
);

assert.strictEqual(payload.currentCapacity,0);
assert.strictEqual(payload.maxCapacity,0);
assert.strictEqual(payload.city_def_val,0);
assert.strictEqual(payload.killWorldBossNumber,0);
assert.strictEqual(payload.killActivityBossNumber,0);
assert.deepStrictEqual(payload.heroprison,[]);
assert.deepStrictEqual(payload.chatShield,[]);
assert.strictEqual(payload.hasPassword,false);
assert.strictEqual(payload.isOpenedKingdomAct,false);
assert.deepStrictEqual(payload.kingdomSeasonObj,{riseInfo:[]});
assert.strictEqual(payload.city_def_recover_record,0);
assert.strictEqual(payload.mail_translation,false);
assert.strictEqual(payload.activationStoptime,0);
assert.deepStrictEqual(payload.exchange_gift,[]);
assert.strictEqual(payload.resourcePoints.length,13);
assert.deepStrictEqual(
  payload.resourcePoints.map(x => [x.showId,x.x,x.y,x.rtType]),
  [
    [20001401,18,23,0],[20001401,45,32,0],[20001401,27,34,0],
    [20001421,39,38,2],[20001421,45,45,2],
    [20001411,26,18,1],[20001411,34,26,1],
    [20001431,44,21,3],[20001431,38,32,3],[20001431,19,44,3],
    [20001441,38,18,11],[20001441,32,37,11],[20001441,28,45,11]
  ]
);
assert.deepStrictEqual(payload.army_formation,[]);
assert.deepStrictEqual(payload.hospital,[]);
assert.deepStrictEqual(payload.defenseInfo,[]);
assert.strictEqual(payload.careerInfo.length,3);
assert.strictEqual(payload.hireArmyShop.refreshGold,100);
assert.strictEqual(payload.mine.level,1);
assert.strictEqual(payload.world_fortress.length,1);
assert.deepStrictEqual(
  payload.recover_durability,
  {"200065":0,"200078":0,"200079":0}
);
assert.strictEqual(payload.lottery.diamond,200);
assert.strictEqual(payload.lottery.updatetime,0);
assert.strictEqual(payload.cargo.rewardTime,0);
assert.strictEqual(payload.cargo.rewardInfo,"goods,210120,1");
assert.strictEqual(payload.repayinfo.payPoint,0);
assert.strictEqual(payload.repayinfo.startTime,1479916800000);
assert.strictEqual(payload.repayinfo.endTime,1480435200000);
assert.strictEqual(payload.repayinfo.payRewards.length,6);
assert.deepStrictEqual(payload.repayinfo.payRewards.map(x=>x.point),[400,2000,30000,120000,450000,1200000]);
assert.deepStrictEqual(payload.alliance,{});

const serialized = JSON.stringify(payload);
for (const capturedUuid of [
  "017598b510ff4815859e2cf1ab48e1e7",
  "8be923f1594745fe9698598a6d18923e",
  "e36e2c4813274c428da3708251146e35",
  "4ef26273feef4212ab4c2cf0e5612c62"
]) {
  assert.strictEqual(
    serialized.includes(capturedUuid),
    false,
    "Captured account UUID leaked into generated init payload."
  );
}

assert.strictEqual(
  serialized.includes("1789659154467"),
  false,
  "Captured lottery epoch leaked into generated init payload."
);
assert.strictEqual(
  serialized.includes("1789659010649"),
  false,
  "Captured cargo epoch leaked into generated init payload."
);

assert.strictEqual(
  serialized.includes("db_utc_timestamp"),
  false,
  "Reference environment timezone offset must not be hardcoded into init projection."
);
assert.strictEqual(
  serialized.includes("baseBuildingLevel"),
  false,
  "Ambiguous captured baseBuildingLevel must not be promoted without a verified semantic contract."
);

const developedState =
  JSON.parse(JSON.stringify(state));
developedState.troopTransferRuntime[0].level = 6;
developedState.troopTransferRuntime[0].total = 10;
developedState.troopTransferRuntime[0].power = 0;
developedState.troopTransferRuntime[0].exp = 777;
developedState.troopTransferRuntime[0].todayTranTimes = 3;

const developedPayload =
  lastShelterVerifiedInitProjectionHazirla(
    developedState,
    { uid:"27817000003" }
  );

assert.strictEqual(
  developedPayload.troopTranList[0].level,
  6
);
assert.strictEqual(
  developedPayload.troopTranList[0].total,
  50
);
assert.strictEqual(
  developedPayload.troopTranList[0].power,
  244
);
assert.strictEqual(
  developedPayload.troopTranList[0].exp,
  777
);
assert.strictEqual(
  developedPayload.troopTranList[0].todayTranTimes,
  3
);
assert.strictEqual(
  developedPayload.troopTranList[0]
    .details
    .find(x=>x.id==="109034")
    .level,
  1
);
assert.deepStrictEqual(
  developedPayload.troopTranList[0]
    .details
    .find(x=>x.id==="109034")
    .effects,
  {
    "1561":-5,
    "1531":-5,
    "1541":-5,
    "1551":-5
  }
);

payload.building[0].power = 999999;
assert.notStrictEqual(
  state.lastShelterCityRuntime.buildings[0].power,
  999999
);

console.log(
  "PASS: unified Last Shelter verified init projection preserves all migrated fresh-account contracts without captured UUID/time leakage."
);
