"use strict";
const assert=require("assert");
const {lastShelterAuxiliaryCommandleriniQeydEt}=require("./runtime_last_shelter_auxiliary_reference_commands");
class R{constructor(){this.routes=new Map()}register(t,h,o){this.routes.set(t,{h,o});return this}}
(async()=>{
 const state={lastShelterResourceRuntime:{regTime:1000}};
 const r=new R(); lastShelterAuxiliaryCommandleriniQeydEt(r,{getOrCreatePlayerState:()=>state});
 for(const n of ["activity.reference.list","activity.reference.get","missile.info","seven_days.info","truck.info","world.info","battlefield.get"]) assert.deepStrictEqual(r.routes.get(n).o,{authRequired:true,mutation:false});
 const sent=[],ws={_authedPlayerId:"p1"},send=(_,x)=>sent.push(x);
 await r.routes.get("activity.reference.list").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4997});
 assert.strictEqual(sent[0].activities.length,12);
 await r.routes.get("activity.reference.get").h({ws,msg:{playerId:"p1",id:"57041"},send,nowMs:()=>4998});
 assert.strictEqual(sent[1].activity.reward[0].value.id,"207081");
 await r.routes.get("missile.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>4999});
 assert(sent[2].missiles.length>0); const original=state.lastShelterMissileRuntime.missiles[0].totalNum; sent[2].missiles[0].totalNum=999; assert.strictEqual(state.lastShelterMissileRuntime.missiles[0].totalNum,original);
 await r.routes.get("seven_days.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>5000});
 assert.strictEqual(sent[3].activity.startTime,1000); assert.strictEqual(sent[3].topology.valid,true);
 await r.routes.get("truck.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>5001});
 assert.strictEqual(sent[4].trucks[0].xmlId,"20001001");
 await r.routes.get("world.info").h({ws,msg:{playerId:"p1"},send,nowMs:()=>5002});
 assert.strictEqual(sent[5].world.stamina,100); assert.strictEqual(sent[5].battlefieldMaps.length,3);
 sent[5].world.stamina=1; assert.strictEqual(state.lastShelterWorldRuntime.stamina,100);
 await r.routes.get("battlefield.get").h({ws,msg:{playerId:"p1",id:"220100"},send,nowMs:()=>5003});
 assert.strictEqual(sent[6].map.id,"220100"); assert(sent[6].restrictions.bannedMissileIds.includes("53303"));
 await r.routes.get("battlefield.get").h({ws,msg:{playerId:"p1",id:"missing"},send,nowMs:()=>5004});
 assert.strictEqual(sent[7].code,"BATTLEFIELD_NOT_FOUND");
 console.log("PASS: auxiliary verified runtime reads");
})().catch(e=>{console.error(e);process.exit(1)});
