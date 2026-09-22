"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  activityReferenceAl,
  activityReferenceProjectionHazirla
} = require("./last_shelter_activity_reference");
const {
  shopRowAl,
  shopRowIdsAl,
  itemTupleRawlariniAl
} = require("./last_shelter_shop_reference");
const {
  LAST_SHELTER_REPAY_REFERENCE,
  repayEligibleRewardsAl,
  lastShelterRepayRuntimeTeminEt
} = require("./last_shelter_repay_reference");
const {
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE,
  allianceGroupPurchaseOfferAl
} = require("./last_shelter_alliance_group_purchase_reference");
const {
  lastShelterVipStoreStateHazirla,
  vipStorePanelInfoHazirla
} = require("./last_shelter_vip_store_runtime");

function clone(value) {
  return value == null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function authYoxla(ws,msg,send) {
  const authCheck = playerIdUyugunluqYoxla(msg,ws);
  if (authCheck.ok) return authCheck;
  send(ws,{
    type:"error",
    code:authCheck.message === "Player ID mismatch" ? "PLAYER_ID_MISMATCH" : "NOT_AUTHED",
    message:authCheck.message
  });
  return null;
}

function serverVaxtiAl(nowMs) {
  return typeof nowMs === "function" ? nowMs() : Date.now();
}

function repaySnapshotHazirla(state) {
  const raw =
    lastShelterRepayRuntimeTeminEt(
      state
    ) || {
      payPoint: 0,
      claimedPoints: []
    };

  const payPoint =
    Math.max(
      0,
      Math.trunc(
        Number(raw.payPoint) || 0
      )
    );

  const claimedPoints =
    Array.isArray(raw.claimedPoints)
      ? [...raw.claimedPoints]
      : [];

  const eligibleRewards =
    repayEligibleRewardsAl(
      payPoint
    );

  const claimed =
    new Set(
      claimedPoints
    );

  return {
    payPoint,
    claimedPoints,
    eligibleRewards,
    claimableRewards:
      eligibleRewards.filter(
        row =>
          !claimed.has(
            row.point
          )
      ),
    reference:
      clone(
        LAST_SHELTER_REPAY_REFERENCE
      )
  };
}

function allianceGroupPurchaseSnapshotHazirla(state) {
  const alliance = state && state.lastShelterAllianceRuntime && typeof state.lastShelterAllianceRuntime === "object"
    ? state.lastShelterAllianceRuntime : {};
  return {
    reference:clone(LAST_SHELTER_ALLIANCE_GROUP_PURCHASE),
    runtime:clone(alliance.groupPurchaseActivity || null),
    records:clone(Array.isArray(alliance.groupPurchaseRecords) ? alliance.groupPurchaseRecords : [])
  };
}

function vipStoreSnapshotHazirla(state,refreshTime) {
  const isolated = {
    lastShelterVipStore:state && state.lastShelterVipStore && typeof state.lastShelterVipStore === "object" &&
      !Array.isArray(state.lastShelterVipStore)
        ? clone(state.lastShelterVipStore) : lastShelterVipStoreStateHazirla()
  };
  if (refreshTime != null) {
    const n=Number(refreshTime);
    if (Number.isFinite(n) && n >= 0) isolated.lastShelterVipStore.refreshTime=Math.trunc(n);
  }
  return vipStorePanelInfoHazirla(isolated);
}

function lastShelterEconomyReferenceCommandleriniQeydEt(router,deps) {
  if (!router) throw new Error("Command router yoxdur.");
  const {getOrCreatePlayerState,getVipStoreRefreshTime} = deps || {};
  if (typeof getOrCreatePlayerState !== "function") throw new Error("getOrCreatePlayerState yoxdur.");

  router.register("activity.list",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck)return;
    send(ws,{type:"activity.list",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),rows:activityReferenceProjectionHazirla()});
  },{authRequired:true,mutation:false});

  router.register("activity.get",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck)return;
    const row=activityReferenceAl(msg&&msg.id);
    if(!row){send(ws,{type:"error",code:"ACTIVITY_NOT_FOUND",message:"Activity not found"});return;}
    send(ws,{type:"activity.get",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),row});
  },{authRequired:true,mutation:false});

  router.register("shop.list",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck)return;
    send(ws,{type:"shop.list",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),rows:shopRowIdsAl().map(id=>shopRowAl(id))});
  },{authRequired:true,mutation:false});

  router.register("shop.get",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck)return;
    const row=shopRowAl(msg&&msg.id);
    if(!row){send(ws,{type:"error",code:"SHOP_ROW_NOT_FOUND",message:"Shop row not found"});return;}
    send(ws,{type:"shop.get",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),row,itemTupleRaw:itemTupleRawlariniAl(row)});
  },{authRequired:true,mutation:false});

  router.register("repay.info",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck)return;
    const state=getOrCreatePlayerState(authCheck.playerId);
    send(ws,{type:"repay.info",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),repay:repaySnapshotHazirla(state)});
  },{authRequired:true,mutation:false});

  router.register("alliance.group_purchase.info",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck)return;
    const state=getOrCreatePlayerState(authCheck.playerId);
    send(ws,{type:"alliance.group_purchase.info",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),groupPurchase:allianceGroupPurchaseSnapshotHazirla(state)});
  },{authRequired:true,mutation:false});

  router.register("alliance.group_purchase.offer",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck)return;
    const offer=allianceGroupPurchaseOfferAl(msg&&msg.goodsId);
    if(!offer){send(ws,{type:"error",code:"ALLIANCE_GROUP_PURCHASE_OFFER_NOT_FOUND",message:"Alliance group purchase offer not found"});return;}
    send(ws,{type:"alliance.group_purchase.offer",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),offer});
  },{authRequired:true,mutation:false});

  router.register("vipstore.panel",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck)return;
    const state=getOrCreatePlayerState(authCheck.playerId);
    const now=serverVaxtiAl(nowMs);
    const refreshRaw=typeof getVipStoreRefreshTime === "function" ? getVipStoreRefreshTime(state,authCheck.playerId,now) : 0;
    const refreshTime=Number.isFinite(Number(refreshRaw)) ? Math.max(0,Math.trunc(Number(refreshRaw))) : 0;
    send(ws,{type:"vipstore.panel",playerId:authCheck.playerId,serverTimeUnixMs:now,panel:vipStoreSnapshotHazirla(state,refreshTime)});
  },{authRequired:true,mutation:false});

  return router;
}

module.exports={repaySnapshotHazirla,allianceGroupPurchaseSnapshotHazirla,vipStoreSnapshotHazirla,lastShelterEconomyReferenceCommandleriniQeydEt};
