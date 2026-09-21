"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  scienceIdleriAl,
  scienceMelumatiniAl
} = require("./last_shelter_science_kataloqu");
const {
  verifiedScienceResearchPlanHazirla
} = require("./last_shelter_science_runtime_adapteri");
const {
  getLastShelterQueueState,
  shouldAutoReleaseLastShelterQueue,
  isFreeLastShelterQueue
} = require("./last_shelter_queue_runtime");

function authYoxla(ws,msg,send) {
  const authCheck =
    playerIdUyugunluqYoxla(
      msg,
      ws
    );

  if (authCheck.ok) {
    return authCheck;
  }

  send(ws,{
    type:"error",
    code:
      authCheck.message ===
      "Player ID mismatch"
        ? "PLAYER_ID_MISMATCH"
        : "NOT_AUTHED",
    message:authCheck.message
  });

  return null;
}

function serverVaxtiAl(nowMs) {
  return typeof nowMs === "function"
    ? nowMs()
    : Date.now();
}

function queueListesiAl(state) {
  const direct =
    state && Array.isArray(state.queues)
      ? state.queues
      : null;

  if (direct) return direct;

  const starter =
    state &&
    state.lastShelterStarterAccountRuntime;

  return starter &&
    Array.isArray(starter.queues)
      ? starter.queues
      : [];
}

function queueSnapshotHazirla(
  state,
  nowUnixMs
) {
  const now =
    Number.isFinite(Number(nowUnixMs))
      ? Number(nowUnixMs)
      : Date.now();

  return queueListesiAl(state)
    .map(queue=>{
      const typeName =
        typeof queue.typeName === "string" &&
        queue.typeName.trim()
          ? queue.typeName.trim()
          : (
              Number(queue.type) === 6 ||
              Number(queue.typeCode) === 6
                ? "SCIENCE"
                : ""
            );

      const normalized = {
        ...queue,
        typeName:
          typeName ||
          queue.typeName
      };

      const updateTime =
        Object.prototype.hasOwnProperty.call(
          queue,
          "updateTime"
        )
          ? queue.updateTime
          : (
              Object.prototype.hasOwnProperty.call(
                queue,
                "finishUnixMs"
              )
                ? queue.finishUnixMs
                : Number.MAX_SAFE_INTEGER
            );

      return {
        ...queue,
        computedTypeName:
          typeName,
        computedState:
          getLastShelterQueueState(
            updateTime,
            now
          ),
        autoRelease:
          shouldAutoReleaseLastShelterQueue(
            normalized,
            now
          ),
        isFree:
          isFreeLastShelterQueue(
            normalized,
            now
          )
      };
    });
}

function scienceCatalogProjectionHazirla() {
  return scienceIdleriAl()
    .map(id=>scienceMelumatiniAl(id))
    .filter(Boolean);
}

function lastShelterQueueScienceCommandleriniQeydEt(
  router,
  deps
) {
  if (!router) {
    throw new Error(
      "Command router yoxdur."
    );
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
    "queue.list",
    async ({ws,msg,send,nowMs}) => {
      const authCheck =
        authYoxla(ws,msg,send);
      if (!authCheck) return;

      const now =
        serverVaxtiAl(nowMs);
      const state =
        getOrCreatePlayerState(
          authCheck.playerId
        );

      send(ws,{
        type:"queue.list",
        playerId:
          authCheck.playerId,
        serverTimeUnixMs:now,
        queues:
          queueSnapshotHazirla(
            state,
            now
          )
      });
    },
    {
      authRequired:true,
      mutation:false
    }
  );

  router.register(
    "science.catalog",
    async ({ws,msg,send,nowMs}) => {
      const authCheck =
        authYoxla(ws,msg,send);
      if (!authCheck) return;

      send(ws,{
        type:"science.catalog",
        playerId:
          authCheck.playerId,
        serverTimeUnixMs:
          serverVaxtiAl(nowMs),
        science:
          scienceCatalogProjectionHazirla()
      });
    },
    {
      authRequired:true,
      mutation:false
    }
  );

  router.register(
    "science.plan",
    async ({ws,msg,send,nowMs}) => {
      const authCheck =
        authYoxla(ws,msg,send);
      if (!authCheck) return;

      const now =
        serverVaxtiAl(nowMs);
      const state =
        getOrCreatePlayerState(
          authCheck.playerId
        );

      const plan =
        verifiedScienceResearchPlanHazirla(
          state,
          {
            itemId:
              msg && msg.itemId,
            quuid:
              msg &&
              (
                msg.quuid ||
                msg.queueUuid
              ),
            gold:
              msg && msg.gold
          },
          now
        );

      if (!plan.ok) {
        send(ws,{
          type:"error",
          code:
            plan.code ||
            "SCIENCE_PLAN_FAILED",
          message:
            "Science plan failed"
        });
        return;
      }

      send(ws,{
        type:"science.plan",
        playerId:
          authCheck.playerId,
        serverTimeUnixMs:now,
        plan
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
  queueListesiAl,
  queueSnapshotHazirla,
  scienceCatalogProjectionHazirla,
  lastShelterQueueScienceCommandleriniQeydEt
};
