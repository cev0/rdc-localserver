"use strict";

const assert = require("assert");
const {lastShelterResourceRuntimeDefaultHazirla}=require("./last_shelter_resource_runtime");
const {lastShelterGoldWalletDefaultHazirla}=require("./last_shelter_gold_wallet");
const {starterGeneralHazirla}=require("./last_shelter_hero_reference");
const {troopTransferRuntimeDefaultHazirla}=require("./last_shelter_troop_transfer_reference");
const {lastShelterWorldRuntimeDefaultHazirla}=require("./last_shelter_world_battlefield_reference");
const {lastShelterAllianceRuntimeDefaultHazirla}=require("./last_shelter_alliance_runtime_contract");
const {starterCityRuntimeHazirla}=require("./last_shelter_starter_city_reference");
const {lastShelterEngagementRuntimeDefaultHazirla}=require("./last_shelter_engagement_reward_reference");
const {truckRuntimeDefaultHazirla}=require("./last_shelter_truck_convoy_reference");
const {lastShelterMissionRuntimeDefaultHazirla}=require("./last_shelter_task_reference");
const {lastShelterAuxiliaryRuntimeDefaultHazirla}=require("./last_shelter_auxiliary_runtime_reference");
const {sevenDaysRuntimeDefaultHazirla}=require("./last_shelter_seven_days_reference");
const {lastShelterStarterAccountRuntimeDefaultHazirla}=require("./last_shelter_starter_account_reference");
const {fortRuntimeDefaultHazirla}=require("./last_shelter_fort_troop_reference");
const {lastShelterVerifiedInitProjectionHazirla}=require("./last_shelter_init_projection");

let seq=0; const uuid=()=>"test-uuid-"+(++seq);
const state={
 lastShelterGoldWallet:lastShelterGoldWalletDefaultHazirla(),
 lastShelterResourceRuntime:lastShelterResourceRuntimeDefaultHazirla(1789659007819),
 lastShelterHeroRuntime:{generals:[starterGeneralHazirla(uuid)]},
 troopTransferRuntime:troopTransferRuntimeDefaultHazirla(),
 lastShelterWorldRuntime:lastShelterWorldRuntimeDefaultHazirla(),
 lastShelterAllianceRuntime:lastShelterAllianceRuntimeDefaultHazirla(),
 lastShelterCityRuntime:starterCityRuntimeHazirla(uuid),
 lastShelterEngagementRuntime:lastShelterEngagementRuntimeDefaultHazirla(),
 lastShelterTruckRuntime:truckRuntimeDefaultHazirla(""),
 lastShelterMissionRuntime:lastShelterMissionRuntimeDefaultHazirla(),
 lastShelterAuxiliaryRuntime:lastShelterAuxiliaryRuntimeDefaultHazirla(),
 lastShelterSevenDaysRuntime:sevenDaysRuntimeDefaultHazirla(1789659007819),
 lastShelterStarterAccountRuntime:lastShelterStarterAccountRuntimeDefaultHazirla(uuid),
 lastShelterFortRuntime:fortRuntimeDefaultHazirla()
};
const payload=lastShelterVerifiedInitProjectionHazirla(state,{uid:"27817000002"});
assert.deepStrictEqual(payload.user,{uid:"27817000002",gold:40,gold1:40,paidGold:0});
assert.strictEqual(payload.activity.length,12);
assert.strictEqual(payload.building.length,2);
assert.strictEqual(payload.buildingReference.length,21);
assert.strictEqual(payload.buildingReference.find(x=>x.itemId==="400000"&&x.level===26).power,327113);
assert.strictEqual(payload.buildingReference.find(x=>x.itemId==="413000"&&x.level===1).time,150);
assert.strictEqual(payload.buildingReference.find(x=>x.itemId==="419000"&&x.level===25).wood,79000000);
assert.strictEqual(payload.buildListConfig.length,10);
assert.strictEqual(payload.items.length,2);
assert.strictEqual(payload.queue.length,12);
assert.deepStrictEqual(payload.finishedQueue,[]);
assert.strictEqual(payload.heroTemplates.length,21);
assert.strictEqual(payload.userGenerals.length,1);
assert.strictEqual(payload.userGenerals[0].generalId,"240020");
assert.strictEqual(payload.troopTranList.length,4);
assert.strictEqual(payload.fort.length,20);
assert.strictEqual(payload.truckInfo.length,1);
assert.strictEqual(payload.store.length,401);
assert.strictEqual(payload.missileList.length,6);
assert.strictEqual(payload.showScienceArray.length,52);
assert.strictEqual(payload.task.length,205);
assert.strictEqual(payload.chapterTask.hasNextChapter,true);
assert.strictEqual(payload.taskPoint,0);
assert.strictEqual(payload.sevenDaysActivity.taskInfo.length,5);
assert.strictEqual(payload.firstPayReward.length,4);
assert.strictEqual(payload.onlineDuration.onlineDurationRewards.length,6);
assert.strictEqual(payload.helicopter_info.helicopters.length,5);
assert.strictEqual(payload.world.maxstamina,100);
assert.strictEqual(payload.world.stamina,100);
assert.strictEqual(payload.resourcePoints.length,13);
assert.strictEqual(payload.repayinfo.payRewards.length,6);
assert.deepStrictEqual(payload.alliance,{});

const serialized=JSON.stringify(payload);
for(const capturedUuid of ["017598b510ff4815859e2cf1ab48e1e7","8be923f1594745fe9698598a6d18923e","e36e2c4813274c428da3708251146e35","4ef26273feef4212ab4c2cf0e5612c62"]){assert.strictEqual(serialized.includes(capturedUuid),false);}
assert.strictEqual(serialized.includes("1789659154467"),false);
assert.strictEqual(serialized.includes("1789659010649"),false);
assert.strictEqual(serialized.includes("db_utc_timestamp"),false);
assert.strictEqual(serialized.includes("baseBuildingLevel"),false);

const developedState=JSON.parse(JSON.stringify(state));
developedState.troopTransferRuntime[0].level=6;
developedState.troopTransferRuntime[0].total=10;
developedState.troopTransferRuntime[0].power=0;
developedState.troopTransferRuntime[0].exp=777;
developedState.troopTransferRuntime[0].todayTranTimes=3;
const developedPayload=lastShelterVerifiedInitProjectionHazirla(developedState,{uid:"27817000003"});
assert.strictEqual(developedPayload.troopTranList[0].level,6);
assert.strictEqual(developedPayload.troopTranList[0].total,50);
assert.strictEqual(developedPayload.troopTranList[0].power,244);
assert.strictEqual(developedPayload.troopTranList[0].exp,777);
assert.strictEqual(developedPayload.troopTranList[0].todayTranTimes,3);

payload.building[0].power=999999;
assert.notStrictEqual(state.lastShelterCityRuntime.buildings[0].power,999999);
payload.buildingReference[0].power=999999;
const fresh=lastShelterVerifiedInitProjectionHazirla(state,{uid:"27817000002"});
assert.notStrictEqual(fresh.buildingReference[0].power,999999);
console.log("PASS: unified Last Shelter verified init projection includes verified building runtime catalog without captured account leakage.");
