"use strict";

const assert=require("assert");
const {
  queueSnapshotHazirla,
  scienceCatalogProjectionHazirla,
  scienceTopologyProjectionHazirla,
  scienceRuntimeProjectionHazirla,
  lastShelterQueueScienceCommandleriniQeydEt
}=require("./runtime_last_shelter_queue_science_commands");

class FakeRouter {
  constructor(){this.routes=new Map();}
  register(type,handler,options){this.routes.set(String(type).toLowerCase(),{handler,options});return this;}
}

(async()=>{
  const now=1000;
  const state={buildings:[{buildingId:"institute",level:1,isCompleted:true}],lastShelterStarterAccountRuntime:{queues:[
    {uuid:"science-1",qid:1,type:6,updateTime:0,endTime:0,itemObj:{}},
    {uuid:"science-2",qid:2,type:6,updateTime:0,endTime:5000,itemObj:{}}
  ]},science:{"901000":{level:1,completedAt:900}}};

  const queues=queueSnapshotHazirla(state,now);
  assert.strictEqual(queues.length,2);
  assert.strictEqual(queues[0].computedTypeName,"SCIENCE");
  assert.strictEqual(queues[0].computedState,"OUT_SYN");
  assert.strictEqual(queues[0].isFree,true);

  const catalog=scienceCatalogProjectionHazirla();
  assert.strictEqual(catalog.length,441);
  assert(catalog.some(x=>x.itemId === "901300"));

  const fullTopology=scienceTopologyProjectionHazirla();
  assert.strictEqual(fullTopology.length,441);
  assert.ok(fullTopology.some(x=>x.itemId==="901000"));

  const runtimeScience=scienceRuntimeProjectionHazirla(state);
  assert.deepStrictEqual(runtimeScience,{"901000":{level:1,completedAt:900}});
  runtimeScience["901000"].level=99;
  assert.strictEqual(state.science["901000"].level,1);
  assert.deepStrictEqual(scienceRuntimeProjectionHazirla({}),{});

  const router=new FakeRouter();
  lastShelterQueueScienceCommandleriniQeydEt(router,{getOrCreatePlayerState:()=>state});
  assert.deepStrictEqual(Array.from(router.routes.keys()),[
    "queue.list","science.catalog","science.topology.list","science.topology","science.state","science.prerequisite","science.plan","science.research","science.upgrade"
  ]);
  for(const [type,route] of router.routes){
    assert.deepStrictEqual(route.options,type === "science.research" || type === "science.upgrade"
      ? {authRequired:true,mutation:true,postgresAuthoritative:true}
      : {authRequired:true,mutation:false});
  }

  const ws={_authedPlayerId:"p1"};
  const sent=[];
  const send=(socket,payload)=>sent.push(payload);

  await router.routes.get("science.topology.list").handler({ws,msg:{playerId:"p1"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].type,"science.topology.list");
  assert.strictEqual(sent[0].total,441);
  assert.strictEqual(sent[0].science.length,441);

  sent.length=0;
  await router.routes.get("science.topology").handler({ws,msg:{playerId:"p1",itemId:"901000"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].type,"science.topology");
  assert.strictEqual(sent[0].topology.itemId,"901000");

  sent.length=0;
  await router.routes.get("science.state").handler({ws,msg:{playerId:"p1"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].type,"science.state");
  assert.deepStrictEqual(sent[0].science,{"901000":{level:1,completedAt:900}});
  sent[0].science["901000"].level=88;
  assert.strictEqual(state.science["901000"].level,1);

  sent.length=0;
  await router.routes.get("science.prerequisite").handler({ws,msg:{playerId:"p1",itemId:"901000"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].type,"science.prerequisite");
  assert.strictEqual(sent[0].status.ok,true);

  sent.length=0;
  await router.routes.get("science.plan").handler({ws,msg:{playerId:"p1",itemId:"901000"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].code,"SCIENCE_ALREADY_RESEARCHED");

  sent.length=0;
  await router.routes.get("science.plan").handler({ws,msg:{playerId:"p1",itemId:"901100"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].type,"science.plan");
  assert.strictEqual(sent[0].plan.itemId,"901100");
  assert.strictEqual(sent[0].plan.queue.uuid,"science-1");
  assert.strictEqual(sent[0].prerequisite.ok,true);

  sent.length=0;
  await router.routes.get("science.plan").handler({ws,msg:{playerId:"p1",itemId:"999999"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].code,"SCIENCE_ITEM_UNVERIFIED");

  console.log("PASS: verified Last Shelter queue/science read runtime exposes topology and detached authoritative completed-science state with the complete source catalog and authoritative mutation routes.");
})().catch(error=>{console.error(error);process.exitCode=1;});
