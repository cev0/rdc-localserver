"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  lastShelterVerifiedInitProjectionHazirla
} = require("./last_shelter_init_projection");
const {
  freshInitEnvelopeRuntimeDefaultHazirla
} = require("./last_shelter_fresh_init_envelope_reference");

function clone(value) {
  return value == null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function lastShelterInitPayloadHazirla(
  state,
  playerId
) {
  const envelope =
    state &&
    state.lastShelterFreshInitEnvelopeRuntime &&
    typeof state.lastShelterFreshInitEnvelopeRuntime === "object" &&
    !Array.isArray(state.lastShelterFreshInitEnvelopeRuntime)
      ? clone(
          state.lastShelterFreshInitEnvelopeRuntime
        )
      : freshInitEnvelopeRuntimeDefaultHazirla();

  const projection =
    lastShelterVerifiedInitProjectionHazirla(
      state,
      {
        uid:
          String(
            playerId == null
              ? ""
              : playerId
          )
      }
    );

  return {
    ...envelope,
    ...projection
  };
}

function lastShelterInitCommandiniQeydEt(
  router,
  deps
) {
  if (!router) {
    throw new Error(
      "Command router yoxdur."
    );
  }

  const {
    getOrCreatePlayerState,
    ensureFreshPlayerState,
    updateServerTime
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
    "last_shelter.init",
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
        send(ws,{
          type:"error",
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

      const playerId =
        authCheck.playerId;

      const state =
        typeof ensureFreshPlayerState ===
        "function"
          ? await ensureFreshPlayerState(
              playerId
            )
          : getOrCreatePlayerState(
              playerId
            );

      if (
        typeof updateServerTime ===
        "function"
      ) {
        updateServerTime(state);
      }

      const payload =
        lastShelterInitPayloadHazirla(
          state,
          playerId
        );

      send(ws,{
        type:"last_shelter.init",
        playerId,
        serverTimeUnixMs:
          typeof nowMs === "function"
            ? nowMs()
            : Date.now(),
        payload,
        payloadJson:
          JSON.stringify(payload)
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
  lastShelterInitPayloadHazirla,
  lastShelterInitCommandiniQeydEt
};
