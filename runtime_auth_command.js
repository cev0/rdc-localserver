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
    updateServerTime,
    schedulePlayerDeadline,
    makeClientState,
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
        getOrCreatePlayerState(
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

      sendStateLocalMapToPlayer(
        ws,
        playerId
      );

      sendWorldMapToPlayer(
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
