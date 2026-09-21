"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  lastShelterResourcePayloadHazirla
} = require("./last_shelter_resource_runtime");

function serverVaxtiAl(nowMs) {
  return typeof nowMs === "function"
    ? nowMs()
    : Date.now();
}

function lastShelterResourceCommandiniQeydEt(
  router,
  deps
) {
  if (!router) {
    throw new Error("Command router yoxdur.");
  }

  const {
    getOrCreatePlayerState
  } = deps || {};

  if (
    typeof getOrCreatePlayerState !==
    "function"
  ) {
    throw new Error(
      "getOrCreatePlayerState yoxdur."
    );
  }

  router.register(
    "SynUserResource",
    async ({
      ws,
      msg,
      send,
      nowMs
    }) => {
      const authCheck =
        playerIdUyugunluqYoxla(
          msg,
          ws
        );

      if (!authCheck.ok) {
        send(ws, {
          type: "error",
          code:
            authCheck.message ===
            "Player ID mismatch"
              ? "PLAYER_ID_MISMATCH"
              : "NOT_AUTHED",
          message:
            authCheck.message
        });
        return;
      }

      const now =
        serverVaxtiAl(nowMs);

      const state =
        getOrCreatePlayerState(
          authCheck.playerId
        );

      const payload =
        lastShelterResourcePayloadHazirla(
          state,
          now
        );

      send(ws, {
        type: "SynUserResource",
        playerId:
          authCheck.playerId,
        serverTimeUnixMs: now,
        payload,
        payloadJson:
          JSON.stringify(payload)
      });
    },
    {
      authRequired: true,
      mutation: false
    }
  );

  return router;
}

module.exports = {
  lastShelterResourceCommandiniQeydEt
};
