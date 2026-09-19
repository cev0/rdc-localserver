"use strict";

function playerIdUyugunluqYoxla(
  msg,
  ws
) {
  const authPlayerId =
    ws && ws._authedPlayerId
      ? String(ws._authedPlayerId)
      : "";

  if (!authPlayerId) {
    return {
      ok: false,
      playerId: "",
      message: "Not authed"
    };
  }

  const requested =
    msg &&
    typeof msg.playerId === "string"
      ? msg.playerId.trim()
      : "";

  if (
    requested &&
    requested !== authPlayerId
  ) {
    return {
      ok: false,
      playerId: authPlayerId,
      message: "Player ID mismatch"
    };
  }

  return {
    ok: true,
    playerId: authPlayerId
  };
}

function coreReadCommandleriniQeydEt(
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
    updateServerTime,
    makeClientState,
    buildStateLocalMapPayloadAuthoritative,
    buildWorldMapPayloadForClient
  } = deps || {};

  if (
    typeof getOrCreatePlayerState !==
    "function"
  ) {
    throw new Error(
      "getOrCreatePlayerState yoxdur."
    );
  }

  if (
    typeof updateServerTime !==
    "function" ||
    typeof makeClientState !==
    "function"
  ) {
    throw new Error(
      "State helper-lari natamamdir."
    );
  }

  router.register(
    "hello",
    async ({ ws, send, nowMs }) => {
      send(ws, {
        type: "hello",
        serverTimeUnixMs: nowMs()
      });
    }
  );

  router.register(
    "ping",
    async ({ ws, send, nowMs }) => {
      send(ws, {
        type: "pong",
        serverTimeUnixMs: nowMs()
      });
    }
  );

  router.register(
    "get_state",
    async ({ ws, send, nowMs }) => {
      const playerId =
        String(
          ws._authedPlayerId
        );

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

      send(ws, {
        type: "state",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            makeClientState(state)
          )
      });
    },
    {
      authRequired: true
    }
  );

  router.register(
    "get_state_local_map",
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
          message: authCheck.message
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
        !state ||
        !state.worldPlacement
      ) {
        send(ws, {
          type: "error",
          message:
            "Player world placement not found"
        });
        return;
      }

      const requestedStateId =
        Number.isInteger(msg.stateId)
          ? msg.stateId
          : Number(
              state.worldPlacement
                .stateId
            );

      const payload =
        await buildStateLocalMapPayloadAuthoritative(
          requestedStateId,
          playerId
        );

      if (!payload) {
        send(ws, {
          type: "error",
          message:
            "State local map not found"
        });
        return;
      }

      send(ws, {
        type: "state_local_map",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(payload)
      });
    },
    {
      authRequired: true
    }
  );

  router.register(
    "get_world_map",
    async ({ ws, send, nowMs }) => {
      const playerId =
        String(
          ws._authedPlayerId
        );

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

      send(ws, {
        type: "world_map",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            buildWorldMapPayloadForClient()
          )
      });
    },
    {
      authRequired: true
    }
  );

  return router;
}

module.exports = {
  coreReadCommandleriniQeydEt,
  playerIdUyugunluqYoxla
};
