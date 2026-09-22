"use strict";

const assert=require("assert");
const {
  missionSnapshotHazirla,
  lastShelterMissionCommandleriniQeydEt
}=require("./runtime_last_shelter_mission_commands");

class FakeRouter{
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    this.routes.set(String(type).toLowerCase(),{handler,options});
    return this;
  }
}

(async()=>{
  const state={};
  const snapshot=missionSnapshotHazirla(state);
  assert.strictEqual(snapshot.tasks.length,205);
  assert.strictEqual(snapshot.chapterTask.subTasks.length,5);
  assert.strictEqual(snapshot.config.new_mission_switch,1);
  assert.strictEqual(snapshot.taskPoint,0);

  const firstId=snapshot.tasks[0].id;
  const runtimeRow=state.lastShelterMissionRuntime.tasks.find(x=>x.id===firstId);
  runtimeRow.num=7;
  runtimeRow.state=1;
  state.lastShelterMissionRuntime.taskPoint=33;
  state.lastShelterMissionRuntime.chapterTask.subTasks[0].num=9;

  const updated=missionSnapshotHazirla(state);
  assert.strictEqual(updated.taskPoint,33);
  assert.strictEqual(updated.tasks.find(x=>x.id===firstId).num,7);
  assert.strictEqual(updated.tasks.find(x=>x.id===firstId).state,1);
  assert.strictEqual(updated.chapterTask.subTasks[0].num,9);

  updated.tasks[0].num=999;
  assert.notStrictEqual(runtimeRow.num,999,"projection must not leak mutable references");

  const router=new FakeRouter();
  lastShelterMissionCommandleriniQeydEt(router,{getOrCreatePlayerState:()=>state});
  assert.deepStrictEqual(router.routes.get("mission.info").options,{
    authRequired:true,
    mutation:false
  });

  const sent=[];
  await router.routes.get("mission.info").handler({
    ws:{_authedPlayerId:"p1"},
    msg:{playerId:"p1"},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>1234
  });
  assert.strictEqual(sent[0].type,"mission.info");
  assert.strictEqual(sent[0].serverTimeUnixMs,1234);
  assert.strictEqual(sent[0].mission.taskPoint,33);
  assert.strictEqual(sent[0].mission.tasks.length,205);

  sent.length=0;
  await router.routes.get("mission.info").handler({
    ws:{_authedPlayerId:"p1"},
    msg:{playerId:"wrong"},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>1235
  });
  assert.strictEqual(sent[0].code,"PLAYER_ID_MISMATCH");

  console.log("PASS: verified Last Shelter mission/task runtime is exposed through authenticated read command.");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
