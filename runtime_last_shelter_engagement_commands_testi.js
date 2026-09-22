"use strict";

const assert=require("assert");
const {
  engagementSnapshotHazirla,
  helicopterTaskSnapshotAl,
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
  state.lastShelterEngagementRuntime={
    firstPayRewardClaimed:false,
    onlineDuration:{rewards:[{entryId:"1",duration:-4,rewardState:"bad"},{entryId:"999",duration:9,rewardState:9}]},
    helicopter:{record:{freeRefreshCount:-1,todayTaskCount:99,todayTaskCountLimit:10},refugees:[1,2,3,4,5,6],taskState:[{id:330017,state:-1,finishTime:-2},{id:999999,state:7,finishTime:7}]}
  };
  const snapshot=engagementSnapshotHazirla(state);
  assert.strictEqual(snapshot.firstPayReward.length,4);
  assert.strictEqual(snapshot.onlineDurationRewards.length,6);
  assert.strictEqual(snapshot.onlineDurationRecruitHero,"240041");
  assert.strictEqual(snapshot.helicopter.tasks.length,5);
  assert.strictEqual(snapshot.helicopter.refugeeLimit,4);
  assert.strictEqual(snapshot.helicopter.record.todayTaskCountLimit,10);
  assert.strictEqual(snapshot.onlineDurationRewards[0].duration,0);
  assert.strictEqual(snapshot.onlineDurationRewards.length,6);
  assert.strictEqual(snapshot.helicopter.refugees.length,4);
  assert.strictEqual(snapshot.helicopter.record.todayTaskCount,10);
  assert.strictEqual(snapshot.helicopter.tasks[0].runtime.state,0);
  assert.strictEqual(snapshot.helicopter.tasks.length,5);

  state.lastShelterEngagementRuntime.onlineDuration.rewards[0].duration=4;
  state.lastShelterEngagementRuntime.helicopter.taskState[0].finishTime=12345;
  const updated=engagementSnapshotHazirla(state);
  assert.strictEqual(updated.onlineDurationRewards[0].duration,4);
  assert.strictEqual(updated.helicopter.tasks[0].runtime.finishTime,12345);

  const task=helicopterTaskSnapshotAl(state,330017);
  assert.strictEqual(task.id,330017);
  assert.strictEqual(task.runtime.finishTime,12345);
  task.runtime.finishTime=999;
  assert.strictEqual(helicopterTaskSnapshotAl(state,330017).runtime.finishTime,12345);
  assert.strictEqual(helicopterTaskSnapshotAl(state,999999),null);

  const router=new FakeRouter();
  lastShelterEngagementCommandleriniQeydEt(router,{
    getOrCreatePlayerState:()=>state
  });
  assert.deepStrictEqual(router.routes.get("engagement.helicopter.task.get").options,{
    authRequired:true,
    mutation:false
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
  await router.routes.get("engagement.helicopter.task.get").handler({
    ws:{_authedPlayerId:"p1"},
    msg:{playerId:"p1",id:330017},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>775
  });
  assert.strictEqual(sent[0].type,"engagement.helicopter.task.get");
  assert.strictEqual(sent[0].task.id,330017);
  assert.strictEqual(sent[0].task.runtime.finishTime,12345);
  assert.strictEqual(sent[0].serverTimeUnixMs,775);

  sent.length=0;
  await router.routes.get("engagement.helicopter.task.get").handler({
    ws:{_authedPlayerId:"p1"},
    msg:{playerId:"p1",id:999999},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>775
  });
  assert.strictEqual(sent[0].code,"HELICOPTER_TASK_NOT_FOUND");

  sent.length=0;
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
