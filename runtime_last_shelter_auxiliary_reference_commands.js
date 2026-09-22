"use strict";

const {playerIdUyugunluqYoxla}=require("./runtime_core_read_commands");
const {
  SEVEN_DAYS_DURATION_MS,
  LAST_SHELTER_SEVEN_DAYS_REWARD,
  LAST_SHELTER_SEVEN_DAYS_TASK_INFO,
  sevenDaysPageMapHazirla,
  sevenDaysTopologyYoxla,
  lastShelterSevenDaysRuntimeTeminEt
}=require("./last_shelter_seven_days_reference");
const {
  LAST_SHELTER_STARTER_TRUCK,
  lastShelterTruckRuntimeTeminEt,
  initTruckProjectionHazirla
}=require("./last_shelter_truck_convoy_reference");
const {
  LAST_SHELTER_WORLD_CONFIG,
  LAST_SHELTER_BATTLEFIELD_MAPS,
  battlefieldMapAl,
  battlefieldQadagalariniAl,
  lastShelterWorldRuntimeTeminEt
}=require("./last_shelter_world_battlefield_reference");
const {activityReferenceProjectionHazirla,activityReferenceAl}=require("./last_shelter_activity_reference");
const {lastShelterMissileRuntimeTeminEt}=require("./last_shelter_missile_runtime");
const {shopRowIdsAl,shopRowAl,itemTupleRawlariniAl}=require("./last_shelter_shop_reference");
const {vipStorePanelInfoHazirla}=require("./last_shelter_vip_store_runtime");
const {LAST_SHELTER_REPAY_REFERENCE,repayEligibleRewardsAl,lastShelterRepayRuntimeTeminEt}=require("./last_shelter_repay_reference");
const {LAST_SHELTER_ALLIANCE_GROUP_PURCHASE,allianceGroupPurchaseOfferAl,allianceGroupPurchaseRuntimeDefaultHazirla}=require("./last_shelter_alliance_group_purchase_reference");
const {LAST_SHELTER_FORT_TROOPS,fortTroopRuntimeProjectionAl,fortInitProjectionHazirla}=require("./last_shelter_fort_troop_reference");
const {LAST_SHELTER_TROOP_TRANSFER_TREES,troopTransferTreeAl,troopTransferPointAl}=require("./last_shelter_troop_transfer_reference");
const {goodsStructureIdsAl,goodsStructureAl,salesRawEntriesAl}=require("./last_shelter_goods_structure_reference");
const {getVerifiedStoreReward,getVerifiedStoreRewardIds}=require("./last_shelter_store_resource_rewards");
const {LAST_SHELTER_RESOURCE_PAYLOAD_FIELDS,lastShelterResourcePayloadHazirla}=require("./last_shelter_resource_runtime");
const {ITEM_TUNING,itemTuningAl}=require("./last_shelter_item_tuning_kataloqu");
const {LAST_SHELTER_STARTER_ITEM_TEMPLATES,LAST_SHELTER_STARTER_QUEUE_LAYOUT,lastShelterStarterAccountRuntimeTeminEt,starterQueueInitProjectionHazirla}=require("./last_shelter_starter_account_reference");
const {TROOP_107X,LAST_SHELTER_SPECIAL_ARMS_CONFIG,troop107xAl,specialArmConfigAl}=require("./last_shelter_troop_107x_reference");
const {CURRENT_UNLOCK_NUM_RAW,NEXT_UNLOCK_NUM_RAW,LAST_SHELTER_STARTER_BUILDINGS,LAST_SHELTER_BUILD_LIST_CONFIG,unlockNumParseEt,lastShelterCityRuntimeTeminEt}=require("./last_shelter_starter_city_reference");
const {TROOP_1073X_STABLE,troop1073xRuntimeProjectionAl,troop1073xObservedSpeedsAl}=require("./last_shelter_troop_1073x_reference");
const {LAST_SHELTER_FRESH_INIT_ENVELOPE,freshInitEnvelopeRuntimeDefaultHazirla,freshInitEnvelopeRuntimeTeminEt}=require("./last_shelter_fresh_init_envelope_reference");

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function auth(ws,msg,send){
  const r=playerIdUyugunluqYoxla(msg,ws);
  if(r.ok)return r;
  send(ws,{type:"error",code:r.message==="Player ID mismatch"?"PLAYER_ID_MISMATCH":"NOT_AUTHED",message:r.message});
  return null;
}
function now(nowMs){return typeof nowMs==="function"?nowMs():Date.now();}

function lastShelterAuxiliaryCommandleriniQeydEt(router,deps){
  if(!router)throw new Error("Command router yoxdur.");
  const {getOrCreatePlayerState}=deps||{};
  if(typeof getOrCreatePlayerState!=="function")throw new Error("getOrCreatePlayerState yoxdur.");

  router.register("fresh_init.envelope.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const state=getOrCreatePlayerState(a.playerId);
    if(!state.lastShelterFreshInitEnvelopeRuntime||typeof state.lastShelterFreshInitEnvelopeRuntime!=="object"||Array.isArray(state.lastShelterFreshInitEnvelopeRuntime)) state.lastShelterFreshInitEnvelopeRuntime=freshInitEnvelopeRuntimeDefaultHazirla();
    freshInitEnvelopeRuntimeTeminEt(state.lastShelterFreshInitEnvelopeRuntime);
    send(ws,{type:"fresh_init.envelope.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),reference:clone(LAST_SHELTER_FRESH_INIT_ENVELOPE),runtime:clone(state.lastShelterFreshInitEnvelopeRuntime)});
  },{authRequired:true,mutation:false});

  router.register("starter_city.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const state=getOrCreatePlayerState(a.playerId); const city=lastShelterCityRuntimeTeminEt(state);
    send(ws,{type:"starter_city.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),buildings:clone(city.buildings),buildListConfig:clone(city.buildListConfig),reference:{starterBuildings:clone(LAST_SHELTER_STARTER_BUILDINGS),buildListConfig:clone(LAST_SHELTER_BUILD_LIST_CONFIG),unlock:{currentRaw:CURRENT_UNLOCK_NUM_RAW,nextRaw:NEXT_UNLOCK_NUM_RAW,current:unlockNumParseEt(CURRENT_UNLOCK_NUM_RAW),next:unlockNumParseEt(NEXT_UNLOCK_NUM_RAW)}}});
  },{authRequired:true,mutation:false});

  router.register("troop.reference.list",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; send(ws,{type:"troop.reference.list",playerId:a.playerId,serverTimeUnixMs:now(nowMs),troops107x:clone(TROOP_107X),troops1073x:clone(TROOP_1073X_STABLE),specialArms:clone(LAST_SHELTER_SPECIAL_ARMS_CONFIG)});
  },{authRequired:true,mutation:false});

  router.register("troop.reference.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const id=msg&&msg.id!=null?String(msg.id).trim():""; const raw=troop107xAl(id); const fourth=troop1073xRuntimeProjectionAl(id);
    if(!raw&&!fourth){send(ws,{type:"error",code:"TROOP_REFERENCE_NOT_FOUND",message:"Last Shelter troop reference tapilmadi.",id});return;}
    send(ws,{type:"troop.reference.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),id,troop:clone(raw||fourth),specialArm:specialArmConfigAl(id),observedSpeeds:fourth?troop1073xObservedSpeedsAl(id):[]});
  },{authRequired:true,mutation:false});

  router.register("resource.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const t=now(nowMs); const state=getOrCreatePlayerState(a.playerId);
    send(ws,{type:"resource.info",playerId:a.playerId,serverTimeUnixMs:t,fields:clone(LAST_SHELTER_RESOURCE_PAYLOAD_FIELDS),resources:lastShelterResourcePayloadHazirla(state,t)});
  },{authRequired:true,mutation:false});

  router.register("item.tuning.list",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; send(ws,{type:"item.tuning.list",playerId:a.playerId,serverTimeUnixMs:now(nowMs),tuning:clone(ITEM_TUNING)});
  },{authRequired:true,mutation:false});

  router.register("item.tuning.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const id=msg&&msg.id!=null?String(msg.id).trim():""; const tuning=itemTuningAl(id);
    if(!tuning){send(ws,{type:"error",code:"ITEM_TUNING_NOT_FOUND",message:"Last Shelter item tuning tapilmadi.",id});return;}
    send(ws,{type:"item.tuning.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),id,tuning:clone(tuning)});
  },{authRequired:true,mutation:false});

  router.register("starter_account.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const state=getOrCreatePlayerState(a.playerId); const runtime=lastShelterStarterAccountRuntimeTeminEt(state);
    send(ws,{type:"starter_account.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),itemTemplates:clone(LAST_SHELTER_STARTER_ITEM_TEMPLATES),queueLayout:clone(LAST_SHELTER_STARTER_QUEUE_LAYOUT),items:clone(runtime.items),queues:starterQueueInitProjectionHazirla(runtime.queues),finishedQueue:clone(runtime.finishedQueue)});
  },{authRequired:true,mutation:false});

  router.register("goods.structure.list",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const goods=goodsStructureIdsAl().map(id=>{const row=goodsStructureAl(id);return {...row,sales:salesRawEntriesAl(id)};});
    send(ws,{type:"goods.structure.list",playerId:a.playerId,serverTimeUnixMs:now(nowMs),goods});
  },{authRequired:true,mutation:false});

  router.register("goods.structure.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const id=msg&&msg.itemId!=null?String(msg.itemId).trim():""; const good=goodsStructureAl(id);
    if(!good){send(ws,{type:"error",code:"GOODS_STRUCTURE_NOT_FOUND",message:"Last Shelter goods structure tapilmadi.",itemId:id});return;}
    send(ws,{type:"goods.structure.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),good:{...good,sales:salesRawEntriesAl(id)}});
  },{authRequired:true,mutation:false});

  router.register("store.reward.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const id=msg&&msg.storeId!=null?String(msg.storeId).trim():""; const reward=getVerifiedStoreReward(id);
    if(!reward){send(ws,{type:"error",code:"STORE_REWARD_NOT_FOUND",message:"Last Shelter store reward tapilmadi.",storeId:id});return;}
    send(ws,{type:"store.reward.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),storeId:id,reward});
  },{authRequired:true,mutation:false});

  router.register("store.reward.catalog",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const ids=getVerifiedStoreRewardIds();
    send(ws,{type:"store.reward.catalog",playerId:a.playerId,serverTimeUnixMs:now(nowMs),count:ids.length,storeIds:ids});
  },{authRequired:true,mutation:false});

  router.register("alliance.group_purchase.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const state=getOrCreatePlayerState(a.playerId);
    if(!state.lastShelterAllianceGroupPurchaseRuntime) state.lastShelterAllianceGroupPurchaseRuntime=allianceGroupPurchaseRuntimeDefaultHazirla();
    send(ws,{type:"alliance.group_purchase.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),reference:clone(LAST_SHELTER_ALLIANCE_GROUP_PURCHASE),runtime:clone(state.lastShelterAllianceGroupPurchaseRuntime)});
  },{authRequired:true,mutation:false});

  router.register("alliance.group_purchase.offer.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const goodsId=msg&&msg.goodsId!=null?String(msg.goodsId).trim():""; const offer=allianceGroupPurchaseOfferAl(goodsId);
    if(!offer){send(ws,{type:"error",code:"ALLIANCE_GROUP_PURCHASE_OFFER_NOT_FOUND",message:"Last Shelter alliance group purchase offer tapilmadi.",goodsId});return;}
    send(ws,{type:"alliance.group_purchase.offer.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),offer});
  },{authRequired:true,mutation:false});

  router.register("fort.troop.list",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const state=getOrCreatePlayerState(a.playerId);
    send(ws,{type:"fort.troop.list",playerId:a.playerId,serverTimeUnixMs:now(nowMs),troops:clone(fortInitProjectionHazirla(state))});
  },{authRequired:true,mutation:false});

  router.register("fort.troop.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const troop=fortTroopRuntimeProjectionAl(msg&&msg.id);
    if(!troop){send(ws,{type:"error",code:"FORT_TROOP_NOT_FOUND",message:"Last Shelter fort troop tapilmadi.",id:msg&&msg.id});return;}
    send(ws,{type:"fort.troop.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),troop});
  },{authRequired:true,mutation:false});

  router.register("troop_transfer.reference.list",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; send(ws,{type:"troop_transfer.reference.list",playerId:a.playerId,serverTimeUnixMs:now(nowMs),trees:clone(LAST_SHELTER_TROOP_TRANSFER_TREES)});
  },{authRequired:true,mutation:false});

  router.register("troop_transfer.reference.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const tree=troopTransferTreeAl(msg&&msg.transferType);
    if(!tree){send(ws,{type:"error",code:"TROOP_TRANSFER_TREE_NOT_FOUND",message:"Last Shelter troop transfer tree tapilmadi.",transferType:msg&&msg.transferType});return;}
    const point=msg&&msg.pointType!=null?troopTransferPointAl(tree.type,msg.pointType):null;
    send(ws,{type:"troop_transfer.reference.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),tree,point});
  },{authRequired:true,mutation:false});

  router.register("shop.reference.list",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return;
    const rows=shopRowIdsAl().map(id=>{const row=shopRowAl(id);return {...row,itemTuplesRaw:itemTupleRawlariniAl(row)};});
    send(ws,{type:"shop.reference.list",playerId:a.playerId,serverTimeUnixMs:now(nowMs),shops:rows});
  },{authRequired:true,mutation:false});

  router.register("vip_store.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const state=getOrCreatePlayerState(a.playerId);
    send(ws,{type:"vip_store.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),panel:clone(vipStorePanelInfoHazirla(state,msg&&msg.refreshTime))});
  },{authRequired:true,mutation:false});

  router.register("repay.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const state=getOrCreatePlayerState(a.playerId); const runtime=lastShelterRepayRuntimeTeminEt(state);
    const eligible=repayEligibleRewardsAl(runtime.payPoint); const claimed=new Set(runtime.claimedPoints);
    send(ws,{type:"repay.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),observedWindow:clone(LAST_SHELTER_REPAY_REFERENCE.observedWindow),payPoint:runtime.payPoint,eligibleRewards:eligible,claimableRewards:eligible.filter(x=>!claimed.has(x.point)),claimedPoints:clone(runtime.claimedPoints)});
  },{authRequired:true,mutation:false});

  router.register("activity.reference.list",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return;
    send(ws,{type:"activity.reference.list",playerId:a.playerId,serverTimeUnixMs:now(nowMs),activities:activityReferenceProjectionHazirla()});
  },{authRequired:true,mutation:false});

  router.register("activity.reference.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return;
    const id=msg&&msg.id!=null?String(msg.id).trim():""; const activity=activityReferenceAl(id);
    if(!activity){send(ws,{type:"error",code:"ACTIVITY_NOT_FOUND",message:"Last Shelter activity tapilmadi.",id});return;}
    send(ws,{type:"activity.reference.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),activity});
  },{authRequired:true,mutation:false});

  router.register("missile.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return; const state=getOrCreatePlayerState(a.playerId);
    send(ws,{type:"missile.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),missiles:clone(lastShelterMissileRuntimeTeminEt(state).missiles)});
  },{authRequired:true,mutation:false});

  router.register("seven_days.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return;
    const state=getOrCreatePlayerState(a.playerId);
    send(ws,{type:"seven_days.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),activity:clone(lastShelterSevenDaysRuntimeTeminEt(state,now(nowMs))),durationMs:SEVEN_DAYS_DURATION_MS,reward:clone(LAST_SHELTER_SEVEN_DAYS_REWARD),taskInfo:clone(LAST_SHELTER_SEVEN_DAYS_TASK_INFO),pages:sevenDaysPageMapHazirla(),topology:sevenDaysTopologyYoxla()});
  },{authRequired:true,mutation:false});

  router.register("truck.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return;
    const state=getOrCreatePlayerState(a.playerId);
    lastShelterTruckRuntimeTeminEt(state);
    send(ws,{type:"truck.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),template:clone(LAST_SHELTER_STARTER_TRUCK),trucks:clone(initTruckProjectionHazirla(state))});
  },{authRequired:true,mutation:false});

  router.register("world.info",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return;
    const state=getOrCreatePlayerState(a.playerId);
    send(ws,{type:"world.info",playerId:a.playerId,serverTimeUnixMs:now(nowMs),config:clone(LAST_SHELTER_WORLD_CONFIG),battlefieldMaps:clone(LAST_SHELTER_BATTLEFIELD_MAPS),world:clone(lastShelterWorldRuntimeTeminEt(state))});
  },{authRequired:true,mutation:false});

  router.register("battlefield.get",async({ws,msg,send,nowMs})=>{
    const a=auth(ws,msg,send); if(!a)return;
    const id=msg&&msg.id!=null?String(msg.id).trim():"";
    const map=battlefieldMapAl(id);
    if(!map){send(ws,{type:"error",code:"BATTLEFIELD_NOT_FOUND",message:"Last Shelter battlefield tapilmadi.",id});return;}
    send(ws,{type:"battlefield.get",playerId:a.playerId,serverTimeUnixMs:now(nowMs),map,restrictions:battlefieldQadagalariniAl(id)});
  },{authRequired:true,mutation:false});
  return router;
}

module.exports={lastShelterAuxiliaryCommandleriniQeydEt};
