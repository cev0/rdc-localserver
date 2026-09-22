"use strict";

const assert=require("assert");
const {
  engagementSnapshotHazirla,
  lastShelterEngagementCommandleriniQeydEt
}=require("./runtime_last_shelter_engagement_commands");

class FakeRouter {
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    this.routes.set(String(type).toLowerCase(),{handler,options});
    return this;
  }
}

(async()=>{
  const state={};
  const snapshot=engagementSnapshotHazirla(state);
  assert.strictEqual(snapshot.firstPayReward.length,4);
  assert.strictEqual(snapshot.onlineDurationRewards.length,6);
  assert.strictEqual(snapshot.onlineDurationRecruitHero,"240041");
  assert.strictEqual(snapshot.helicopter.tasks.length,5);
  assert.strictEqual(snapshot.helicopter.refugeeLimit,4);
  assert.strictEqual(snapshot.helicopter.record.todayTaskCountLimit,10);

  state.lastShelterEngagementRuntime.onlineDuration.rewards[0].duration=4;
  state.lastShelterEngagementRuntime.helicopter.taskState[0].finishTime=12345;
  const updated=engagementSnapshotHazirla(state);
  assert.strictEqual(updated.onlineDurationRewards[0].duration,4);
  assert.strictEqual(updated.helicopter.tasks[0].runtime.finishTime,12345);

  const router=new FakeRouter();
  lastShelterEngagementCommandleriniQeydEt(router,{
    getOrCreatePlayerState:()=>state
  });
  assert.deepStrictEqual(router.routes.get("engagement.online_duration.get").options,{
    authRequired:true,
    mutation:false
  });
  assert.deepStrictEqual(router.routes.get("engagement.info").options,{
    authRequired:true,
    mutation:false
  });

  const sent=[];
  await router.routes.get("engagement.online_duration.get").handler({
    ws:{_authedPlayerId:"p1"},
    msg:{playerId:"p1",entryId:"1"},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>776
  });
  assert.strictEqual(sent[0].type,"engagement.online_duration.get");
  assert.strictEqual(sent[0].reward.entryId,"1");
  assert.strictEqual(sent[0].reward.duration,4);
  assert.strictEqual(sent[0].serverTimeUnixMs,776);

  sent.length=0;
  await router.routes.get("engagement.online_duration.get").handler({
    ws:{_authedPlayerId:"p1"},
    msg:{playerId:"p1",entryId:"missing"},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>776
  });
  assert.strictEqual(sent[0].code,"ONLINE_DURATION_REWARD_NOT_FOUND");

  sent.length=0;
  await router.routes.get("engagement.info").handler({
    ws:{_authedPlayerId:"p1"},
    msg:{playerId:"p1"},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>777
  });
  assert.strictEqual(sent[0].type,"engagement.info");
  assert.strictEqual(sent[0].serverTimeUnixMs,777);
  assert.strictEqual(sent[0].engagement.onlineDurationRewards[0].duration,4);

  sent.length=0;
  await router.routes.get("engagement.info").handler({
    ws:{_authedPlayerId:"p1"},
    msg:{playerId:"wrong"},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>778
  });
  assert.strictEqual(sent[0].code,"PLAYER_ID_MISMATCH");

  console.log("PASS: verified Last Shelter engagement reference/runtime is exposed through authenticated read command.");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
