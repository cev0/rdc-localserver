"use strict";

const {
  playerIdUyugunluqYoxla
}=require("./runtime_core_read_commands");
const {
  qosunKataloquClientUcunHazirla
}=require("./qosun_telimi_sistemi");
const {
  qosunMelumatiniAl
}=require("./qosun_kataloqu");
const {
  LAST_SHELTER_TROOP_TRANSFER_LEVEL6,
  level6PointAl,
  level6AktivPointleriAl,
  level6RawEffectleriTopla,
  level6RawSkillleriTopla
}=require("./last_shelter_troop_transfer_progression_reference");

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

function nowAl(nowMs){
  return typeof nowMs==="function"?nowMs():Date.now();
}

function clone(v){
  return v==null?v:JSON.parse(JSON.stringify(v));
}

function lastShelterTroopReferenceCommandleriniQeydEt(router){
  if(!router) throw new Error("Command router yoxdur.");

  router.register(
    "troop.catalog",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      send(ws,{
        type:"troop.catalog",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        units:qosunKataloquClientUcunHazirla()
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "troop.get",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      const unit=qosunMelumatiniAl(msg&&msg.unitId);
      if(!unit){
        send(ws,{
          type:"error",
          code:"TROOP_NOT_FOUND",
          message:"Troop not found"
        });
        return;
      }
      send(ws,{
        type:"troop.get",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        unit:clone(unit)
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "troop.transfer.level6",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      send(ws,{
        type:"troop.transfer.level6",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        progression:clone(LAST_SHELTER_TROOP_TRANSFER_LEVEL6)
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "troop.transfer.type",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      const type=String(msg&&msg.transferType!=null?msg.transferType:"").trim();
      const points=level6AktivPointleriAl(type);
      if(points.length===0){
        send(ws,{
          type:"error",
          code:"TROOP_TRANSFER_TYPE_NOT_FOUND",
          message:"Troop transfer type not found"
        });
        return;
      }
      send(ws,{
        type:"troop.transfer.type",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        transferType:type,
        total:LAST_SHELTER_TROOP_TRANSFER_LEVEL6.total,
        level:LAST_SHELTER_TROOP_TRANSFER_LEVEL6.level,
        power:LAST_SHELTER_TROOP_TRANSFER_LEVEL6.power,
        singleCostAmount:LAST_SHELTER_TROOP_TRANSFER_LEVEL6.singleCostAmount,
        points,
        effects:level6RawEffectleriTopla(type),
        skills:level6RawSkillleriTopla(type)
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "troop.transfer.point",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      const point=level6PointAl(
        msg&&msg.transferType,
        msg&&msg.pointId
      );
      if(!point){
        send(ws,{
          type:"error",
          code:"TROOP_TRANSFER_POINT_NOT_FOUND",
          message:"Troop transfer point not found"
        });
        return;
      }
      send(ws,{
        type:"troop.transfer.point",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        transferType:String(msg.transferType),
        point
      });
    },
    {authRequired:true,mutation:false}
  );

  return router;
}

module.exports={
  lastShelterTroopReferenceCommandleriniQeydEt
};
