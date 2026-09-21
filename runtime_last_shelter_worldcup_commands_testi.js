"use strict";

const assert=require("assert");
const {
  lastShelterWorldCupCommandleriniQeydEt
}=require("./runtime_last_shelter_worldcup_commands");

class FakeRouter {
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    this.routes.set(String(type).toLowerCase(),{handler,options});
    return this;
  }
}

(async()=>{
  const router=new FakeRouter();
  lastShelterWorldCupCommandleriniQeydEt(router);

  assert.strictEqual(router.routes.has("worldcup.list"),true);
  assert.strictEqual(router.routes.has("worldcup.get"),true);
  assert.deepStrictEqual(
    router.routes.get("worldcup.list").options,
    {authRequired:true,mutation:false}
  );
  assert.deepStrictEqual(
    router.routes.get("worldcup.get").options,
    {authRequired:true,mutation:false}
  );

  const sent=[];
  const send=(ws,payload)=>sent.push(payload);
  const ws={_authedPlayerId:"p1"};

  await router.routes.get("worldcup.get").handler({
    ws,
    msg:{playerId:"p1",id:"64"},
    send,
    nowMs:()=>123
  });

  assert.strictEqual(sent.length,1);
  assert.strictEqual(sent[0].type,"worldcup.get");
  assert.strictEqual(sent[0].playerId,"p1");
  assert.strictEqual(sent[0].serverTimeUnixMs,123);
  assert.strictEqual(sent[0].row.id,"64");
  assert.deepStrictEqual(sent[0].options,["27","28"]);
  assert.deepStrictEqual(
    sent[0].goodsMax,
    [
      {resourceId:"gold",amount:60000},
      {resourceId:"200956",amount:15000},
      {resourceId:"200043",amount:15000},
      {resourceId:"200046",amount:120000}
    ]
  );

  sent.length=0;
  await router.routes.get("worldcup.list").handler({
    ws,
    msg:{playerId:"p1",nameType:"99012204"},
    send,
    nowMs:()=>456
  });
  assert.strictEqual(sent[0].type,"worldcup.list");
  assert.strictEqual(sent[0].rows.length,1);
  assert.strictEqual(sent[0].rows[0].id,"64");

  sent.length=0;
  await router.routes.get("worldcup.list").handler({
    ws,
    msg:{playerId:"p1"},
    send,
    nowMs:()=>789
  });
  assert.strictEqual(sent[0].rows.length,100);

  sent.length=0;
  await router.routes.get("worldcup.get").handler({
    ws,
    msg:{playerId:"p1",id:"999"},
    send,
    nowMs:()=>999
  });
  assert.strictEqual(sent[0].type,"error");
  assert.strictEqual(sent[0].code,"WORLD_CUP_ROW_NOT_FOUND");

  sent.length=0;
  await router.routes.get("worldcup.get").handler({
    ws,
    msg:{playerId:"p2",id:"1"},
    send,
    nowMs:()=>999
  });
  assert.strictEqual(sent[0].type,"error");
  assert.strictEqual(sent[0].code,"PLAYER_ID_MISMATCH");

  console.log("PASS: Last Shelter World Cup reference is exposed through authenticated runtime read commands.");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
