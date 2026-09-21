"use strict";

const assert=require("assert");

const {
  lastShelterResourceRuntimeDefaultHazirla
}=require("./last_shelter_resource_runtime");
const {
  lastShelterGoldWalletDefaultHazirla
}=require("./last_shelter_gold_wallet");
const {
  starterGeneralHazirla
}=require("./last_shelter_hero_reference");
const {
  troopTransferRuntimeDefaultHazirla
}=require("./last_shelter_troop_transfer_reference");
const {
  lastShelterWorldRuntimeDefaultHazirla
}=require("./last_shelter_world_battlefield_reference");
const {
  lastShelterAllianceRuntimeDefaultHazirla
}=require("./last_shelter_alliance_runtime_contract");
const {
  starterCityRuntimeHazirla
}=require("./last_shelter_starter_city_reference");
const {
  lastShelterEngagementRuntimeDefaultHazirla
}=require("./last_shelter_engagement_reward_reference");
const {
  truckRuntimeDefaultHazirla
}=require("./last_shelter_truck_convoy_reference");
const {
  lastShelterMissionRuntimeDefaultHazirla
}=require("./last_shelter_task_reference");
const {
  lastShelterAuxiliaryRuntimeDefaultHazirla
}=require("./last_shelter_auxiliary_runtime_reference");
const {
  sevenDaysRuntimeDefaultHazirla
}=require("./last_shelter_seven_days_reference");
const {
  lastShelterStarterAccountRuntimeDefaultHazirla
}=require("./last_shelter_starter_account_reference");
const {
  fortRuntimeDefaultHazirla
}=require("./last_shelter_fort_troop_reference");
const {
  lastShelterMissileRuntimeDefaultHazirla
}=require("./last_shelter_missile_runtime");
const {
  freshInitEnvelopeRuntimeDefaultHazirla
}=require("./last_shelter_fresh_init_envelope_reference");
const {
  lastShelterInitPayloadHazirla,
  lastShelterInitCommandiniQeydEt
}=require("./runtime_last_shelter_init_command");

class FakeRouter {
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    this.routes.set(
      String(type).toLowerCase(),
      {handler,options}
    );
    return this;
  }
}

let seq=0;
const uuid=()=>"init-uuid-"+(++seq);

const state={
  lastShelterFreshInitEnvelopeRuntime:
    freshInitEnvelopeRuntimeDefaultHazirla(),
  lastShelterGoldWallet:
    lastShelterGoldWalletDefaultHazirla(),
  lastShelterResourceRuntime:
    lastShelterResourceRuntimeDefaultHazirla(1000),
  lastShelterHeroRuntime:{
    generals:[starterGeneralHazirla(uuid)]
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
    sevenDaysRuntimeDefaultHazirla(1000),
  lastShelterStarterAccountRuntime:
    lastShelterStarterAccountRuntimeDefaultHazirla(uuid),
  lastShelterFortRuntime:
    fortRuntimeDefaultHazirla(),
  lastShelterMissileRuntime:
    lastShelterMissileRuntimeDefaultHazirla()
};

state.lastShelterFreshInitEnvelopeRuntime.vipstoreLevel=2;
state.lastShelterFreshInitEnvelopeRuntime.kingdomContribution=17;

const payload=
  lastShelterInitPayloadHazirla(
    state,
    "27817000002"
  );

assert.strictEqual(payload.user.uid,"27817000002");
assert.strictEqual(payload.user.gold,40);
assert.strictEqual(payload.vipstoreLevel,2);
assert.strictEqual(payload.kingdomContribution,17);
assert.strictEqual(payload.activity.length,12);
assert.strictEqual(payload.queue.length,12);
assert.strictEqual(payload.task.length,205);
assert.strictEqual(payload.showScienceArray.length,52);
assert.strictEqual(payload.store.length,401);
assert.strictEqual(payload.missileList.length,6);

const router=new FakeRouter();
lastShelterInitCommandiniQeydEt(
  router,
  {
    getOrCreatePlayerState:()=>state,
    ensureFreshPlayerState:async ()=>state,
    updateServerTime:s=>{s.serverTimeUnixMs=123;}
  }
);

assert.strictEqual(router.routes.has("last_shelter.init"),true);
assert.deepStrictEqual(
  router.routes.get("last_shelter.init").options,
  {authRequired:true,mutation:false}
);

const sent=[];
router.routes.get("last_shelter.init").handler({
  ws:{_authedPlayerId:"27817000002"},
  msg:{playerId:"27817000002"},
  send:(ws,data)=>sent.push(data),
  nowMs:()=>456
}).then(()=>{
  assert.strictEqual(sent[0].type,"last_shelter.init");
  assert.strictEqual(sent[0].serverTimeUnixMs,456);
  assert.strictEqual(sent[0].payload.user.uid,"27817000002");
  assert.strictEqual(JSON.parse(sent[0].payloadJson).task.length,205);
  console.log(
    "PASS: unified verified Last Shelter init projection is exposed by authenticated runtime command."
  );
}).catch(error=>{
  console.error(error);
  process.exitCode=1;
});
