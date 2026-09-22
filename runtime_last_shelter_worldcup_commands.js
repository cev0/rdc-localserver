"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  WORLD_CUP_ROWS,
  worldCupRowAl,
  worldCupOptionIdsAl,
  worldCupGoodsMaxAl,
  worldCupRowsByNameTypeAl
} = require("./last_shelter_worldcup_reference");

function authYoxla(ws,msg,send) {
  const authCheck=playerIdUyugunluqYoxla(msg,ws);
  if (authCheck.ok) return authCheck;

  send(ws,{
    type:"error",
    code:
      authCheck.message==="Player ID mismatch"
        ? "PLAYER_ID_MISMATCH"
        : "NOT_AUTHED",
    message:authCheck.message
  });
  return null;
}

function lastShelterWorldCupCommandleriniQeydEt(router) {
  if (!router) throw new Error("Command router yoxdur.");

  router.register(
    "worldcup.list",
    async ({ws,msg,send,nowMs}) => {
      const authCheck=authYoxla(ws,msg,send);
      if (!authCheck) return;

      const nameType=
        msg && msg.nameType != null
          ? String(msg.nameType).trim()
          : "";

      const rows=nameType
        ? worldCupRowsByNameTypeAl(nameType)
        : WORLD_CUP_ROWS.map(row=>({...row}));

      send(ws,{
        type:"worldcup.list",
        playerId:authCheck.playerId,
        serverTimeUnixMs:
          typeof nowMs==="function" ? nowMs() : Date.now(),
        rows
      });
    },
    {
      authRequired:true,
      mutation:false
    }
  );

  router.register(
    "worldcup.get",
    async ({ws,msg,send,nowMs}) => {
      const authCheck=authYoxla(ws,msg,send);
      if (!authCheck) return;

      const id=
        msg && msg.id != null
          ? String(msg.id).trim()
          : "";
      const row=worldCupRowAl(id);

      if (!row) {
        send(ws,{
          type:"error",
          code:"WORLD_CUP_ROW_NOT_FOUND",
          message:"World Cup row not found"
        });
        return;
      }

      send(ws,{
        type:"worldcup.get",
        playerId:authCheck.playerId,
        serverTimeUnixMs:
          typeof nowMs==="function" ? nowMs() : Date.now(),
        row,
        options:worldCupOptionIdsAl(id),
        goodsMax:worldCupGoodsMaxAl(id)
      });
    },
    {
      authRequired:true,
      mutation:false
    }
  );

  return router;
}

module.exports = {
  lastShelterWorldCupCommandleriniQeydEt
};
