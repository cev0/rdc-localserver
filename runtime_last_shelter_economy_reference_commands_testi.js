"use strict";

const assert=require("assert");
const {repaySnapshotHazirla,allianceGroupPurchaseSnapshotHazirla,vipStoreSnapshotHazirla,lastShelterEconomyReferenceCommandleriniQeydEt}=require("./runtime_last_shelter_economy_reference_commands");

class FakeRouter {constructor(){this.routes=new Map();} register(type,handler,options){this.routes.set(String(type).toLowerCase(),{handler,options});return this;}}

(async()=>{
  const state={
    lastShelterAuxiliaryRuntime:{repayinfo:{payPoint:2000,claimedPoints:[400,"400",-1,"bad"]}},
    lastShelterAllianceRuntime:{groupPurchaseActivity:{activityId:"57032",progress:2},groupPurchaseRecords:[{id:"r1"}]},
    lastShelterVipStore:{currentExp:5,level:2,activepoint:7,gambleCount:1,initExp:3,purchaseCounts:{"1000":4}}
  };

  const repay=repaySnapshotHazirla(state);
  assert.deepStrictEqual(repay.eligibleRewards.map(x=>x.point),[400,2000]);
  assert.deepStrictEqual(repay.claimedPoints,[400]);
  assert.deepStrictEqual(repay.claimableRewards.map(x=>x.point),[2000]);
  assert.deepStrictEqual(
    state.lastShelterAuxiliaryRuntime.repayinfo.claimedPoints,
    [400],
    "repay.info must normalize persisted Last Shelter repay runtime before projection."
  );
  assert.strictEqual(allianceGroupPurchaseSnapshotHazirla(state).runtime.progress,2);
  assert.strictEqual(vipStoreSnapshotHazirla(state,1789704000).vipstore.goods[0].buyAmount,4);
  assert.strictEqual(vipStoreSnapshotHazirla(state,1789704000).vipstore.refreshTime,1789704000);
  assert.strictEqual(state.lastShelterVipStore.refreshTime,undefined,"Projection provider must not mutate persisted VIP state.");

  const legacyRepayState={
    lastShelterRepay:{
      payPoint:"400",
      claimedPoints:["400",400,-1]
    }
  };
  const legacyRepay=repaySnapshotHazirla(legacyRepayState);
  assert.strictEqual(legacyRepay.payPoint,400);
  assert.deepStrictEqual(legacyRepay.claimedPoints,[400]);
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      legacyRepayState,
      "lastShelterRepay"
    ),
    false,
    "Legacy repay state must be migrated into lastShelterAuxiliaryRuntime.repayinfo."
  );
  assert.deepStrictEqual(
    legacyRepayState.lastShelterAuxiliaryRuntime.repayinfo,
    {payPoint:400,claimedPoints:[400]}
  );

  const router=new FakeRouter();
  lastShelterEconomyReferenceCommandleriniQeydEt(router,{getOrCreatePlayerState:()=>state,getVipStoreRefreshTime:()=>1789704000});
  const routeNames=["activity.list","activity.get","shop.list","shop.get","repay.info","alliance.group_purchase.info","alliance.group_purchase.offer","vipstore.panel"];
  assert.deepStrictEqual(Array.from(router.routes.keys()),routeNames);
  for(const name of routeNames) assert.deepStrictEqual(router.routes.get(name).options,{authRequired:true,mutation:false});

  const ws={_authedPlayerId:"p1"}; const sent=[]; const send=(socket,payload)=>sent.push(payload);
  await router.routes.get("activity.get").handler({ws,msg:{playerId:"p1",id:"57041"},send,nowMs:()=>101});
  assert.strictEqual(sent[0].row.id,"57041");
  sent.length=0;
  await router.routes.get("shop.get").handler({ws,msg:{playerId:"p1",id:"200000001"},send,nowMs:()=>102});
  assert.strictEqual(sent[0].itemTupleRaw.length,8);
  sent.length=0;
  await router.routes.get("repay.info").handler({ws,msg:{playerId:"p1"},send,nowMs:()=>103});
  assert.strictEqual(sent[0].repay.payPoint,2000);
  assert.deepStrictEqual(sent[0].repay.claimedPoints,[400]);
  assert.deepStrictEqual(sent[0].repay.claimableRewards.map(x=>x.point),[2000]);
  sent.length=0;
  await router.routes.get("alliance.group_purchase.offer").handler({ws,msg:{playerId:"p1",goodsId:"207058"},send,nowMs:()=>104});
  assert.strictEqual(sent[0].offer.key,"k6");
  sent.length=0;
  await router.routes.get("vipstore.panel").handler({ws,msg:{playerId:"p1",refreshTime:1789704000},send,nowMs:()=>105});
  assert.strictEqual(sent[0].panel.vipstore.level,2);
  assert.strictEqual(sent[0].panel.vipstore.goods[0].buyAmount,4);
  assert.strictEqual(sent[0].panel.vipstore.refreshTime,1789704000,"Server refresh provider authoritative olmalıdır.");
  sent.length=0;
  await router.routes.get("shop.get").handler({ws,msg:{playerId:"wrong",id:"200000001"},send,nowMs:()=>106});
  assert.strictEqual(sent[0].code,"PLAYER_ID_MISMATCH");
  console.log("PASS: Last Shelter economy reference exposes normalized authoritative repay state and migrates legacy repay storage.");
})().catch(error=>{console.error(error);process.exitCode=1;});
