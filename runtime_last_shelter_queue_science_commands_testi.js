"use strict";

const assert=require("assert");
const {
  queueSnapshotHazirla,
  scienceCatalogProjectionHazirla,
  scienceTopologyProjectionHazirla,
  lastShelterQueueScienceCommandleriniQeydEt
}=require("./runtime_last_shelter_queue_science_commands");

class FakeRouter {
  constructor(){this.routes=new Map();}
  register(type,handler,options){this.routes.set(String(type).toLowerCase(),{handler,options});return this;}
}

(async()=>{
  const now=1000;
  const state={lastShelterStarterAccountRuntime:{queues:[
    {uuid:"science-1",qid:1,type:6,updateTime:0,endTime:0,itemObj:{}},
    {uuid:"science-2",qid:2,type:6,updateTime:0,endTime:5000,itemObj:{}}
  ]},science:{}};

  const queues=queueSnapshotHazirla(state,now);
  assert.strictEqual(queues.length,2);
  assert.strictEqual(queues[0].computedTypeName,"SCIENCE");
  assert.strictEqual(queues[0].computedState,"OUT_SYN");
  assert.strictEqual(queues[0].isFree,true);

  const catalog=scienceCatalogProjectionHazirla();
  assert.deepStrictEqual(catalog.map(x=>x.itemId),["901000","901100","901200","901300"]);

  const fullTopology=scienceTopologyProjectionHazirla();
  assert.strictEqual(fullTopology.length,441);
  assert.ok(fullTopology.some(x=>x.itemId==="901000"));

  const router=new FakeRouter();
  lastShelterQueueScienceCommandleriniQeydEt(router,{getOrCreatePlayerState:()=>state});
  assert.deepStrictEqual(Array.from(router.routes.keys()),[
    "queue.list","science.catalog","science.topology.list","science.topology","science.prerequisite","science.plan"
  ]);
  for(const route of router.routes.values()){
    assert.deepStrictEqual(route.options,{authRequired:true,mutation:false});
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
  await router.routes.get("science.prerequisite").handler({ws,msg:{playerId:"p1",itemId:"901000"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].type,"science.prerequisite");
  assert.strictEqual(sent[0].status.ok,true);

  sent.length=0;
  await router.routes.get("science.plan").handler({ws,msg:{playerId:"p1",itemId:"901000"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].type,"science.plan");
  assert.strictEqual(sent[0].plan.itemId,"901000");
  assert.strictEqual(sent[0].plan.queue.uuid,"science-1");
  assert.strictEqual(sent[0].plan.queue.finishUnixMs,91000);
  assert.strictEqual(sent[0].prerequisite.ok,true);

  sent.length=0;
  await router.routes.get("science.plan").handler({ws,msg:{playerId:"p1",itemId:"999999"},send,nowMs:()=>1000});
  assert.strictEqual(sent[0].code,"SCIENCE_TOPOLOGY_UNVERIFIED");

  console.log("PASS: verified Last Shelter queue/science read runtime exposes all 441 observed topology nodes without inventing unverified resource-code debit semantics.");
})().catch(error=>{console.error(error);process.exitCode=1;});
