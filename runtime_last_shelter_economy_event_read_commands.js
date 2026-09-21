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
  VIP_STORE_PROTOCOL,
  VIP_STORE_GOODS,
  VIP_STORE_STATE_EFFECT_IDS
} = require("./last_shelter_vip_store_reference");
const {
  lastShelterVipStoreStateTeminEt
} = require("./last_shelter_vip_store_runtime");
const {
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE,
  allianceGroupPurchaseOfferAl,
  allianceGroupPurchaseOffersByKeyAl
} = require("./last_shelter_alliance_group_purchase_reference");
const {
  lastShelterAllianceRuntimeTeminEt
} = require("./last_shelter_alliance_runtime_contract");

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function authYoxla(ws,msg,send) {
  const result=playerIdUyugunluqYoxla(msg,ws);
  if (result.ok) return result;
  send(ws,{
    type:"error",
    code:
      result.message==="Player ID mismatch"
        ? "PLAYER_ID_MISMATCH"
        : "NOT_AUTHED",
    message:result.message
  });
  return null;
}

function lastShelterEconomyEventReadCommandleriniQeydEt(router,deps) {
  if (!router) throw new Error("Command router yoxdur.");
  const {getOrCreatePlayerState}=deps||{};
  if (typeof getOrCreatePlayerState!=="function") {
    throw new Error("getOrCreatePlayerState yoxdur.");
  }

  router.register(
    "activity.list",
    async ({ws,msg,send,nowMs}) => {
      const auth=authYoxla(ws,msg,send);
      if (!auth) return;
      send(ws,{
        type:"activity.list",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function" ? nowMs() : Date.now(),
        activities:activityReferenceProjectionHazirla()
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "activity.get",
    async ({ws,msg,send,nowMs}) => {
      const auth=authYoxla(ws,msg,send);
      if (!auth) return;
      const activity=activityReferenceAl(msg&&msg.id);
      if (!activity) {
        send(ws,{type:"error",code:"ACTIVITY_NOT_FOUND",message:"Activity not found"});
        return;
      }
      send(ws,{
        type:"activity.get",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function" ? nowMs() : Date.now(),
        activity
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "shop.list",
    async ({ws,msg,send,nowMs}) => {
      const auth=authYoxla(ws,msg,send);
      if (!auth) return;
      const rows=shopRowIdsAl().map(id=>{
        const row=shopRowAl(id);
        return {
          ...row,
          itemTupleRaw:itemTupleRawlariniAl(row)
        };
      });
      send(ws,{
        type:"shop.list",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function" ? nowMs() : Date.now(),
        rows
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "shop.get",
    async ({ws,msg,send,nowMs}) => {
      const auth=authYoxla(ws,msg,send);
      if (!auth) return;
      const row=shopRowAl(msg&&msg.id);
      if (!row) {
        send(ws,{type:"error",code:"SHOP_ROW_NOT_FOUND",message:"Shop row not found"});
        return;
      }
      send(ws,{
        type:"shop.get",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function" ? nowMs() : Date.now(),
        row,
        itemTupleRaw:itemTupleRawlariniAl(row)
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "repay.info",
    async ({ws,msg,send,nowMs}) => {
      const auth=authYoxla(ws,msg,send);
      if (!auth) return;
      const state=getOrCreatePlayerState(auth.playerId);
      const runtime=lastShelterRepayRuntimeTeminEt(state);
      send(ws,{
        type:"repay.info",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function" ? nowMs() : Date.now(),
        observedWindow:clone(LAST_SHELTER_REPAY_REFERENCE.observedWindow),
        payRewards:clone(LAST_SHELTER_REPAY_REFERENCE.payRewards),
        payPoint:runtime.payPoint,
        claimedPoints:[...runtime.claimedPoints],
        eligibleRewards:repayEligibleRewardsAl(runtime.payPoint)
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "vipstore.reference",
    async ({ws,msg,send,nowMs}) => {
      const auth=authYoxla(ws,msg,send);
      if (!auth) return;
      const state=getOrCreatePlayerState(auth.playerId);
      const runtime=lastShelterVipStoreStateTeminEt(state);
      send(ws,{
        type:"vipstore.reference",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function" ? nowMs() : Date.now(),
        protocol:{...VIP_STORE_PROTOCOL},
        goods:VIP_STORE_GOODS.map(good=>({
          ...good,
          buyAmount:Number(runtime.purchaseCounts[String(good.id)]||0)
        })),
        stateArray:VIP_STORE_STATE_EFFECT_IDS.map(item=>({...item})),
        runtime:{
          currentExp:runtime.currentExp,
          level:runtime.level,
          activepoint:runtime.activepoint,
          gambleCount:runtime.gambleCount,
          initExp:runtime.initExp
        }
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "alliance.grouppurchase.info",
    async ({ws,msg,send,nowMs}) => {
      const auth=authYoxla(ws,msg,send);
      if (!auth) return;
      const state=getOrCreatePlayerState(auth.playerId);
      const allianceRuntime=lastShelterAllianceRuntimeTeminEt(state);
      const requested=
        msg&&msg.goodsId!=null
          ? String(msg.goodsId).trim()
          : "";
      const offer=requested
        ? allianceGroupPurchaseOfferAl(requested)
        : null;

      if (requested && !offer) {
        send(ws,{type:"error",code:"GROUP_PURCHASE_OFFER_NOT_FOUND",message:"Group purchase offer not found"});
        return;
      }

      send(ws,{
        type:"alliance.grouppurchase.info",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function" ? nowMs() : Date.now(),
        activity:clone(LAST_SHELTER_ALLIANCE_GROUP_PURCHASE),
        offersByKey:allianceGroupPurchaseOffersByKeyAl(),
        offer,
        runtime:clone(allianceRuntime.groupPurchaseActivity),
        records:clone(allianceRuntime.groupPurchaseRecords)
      });
    },
    {authRequired:true,mutation:false}
  );

  return router;
}

module.exports = {
  lastShelterEconomyEventReadCommandleriniQeydEt
};
