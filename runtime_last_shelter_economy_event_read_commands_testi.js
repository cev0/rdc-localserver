"use strict";

const assert=require("assert");
const {
  lastShelterEconomyEventReadCommandleriniQeydEt
}=require("./runtime_last_shelter_economy_event_read_commands");

class FakeRouter {
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    this.routes.set(String(type).toLowerCase(),{handler,options});
    return this;
  }
}

(async()=>{
  const state={};
  const router=new FakeRouter();
  lastShelterEconomyEventReadCommandleriniQeydEt(
    router,
    {getOrCreatePlayerState:()=>state}
  );

  const expected=[
    "activity.list",
    "activity.get",
    "shop.list",
    "shop.get",
    "repay.info",
    "vipstore.reference",
    "alliance.grouppurchase.info"
  ];
  assert.deepStrictEqual([...router.routes.keys()].sort(),expected.sort());
  for(const route of router.routes.values()){
    assert.deepStrictEqual(route.options,{authRequired:true,mutation:false});
  }

  const sent=[];
  const send=(ws,payload)=>sent.push(payload);
  const ws={_authedPlayerId:"p1"};
  const call=async(type,msg={})=>{
    sent.length=0;
    await router.routes.get(type).handler({
      ws,
      msg:{playerId:"p1",...msg},
      send,
      nowMs:()=>123456
    });
    return sent[0];
  };

  let out=await call("activity.list");
  assert.strictEqual(out.activities.length,12);
  out=await call("activity.get",{id:"57032"});
  assert.strictEqual(out.activity.id,"57032");

  out=await call("shop.list");
  assert.strictEqual(out.rows.length,8);
  out=await call("shop.get",{id:"200000001"});
  assert.strictEqual(out.row.id,"200000001");
  assert.strictEqual(out.itemTupleRaw.length,8);

  state.lastShelterAuxiliaryRuntime={repayinfo:{payPoint:2000,claimedPoints:[400]}};
  out=await call("repay.info");
  assert.strictEqual(out.payPoint,2000);
  assert.strictEqual(out.eligibleRewards.length,2);
  assert.deepStrictEqual(out.claimedPoints,[400]);

  out=await call("vipstore.reference");
  assert.strictEqual(out.protocol.requestHandler,"VipStoreMessageHandler");
  assert.strictEqual(out.goods.length,10);
  assert.strictEqual(out.stateArray.length,54);
  assert.strictEqual(out.runtime.level,1);

  out=await call("alliance.grouppurchase.info",{goodsId:"207055"});
  assert.strictEqual(out.activity.activityId,"57032");
  assert.strictEqual(out.offer.goodsId,"207055");
  assert.strictEqual(out.offer.key,"k3");
  assert.strictEqual(out.runtime.progress,0);

  sent.length=0;
  await router.routes.get("activity.get").handler({
    ws,
    msg:{playerId:"p2",id:"57032"},
    send,
    nowMs:()=>1
  });
  assert.strictEqual(sent[0].code,"PLAYER_ID_MISMATCH");

  console.log("PASS: Last Shelter activity/shop/repay/VIP/group-purchase verified read surfaces are wired to runtime.");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
