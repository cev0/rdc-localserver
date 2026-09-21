"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  setTutorialIcraEt
} = require("./last_shelter_tutorial_reference");

function lastShelterTutorialCommandiniQeydEt(router,deps) {
  if (!router) throw new Error("Command router yoxdur.");

  const {getOrCreatePlayerState}=deps||{};
  if (typeof getOrCreatePlayerState!=="function") {
    throw new Error("getOrCreatePlayerState yoxdur.");
  }

  router.register(
    "SetTutorial",
    async ({ws,msg,send}) => {
      const authCheck=playerIdUyugunluqYoxla(msg,ws);
      if (!authCheck.ok) {
        send(ws,{
          type:"error",
          code:
            authCheck.message==="Player ID mismatch"
              ? "PLAYER_ID_MISMATCH"
              : "NOT_AUTHED",
          message:authCheck.message
        });
        return;
      }

      const state=getOrCreatePlayerState(authCheck.playerId);
      const result=setTutorialIcraEt(state,msg&&msg.id);

      if (!result.success) {
        send(ws,{
          type:"error",
          code:result.code||"INVALID_OPT",
          message:"SetTutorial failed"
        });
        return;
      }

      // SmartFox response body is {success:true}; type is the RDC transport
      // envelope/correlation field rather than an extra gameplay payload.
      send(ws,{
        type:"SetTutorial",
        success:true
      });
    },
    {
      authRequired:true,
      mutation:true,
      postgresAuthoritative:true
    }
  );

  return router;
}

module.exports = {
  lastShelterTutorialCommandiniQeydEt
};
