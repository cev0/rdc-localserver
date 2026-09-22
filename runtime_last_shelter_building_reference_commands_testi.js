"use strict";

const assert=require("assert");
const {
  buildingRuntimeStableCatalogHazirla,
  lastShelterBuildingReferenceCommandleriniQeydEt
}=require("./runtime_last_shelter_building_reference_commands");

class FakeRouter {
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    const key=String(type).toLowerCase();
    if(this.routes.has(key)) throw new Error("duplicate route: "+key);
    this.routes.set(key,{handler,options});
    return this;
  }
}

(async()=>{
  const catalog=buildingRuntimeStableCatalogHazirla();
  assert.strictEqual(catalog.length,21);
  assert.ok(catalog.every(row=>row.observedSnapshots>=2));
  assert.strictEqual(catalog.find(row=>row.itemId==="400000"&&row.level===26).power,327113);

  const router=new FakeRouter();
  lastShelterBuildingReferenceCommandleriniQeydEt(router);
  assert.deepStrictEqual([...router.routes.keys()].sort(),[
    "building.reference.get","building.reference.list"
  ]);
  for(const route of router.routes.values()){
    assert.deepStrictEqual(route.options,{authRequired:true,mutation:false});
  }

  const sent=[];
  const ctx={
    ws:{_authedPlayerId:"p1"},
    send:(ws,payload)=>sent.push(payload),
    nowMs:()=>9001
  };
  await router.routes.get("building.reference.list").handler({
    ...ctx,msg:{playerId:"p1"}
  });
  assert.strictEqual(sent[0].type,"building.reference.list");
  assert.strictEqual(sent[0].total,21);
  assert.strictEqual(sent[0].serverTimeUnixMs,9001);

  sent.length=0;
  await router.routes.get("building.reference.get").handler({
    ...ctx,msg:{playerId:"p1",itemId:"413000",level:1}
  });
  assert.strictEqual(sent[0].building.food,140);
  assert.strictEqual(sent[0].building.time,150);

  sent.length=0;
  await router.routes.get("building.reference.get").handler({
    ...ctx,msg:{playerId:"p1",itemId:"999999",level:1}
  });
  assert.strictEqual(sent[0].code,"BUILDING_REFERENCE_NOT_FOUND");

  sent.length=0;
  await router.routes.get("building.reference.list").handler({
    ...ctx,msg:{playerId:"wrong"}
  });
  assert.strictEqual(sent[0].code,"PLAYER_ID_MISMATCH");

  console.log("PASS: verified Last Shelter cross-snapshot building runtime catalog is exposed read-only.");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
