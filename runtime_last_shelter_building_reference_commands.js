"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  buildingRuntimeStableAl,
  buildingRuntimeStableIdsAl
} = require("./last_shelter_building_runtime_observed_reference");
const {buildingLeveliniAl,buildingMaxLeveliniAl}=require("./last_shelter_building_kataloqu");

function authYoxla(ws,msg,send) {
  const result = playerIdUyugunluqYoxla(msg,ws);
  if (result.ok) return result;
  send(ws,{
    type:"error",
    code:result.message === "Player ID mismatch"
      ? "PLAYER_ID_MISMATCH"
      : "NOT_AUTHED",
    message:result.message
  });
  return null;
}

function nowAl(nowMs) {
  return typeof nowMs === "function" ? nowMs() : Date.now();
}

function buildingRuntimeStableCatalogHazirla() {
  return buildingRuntimeStableIdsAl()
    .map(key => {
      const splitAt = key.lastIndexOf(":");
      const itemId = splitAt >= 0 ? key.slice(0,splitAt) : key;
      const level = splitAt >= 0 ? key.slice(splitAt + 1) : "0";
      return buildingRuntimeStableAl(itemId,level);
    })
    .filter(Boolean);
}

function lastShelterBuildingReferenceCommandleriniQeydEt(router) {
  if (!router) throw new Error("Command router yoxdur.");

  router.register(
    "building.catalog.level",
    async ({ws,msg,send,nowMs}) => {
      const auth=authYoxla(ws,msg,send); if(!auth)return;
      const buildingTypeId=String(msg&&msg.buildingTypeId!=null?msg.buildingTypeId:"").trim();
      const level=Math.trunc(Number(msg&&msg.level));
      const building=buildingTypeId&&Number.isFinite(level)?buildingLeveliniAl(buildingTypeId,level):null;
      if(!building){send(ws,{type:"error",code:"BUILDING_CATALOG_LEVEL_NOT_FOUND",message:"Last Shelter building.xml level row not found"});return;}
      send(ws,{type:"building.catalog.level",playerId:auth.playerId,serverTimeUnixMs:nowAl(nowMs),source:"last_shelter_v1.250.102_building_xml",maxLevel:buildingMaxLeveliniAl(buildingTypeId),building});
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "building.reference.list",
    async ({ws,msg,send,nowMs}) => {
      const auth = authYoxla(ws,msg,send);
      if (!auth) return;
      const buildings = buildingRuntimeStableCatalogHazirla();
      send(ws,{
        type:"building.reference.list",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        source:"last_shelter_v1.250.102_cross_snapshot_runtime",
        total:buildings.length,
        buildings
      });
    },
    {authRequired:true,mutation:false}
  );

  router.register(
    "building.reference.get",
    async ({ws,msg,send,nowMs}) => {
      const auth = authYoxla(ws,msg,send);
      if (!auth) return;
      const itemId = String(msg && msg.itemId != null ? msg.itemId : "").trim();
      const level = Math.trunc(Number(msg && msg.level));
      const building = itemId && Number.isFinite(level)
        ? buildingRuntimeStableAl(itemId,level)
        : null;
      if (!building) {
        send(ws,{
          type:"error",
          code:"BUILDING_REFERENCE_NOT_FOUND",
          message:"Verified Last Shelter building runtime row not found"
        });
        return;
      }
      send(ws,{
        type:"building.reference.get",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        source:"last_shelter_v1.250.102_cross_snapshot_runtime",
        building
      });
    },
    {authRequired:true,mutation:false}
  );

  return router;
}

module.exports = {
  buildingRuntimeStableCatalogHazirla,
  lastShelterBuildingReferenceCommandleriniQeydEt
};
