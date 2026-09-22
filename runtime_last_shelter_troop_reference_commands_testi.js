"use strict";

const assert=require("assert");
const {
  lastShelterTroopReferenceCommandleriniQeydEt
}=require("./runtime_last_shelter_troop_reference_commands");

class FakeRouter{
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    this.routes.set(String(type).toLowerCase(),{handler,options});
    return this;
  }
}

(async()=>{
  const router=new FakeRouter();
  lastShelterTroopReferenceCommandleriniQeydEt(router);

  const expected=[
    "troop.catalog",
    "troop.get",
    "troop.transfer.level6",
    "troop.transfer.type",
    "troop.transfer.point"
  ];
  assert.deepStrictEqual([...router.routes.keys()],expected);

  for(const route of router.routes.values()){
    assert.deepStrictEqual(route.options,{authRequired:true,mutation:false});
  }

  const sent=[];
  const send=(ws,p)=>sent.push(p);
  const ws={_authedPlayerId:"p1"};
  const call=async(type,msg={})=>{
    sent.length=0;
    await router.routes.get(type).handler({
      ws,
      msg:{playerId:"p1",...msg},
      send,
      nowMs:()=>111
    });
    return sent[0];
  };

  let out=await call("troop.catalog");
  assert.strictEqual(out.units.length,30);
  const warriorT8=out.units.find(x=>x.unitId==="warrior_t8");
  assert.strictEqual(warriorT8.lastShelterArmyId,"107007");
  assert.strictEqual(warriorT8.baseTrainingSeconds,118);

  out=await call("troop.get",{unitId:"vehicle_t10"});
  assert.strictEqual(out.unit.lastShelterArmyId,"107109");
  assert.strictEqual(out.unit.stats.attack,90);

  out=await call("troop.transfer.level6");
  assert.strictEqual(out.progression.level,6);
  assert.strictEqual(out.progression.total,50);

  out=await call("troop.transfer.type",{transferType:2});
  assert.strictEqual(out.points.length,6);
  assert.strictEqual(out.skills["101004"],1);

  out=await call("troop.transfer.point",{transferType:1,pointId:"109034"});
  assert.strictEqual(out.point.pointType,"5");
  assert.strictEqual(out.point.effects["1561"],-5);

  sent.length=0;
  await router.routes.get("troop.get").handler({
    ws,
    msg:{playerId:"other",unitId:"warrior_t1"},
    send,
    nowMs:()=>1
  });
  assert.strictEqual(sent[0].code,"PLAYER_ID_MISMATCH");

  console.log("PASS: verified Last Shelter troop catalog and transfer progression are runtime-wired.");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
