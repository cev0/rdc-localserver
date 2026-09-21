"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  scienceIdleriAl,
  scienceMelumatiniAl
} = require("./last_shelter_science_kataloqu");
const {
  verifiedScienceResearchPlanHazirla
} = require("./last_shelter_science_runtime_adapteri");
const {
  scienceTopologyMelumatiniAl,
  scienceTopologyIdleriniAl
} = require("./last_shelter_science_full_topology");
const {
  sciencePrerequisiteStatusuAl
} = require("./last_shelter_science_prerequisite_runtime");
const {
  getLastShelterQueueState,
  shouldAutoReleaseLastShelterQueue,
  isFreeLastShelterQueue
} = require("./last_shelter_queue_runtime");

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

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function queueListesiAl(state) {
  const direct = state && Array.isArray(state.queues) ? state.queues : null;
  if (direct) return direct;
  const starter = state && state.lastShelterStarterAccountRuntime;
  return starter && Array.isArray(starter.queues) ? starter.queues : [];
}

function queueSnapshotHazirla(state,nowUnixMs) {
  const now = Number.isFinite(Number(nowUnixMs)) ? Number(nowUnixMs) : Date.now();
  return queueListesiAl(state).map(queue=>{
    const typeName = typeof queue.typeName === "string" && queue.typeName.trim()
      ? queue.typeName.trim()
      : (Number(queue.type) === 6 || Number(queue.typeCode) === 6 ? "SCIENCE" : "");
    const normalized = {...queue,typeName:typeName || queue.typeName};
    const updateTime = Object.prototype.hasOwnProperty.call(queue,"updateTime")
      ? queue.updateTime
      : (Object.prototype.hasOwnProperty.call(queue,"finishUnixMs") ? queue.finishUnixMs : Number.MAX_SAFE_INTEGER);
    return {
      ...queue,
      computedTypeName:typeName,
      computedState:getLastShelterQueueState(updateTime,now),
      autoRelease:shouldAutoReleaseLastShelterQueue(normalized,now),
      isFree:isFreeLastShelterQueue(normalized,now)
    };
  });
}

function scienceCatalogProjectionHazirla() {
  return scienceIdleriAl().map(id=>scienceMelumatiniAl(id)).filter(Boolean);
}

function scienceTopologyProjectionHazirla() {
  return scienceTopologyIdleriniAl()
    .map(id=>scienceTopologyMelumatiniAl(id))
    .filter(Boolean);
}

// Research completion is server-authoritative in state.science. Expose a
// detached snapshot so clients can resync completed levels without mutating
// persisted state or inferring levels from queue history.
function scienceRuntimeProjectionHazirla(state) {
  const science = state && state.science;
  if (Array.isArray(science)) return clone(science);
  if (science && typeof science === "object") return clone(science);
  return {};
}

function lastShelterQueueScienceCommandleriniQeydEt(router,deps) {
  if (!router) throw new Error("Command router yoxdur.");
  const {getOrCreatePlayerState} = deps || {};
  if (typeof getOrCreatePlayerState !== "function") throw new Error("getOrCreatePlayerState yoxdur.");

  router.register("queue.list",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck) return;
    const now=serverVaxtiAl(nowMs);
    const state=getOrCreatePlayerState(authCheck.playerId);
    send(ws,{type:"queue.list",playerId:authCheck.playerId,serverTimeUnixMs:now,queues:queueSnapshotHazirla(state,now)});
  },{authRequired:true,mutation:false});

  router.register("science.catalog",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck) return;
    send(ws,{type:"science.catalog",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),science:scienceCatalogProjectionHazirla()});
  },{authRequired:true,mutation:false});

  // Full 441-node topology observed from GetScienceInfo. This is intentionally
  // separate from science.catalog: the latter contains only nodes whose
  // original science.xml balance (cost/time) has been independently verified.
  router.register("science.topology.list",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck) return;
    send(ws,{
      type:"science.topology.list",
      playerId:authCheck.playerId,
      serverTimeUnixMs:serverVaxtiAl(nowMs),
      total:scienceTopologyIdleriniAl().length,
      science:scienceTopologyProjectionHazirla()
    });
  },{authRequired:true,mutation:false});

  router.register("science.topology",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck) return;
    const topology=scienceTopologyMelumatiniAl(msg && msg.itemId);
    if(!topology){
      send(ws,{type:"error",code:"SCIENCE_TOPOLOGY_UNVERIFIED",message:"Science topology not verified"});
      return;
    }
    send(ws,{type:"science.topology",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),topology});
  },{authRequired:true,mutation:false});

  router.register("science.state",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck) return;
    const state=getOrCreatePlayerState(authCheck.playerId);
    send(ws,{
      type:"science.state",
      playerId:authCheck.playerId,
      serverTimeUnixMs:serverVaxtiAl(nowMs),
      science:scienceRuntimeProjectionHazirla(state)
    });
  },{authRequired:true,mutation:false});

  router.register("science.prerequisite",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck) return;
    const state=getOrCreatePlayerState(authCheck.playerId);
    send(ws,{type:"science.prerequisite",playerId:authCheck.playerId,serverTimeUnixMs:serverVaxtiAl(nowMs),status:sciencePrerequisiteStatusuAl(state,msg && msg.itemId)});
  },{authRequired:true,mutation:false});

  router.register("science.plan",async ({ws,msg,send,nowMs})=>{
    const authCheck=authYoxla(ws,msg,send); if(!authCheck) return;
    const now=serverVaxtiAl(nowMs);
    const state=getOrCreatePlayerState(authCheck.playerId);
    const prerequisite=sciencePrerequisiteStatusuAl(state,msg && msg.itemId);
    if(!prerequisite.ok){
      send(ws,{type:"error",code:prerequisite.code || "SCIENCE_CONDITION_NOT_MET",message:"Science prerequisite failed",prerequisite});
      return;
    }
    const plan=verifiedScienceResearchPlanHazirla(state,{
      itemId:msg && msg.itemId,
      quuid:msg && (msg.quuid || msg.queueUuid),
      gold:msg && msg.gold
    },now);
    if(!plan.ok){
      send(ws,{type:"error",code:plan.code || "SCIENCE_PLAN_FAILED",message:"Science plan failed"});
      return;
    }
    send(ws,{type:"science.plan",playerId:authCheck.playerId,serverTimeUnixMs:now,prerequisite,plan});
  },{authRequired:true,mutation:false});

  return router;
}

module.exports={
  queueListesiAl,
  queueSnapshotHazirla,
  scienceCatalogProjectionHazirla,
  scienceTopologyProjectionHazirla,
  scienceRuntimeProjectionHazirla,
  lastShelterQueueScienceCommandleriniQeydEt
};
