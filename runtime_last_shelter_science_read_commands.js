"use strict";

const {
  playerIdUyugunluqYoxla
}=require("./runtime_core_read_commands");
const {
  scienceIdleriAl,
  scienceMelumatiniAl
}=require("./last_shelter_science_kataloqu");
const {
  scienceTopologyMelumatiniAl
}=require("./last_shelter_science_full_topology");
const {
  sciencePrerequisiteStatusuAl
}=require("./last_shelter_science_prerequisite_runtime");
const {
  verifiedScienceResearchPlanHazirla
}=require("./last_shelter_science_runtime_adapteri");

function authYoxla(ws,msg,send){
  const result=playerIdUyugunluqYoxla(msg,ws);
  if(result.ok) return result;
  send(ws,{
    type:"error",
    code:result.message==="Player ID mismatch"?"PLAYER_ID_MISMATCH":"NOT_AUTHED",
    message:result.message
  });
  return null;
}

function lastShelterScienceReadCommandleriniQeydEt(router,deps){
  if(!router) throw new Error("Command router yoxdur.");
  const {getOrCreatePlayerState}=deps||{};
  if(typeof getOrCreatePlayerState!=="function"){
    throw new Error("getOrCreatePlayerState yoxdur.");
  }

  router.register(
    "science.catalog",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      const rows=scienceIdleriAl().map(scienceMelumatiniAl);
      send(ws,{
        type:"science.catalog",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function"?nowMs():Date.now(),
        rows
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "science.topology",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      const topology=scienceTopologyMelumatiniAl(msg&&msg.itemId);
      if(!topology){
        send(ws,{type:"error",code:"SCIENCE_TOPOLOGY_UNVERIFIED",message:"Science topology not verified"});
        return;
      }
      send(ws,{
        type:"science.topology",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function"?nowMs():Date.now(),
        topology
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "science.prerequisite",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      const state=getOrCreatePlayerState(auth.playerId);
      const status=sciencePrerequisiteStatusuAl(state,msg&&msg.itemId);
      send(ws,{
        type:"science.prerequisite",
        playerId:auth.playerId,
        serverTimeUnixMs:typeof nowMs==="function"?nowMs():Date.now(),
        status
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "science.plan",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      const state=getOrCreatePlayerState(auth.playerId);
      const now=typeof nowMs==="function"?nowMs():Date.now();
      const prerequisite=sciencePrerequisiteStatusuAl(state,msg&&msg.itemId);
      if(!prerequisite.ok){
        send(ws,{
          type:"science.plan",
          playerId:auth.playerId,
          serverTimeUnixMs:now,
          ok:false,
          prerequisite,
          plan:null
        });
        return;
      }
      const plan=verifiedScienceResearchPlanHazirla(
        state,
        {
          itemId:msg&&msg.itemId,
          quuid:msg&&msg.quuid,
          gold:msg&&msg.gold
        },
        now
      );
      send(ws,{
        type:"science.plan",
        playerId:auth.playerId,
        serverTimeUnixMs:now,
        ok:plan.ok===true,
        prerequisite,
        plan
      });
    },
    {authRequired:true,mutation:false}
  );

  return router;
}

module.exports={lastShelterScienceReadCommandleriniQeydEt};
