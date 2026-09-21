"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  lastShelterItemBuyIcraEt
} = require("./last_shelter_item_runtime");

function errorGonder(send, ws, result) {
  send(ws, {
    type: "error",
    code:
      result && result.code
        ? result.code
        : "INVALID_OPT",
    message:
      result && result.message
        ? result.message
        : "Last Shelter item buy failed"
  });
}

function lastShelterItemCommandleriniQeydEt(
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
    "item.buy",
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

      const playerId =
        authCheck.playerId;

      const state =
        getOrCreatePlayerState(
          playerId
        );

      const result =
        lastShelterItemBuyIcraEt(
          state,
          {
            itemId:
              msg && msg.itemId,
            num:
              msg && msg.num,
            batch:
              msg && msg.batch
          }
        );

      if (!result.success) {
        errorGonder(
          send,
          ws,
          result
        );
        return;
      }

      send(ws, {
        type: "item.buy",
        playerId,
        serverTimeUnixMs:
          nowMs(),
        item:
          result.item,
        remainGold:
          result.remainGold,
        costGold:
          result.costGold
      });
    },
    {
      authRequired: true,
      mutation: true,
      postgresAuthoritative: true
    }
  );

  return router;
}

module.exports = {
  lastShelterItemCommandleriniQeydEt
};
