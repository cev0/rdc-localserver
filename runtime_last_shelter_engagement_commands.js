"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");
const {
  LAST_SHELTER_FIRST_PAY_REWARD,
  LAST_SHELTER_ONLINE_DURATION,
  LAST_SHELTER_HELICOPTER,
  lastShelterEngagementRuntimeTeminEt
} = require("./last_shelter_engagement_reward_reference");

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

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

function engagementSnapshotHazirla(state) {
  const runtime = lastShelterEngagementRuntimeTeminEt(state);
  if (!runtime) return null;

  const onlineById = new Map(
    runtime.onlineDuration.rewards
      .filter(Boolean)
      .map(row => [String(row.entryId),row])
  );
  const helicopterById = new Map(
    runtime.helicopter.taskState
      .filter(Boolean)
      .map(row => [Number(row.id),row])
  );

  return {
    firstPayReward:clone(LAST_SHELTER_FIRST_PAY_REWARD),
    firstPayRewardClaimed:runtime.firstPayRewardClaimed === true,
    onlineDurationRecruitHero:LAST_SHELTER_ONLINE_DURATION.onlineDurationRecruitHero,
    onlineDurationRewards:LAST_SHELTER_ONLINE_DURATION.rewards.map(template => {
      const row = onlineById.get(template.entryId) || {};
      return {
        ...clone(template),
        duration:Number.isFinite(Number(row.duration))
          ? Math.max(0,Math.trunc(Number(row.duration)))
          : template.duration,
        rewardState:Number.isFinite(Number(row.rewardState))
          ? Math.max(0,Math.trunc(Number(row.rewardState)))
          : template.rewardState
      };
    }),
    helicopter:{
      record:{
        ...clone(LAST_SHELTER_HELICOPTER.recordDefaults),
        ...clone(runtime.helicopter.record)
      },
      cdgoldk:LAST_SHELTER_HELICOPTER.cdgoldk,
      refugeeLimit:LAST_SHELTER_HELICOPTER.refugeeLimit,
      refugees:clone(runtime.helicopter.refugees),
      tasks:LAST_SHELTER_HELICOPTER.taskTemplates.map(template => ({
        ...clone(template),
        runtime:clone(helicopterById.get(template.id) || {
          id:template.id,
          state:template.observedInitialState,
          finishTime:0
        })
      }))
    }
  };
}

function lastShelterEngagementCommandleriniQeydEt(router,deps) {
  if (!router) throw new Error("Command router yoxdur.");
  const {getOrCreatePlayerState} = deps || {};
  if (typeof getOrCreatePlayerState !== "function") {
    throw new Error("getOrCreatePlayerState yoxdur.");
  }

  router.register(
    "engagement.info",
    async ({ws,msg,send,nowMs}) => {
      const auth = authYoxla(ws,msg,send);
      if (!auth) return;
      const state = getOrCreatePlayerState(auth.playerId);
      send(ws,{
        type:"engagement.info",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        engagement:engagementSnapshotHazirla(state)
      });
    },
    {authRequired:true,mutation:false}
  );

  return router;
}

module.exports = {
  engagementSnapshotHazirla,
  lastShelterEngagementCommandleriniQeydEt
};
