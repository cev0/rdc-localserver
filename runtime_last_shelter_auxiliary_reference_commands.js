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
