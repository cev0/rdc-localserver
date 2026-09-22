"use strict";
const assert=require("assert");
const {lastShelterAuxiliaryCommandleriniQeydEt}=require("./runtime_last_shelter_auxiliary_reference_commands");
class R{constructor(){this.routes=new Map()}register(t,h,o){this.routes.set(t,{h,o});return this}}
(async()=>{
 const state={lastShelterResourceRuntime:{regTime:1000}};
 const r=new R(); lastShelterAuxiliaryCommandleriniQeydEt(r,{getOrCreatePlayerState:()=>state});
 for(const n of ["alliance.group_purchase.info","alliance.group_purchase.offer.get","fort.troop.list","fort.troop.get","troop_transfer.reference.list","troop_transfer.reference.get","shop.reference.list","vip_store.info","repay.info","activity.reference.list","activity.reference.get","missile.info","seven_days.info","truck.info","world.info","battlefield.get"]) assert.deepStrictEqual(r.routes.get(n).o,{authRequired:true,mutation:false});
 const sent=[],ws={_authedPlayerId:"p1"},send=(_,x)=>sent.push(x);
 await r.routes.get("alliance.group_purchase.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4988}); assert.strictEqual(sent[6].reference.offers.length,6); assert.strictEqual(sent[6].runtime.progress,0);
 await r.routes.get("alliance.group_purchase.offer.get").h({ws,msg:{playerId:"p1",goodsId:"207055"},send,nowMs:()=>4989}); assert.strictEqual(sent[7].offer.key,"k3");
 await r.routes.get("fort.troop.list").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4990}); assert.strictEqual(sent[8].troops.length,20); assert.strictEqual(sent[8].troops.find(x=>x.id==="107900").free,1);
 await r.routes.get("fort.troop.get").h({ws,msg:{playerId:"p1",id:"107900"},send,nowMs:()=>4991}); assert.strictEqual(sent[9].troop.trainingTimeSeconds,40);
 await r.routes.get("troop_transfer.reference.list").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4992}); assert.strictEqual(sent[10].trees.length,4); assert.strictEqual(sent[10].trees[0].details.length,12);
 await r.routes.get("troop_transfer.reference.get").h({ws,msg:{playerId:"p1",transferType:1,pointType:"12"},send,nowMs:()=>4993}); assert.strictEqual(sent[11].point.id,"109048");
 await r.routes.get("shop.reference.list").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4994}); assert.strictEqual(sent[6].shops.length,8); assert.strictEqual(sent[6].shops[0].itemTuplesRaw.length,8);
 await r.routes.get("vip_store.info").h({ws,msg:{playerId:"p1",refreshTime:123},send,nowMs:()=>4995}); assert.strictEqual(sent[7].panel.vipstore.level,1); assert.strictEqual(sent[7].panel.vipstore.refreshTime,123);
 state.lastShelterAuxiliaryRuntime={repayinfo:{payPoint:2000,claimedPoints:[400]}};
 await r.routes.get("repay.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4996}); assert.strictEqual(sent[8].eligibleRewards.length,2); assert.strictEqual(sent[8].claimableRewards.length,1); assert.strictEqual(sent[8].claimableRewards[0].point,2000);
 await r.routes.get("activity.reference.list").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4997}); assert.strictEqual(sent[9].activities.length,12);
 await r.routes.get("activity.reference.get").h({ws,msg:{playerId:"p1",id:"57041"},send,nowMs:()=>4998}); assert.strictEqual(sent[10].activity.reward[0].value.id,"207081");
 await r.routes.get("missile.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4999}); assert(sent[11].missiles.length>0); const original=state.lastShelterMissileRuntime.missiles[0].totalNum; sent[11].missiles[0].totalNum=999; assert.strictEqual(state.lastShelterMissileRuntime.missiles[0].totalNum,original);
 await r.routes.get("seven_days.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>5000}); assert.strictEqual(sent[12].activity.startTime,1000); assert.strictEqual(sent[12].topology.valid,true);
 await r.routes.get("truck.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>5001}); assert.strictEqual(sent[13].trucks[0].xmlId,"20001001");
 await r.routes.get("world.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>5002}); assert.strictEqual(sent[14].world.stamina,100); assert.strictEqual(sent[14].battlefieldMaps.length,3); sent[14].world.stamina=1; assert.strictEqual(state.lastShelterWorldRuntime.stamina,100);
 await r.routes.get("battlefield.get").h({ws,msg:{playerId:"p1",id:"220100"},send,nowMs:()=>5003}); assert.strictEqual(sent[15].map.id,"220100"); assert(sent[15].restrictions.bannedMissileIds.includes("53303"));
 await r.routes.get("battlefield.get").h({ws,msg:{playerId:"p1",id:"missing"},send,nowMs:()=>5004}); assert.strictEqual(sent[16].code,"BATTLEFIELD_NOT_FOUND");
 console.log("PASS: auxiliary verified runtime reads");
})().catch(e=>{console.error(e);process.exit(1)});
