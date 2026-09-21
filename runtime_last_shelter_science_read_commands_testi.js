"use strict";

const assert=require("assert");
const {
  lastShelterScienceReadCommandleriniQeydEt
}=require("./runtime_last_shelter_science_read_commands");

class FakeRouter{
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    this.routes.set(String(type).toLowerCase(),{handler,options});
    return this;
  }
}

(async()=>{
  const state={
    science:{},
    queues:[
      {uuid:"science-1",qid:1,type:"SCIENCE",status:"free"}
    ]
  };
  const router=new FakeRouter();
  lastShelterScienceReadCommandleriniQeydEt(
    router,
    {getOrCreatePlayerState:()=>state}
  );

  assert.deepStrictEqual(
    [...router.routes.keys()].sort(),
    ["science.catalog","science.plan","science.prerequisite","science.topology"].sort()
  );

  const sent=[];
  const send=(ws,p)=>sent.push(p);
  const ws={_authedPlayerId:"p1"};
  const call=async(type,msg={})=>{
    sent.length=0;
    await router.routes.get(type).handler({
      ws,
      msg:{playerId:"p1",...msg},
      send,
      nowMs:()=>1000
    });
    return sent[0];
  };

  let out=await call("science.catalog");
  assert.strictEqual(out.rows.length,4);
  assert.strictEqual(out.rows[0].itemId,"901000");

  out=await call("science.topology",{itemId:"901000"});
  assert.strictEqual(out.topology.itemId,"901000");

  out=await call("science.prerequisite",{itemId:"901000"});
  assert.strictEqual(out.status.itemId,"901000");
  assert.strictEqual(out.status.ok,true);

  out=await call("science.plan",{itemId:"901000",quuid:"science-1",gold:7});
  assert.strictEqual(out.ok,true);
  assert.strictEqual(out.plan.itemId,"901000");
  assert.strictEqual(out.plan.queue.uuid,"science-1");
  assert.strictEqual(out.plan.optionalGold,7);
  assert.strictEqual(out.plan.queue.finishUnixMs,91000);

  sent.length=0;
  await router.routes.get("science.plan").handler({
    ws,
    msg:{playerId:"other",itemId:"901000"},
    send,
    nowMs:()=>1000
  });
  assert.strictEqual(sent[0].code,"PLAYER_ID_MISMATCH");

  console.log("PASS: verified Last Shelter science catalog/topology/prerequisite/plan reads are runtime-wired.");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
