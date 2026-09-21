"use strict";

const crypto = require("crypto");

function authCommandiniQeydEt(
  router,
  deps
) {
  if (!router) {
    throw new Error(
      "Command router yoxdur."
    );
  }

  const {
    connections,
    runtimeBus,
    getOrCreatePlayerState,
    ensureFreshPlayerState,
    updateServerTime,
    schedulePlayerDeadline,
    makeClientState,
    makeLastShelterResourcePayload,
    makeLastShelterInitPayload,
    sendStateLocalMapToPlayer,
    sendWorldMapToPlayer
  } = deps || {};

  if (
    !connections ||
    typeof connections.set !==
      "function"
  ) {
    throw new Error(
      "Connection registry yoxdur."
    );
  }

  if (
    !runtimeBus ||
    typeof runtimeBus.registerLocalPlayer !==
      "function"
  ) {
    throw new Error(
      "Runtime bus yoxdur."
    );
  }

  router.register(
    "auth",
    async ({
      ws,
      msg,
      send,
      nowMs
    }) => {
      let playerId =
        msg &&
        typeof msg.playerId === "string"
          ? msg.playerId.trim()
          : "";

      if (!playerId) {
        playerId =
          crypto
            .randomBytes(12)
            .toString("hex");
      }

      ws._authedPlayerId =
        playerId;

      connections.set(
        playerId,
        ws
      );

      try {
        await runtimeBus
          .registerLocalPlayer(
            playerId
          );
      }
      catch (error) {
        console.error(
          "[REDIS] Presence register error:",
          error &&
          error.message
            ? error.message
            : error
        );
      }

      const state =
        typeof ensureFreshPlayerState ===
          "function"
          ? await ensureFreshPlayerState(
              playerId
            )
          : getOrCreatePlayerState(
              playerId
            );

      updateServerTime(state);

      schedulePlayerDeadline(
        playerId,
        state
      );

      send(ws, {
        type: "ack",
        playerId,
        serverTimeUnixMs:
          nowMs()
      });

      send(ws, {
        type: "state",
        playerId,
        serverTimeUnixMs:
          nowMs(),
        payloadJson:
          JSON.stringify(
            makeClientState(state)
          )
      });

      if (
        typeof makeLastShelterResourcePayload ===
        "function"
      ) {
        const resourcePayload =
          makeLastShelterResourcePayload(
            state,
            nowMs()
          );

        send(ws, {
          type: "SynUserResource",
          playerId,
          serverTimeUnixMs:
            nowMs(),
          payload:
            resourcePayload,
          payloadJson:
            JSON.stringify(
              resourcePayload
            )
        });
      }

      if (
        typeof makeLastShelterInitPayload ===
        "function"
      ) {
        const initPayload =
          makeLastShelterInitPayload(
            state,
            playerId
          );

        send(ws, {
          type: "last_shelter.init",
          playerId,
          serverTimeUnixMs:
            nowMs(),
          payload:
            initPayload,
          payloadJson:
            JSON.stringify(
              initPayload
            )
        });
      }

      await sendStateLocalMapToPlayer(
        ws,
        playerId
      );

      await sendWorldMapToPlayer(
        ws,
        playerId
      );
    }
  );

  return router;
}

module.exports = {
  authCommandiniQeydEt
};
