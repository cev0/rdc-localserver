"use strict";

const { playerIdUyugunluqYoxla } = require("./runtime_core_read_commands");
const {
  LAST_SHELTER_HERO_TEMPLATES,
  LAST_SHELTER_HERO_DATA_CONFIG,
  heroTemplateProjectionHazirla,
  lastShelterHeroRuntimeTeminEt
} = require("./last_shelter_hero_reference");

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function authYoxla(ws, msg, send) {
  const result = playerIdUyugunluqYoxla(msg, ws);
  if (result.ok) return result;
  send(ws, {
    type: "error",
    code: result.message === "Player ID mismatch" ? "PLAYER_ID_MISMATCH" : "NOT_AUTHED",
    message: result.message
  });
  return null;
}

function nowAl(nowMs) {
  return typeof nowMs === "function" ? nowMs() : Date.now();
}

function heroSnapshotHazirla(state) {
  const runtime = lastShelterHeroRuntimeTeminEt(state);
  if (!runtime) return null;

  return {
    config: clone(LAST_SHELTER_HERO_DATA_CONFIG),
    templates: LAST_SHELTER_HERO_TEMPLATES.map(row => heroTemplateProjectionHazirla(row.id)),
    generals: clone(runtime.generals || [])
  };
}

function lastShelterHeroCommandleriniQeydEt(router, deps) {
  if (!router) throw new Error("Command router yoxdur.");
  const { getOrCreatePlayerState } = deps || {};
  if (typeof getOrCreatePlayerState !== "function") {
    throw new Error("getOrCreatePlayerState yoxdur.");
  }

  router.register(
    "hero.info",
    async ({ ws, msg, send, nowMs }) => {
      const auth = authYoxla(ws, msg, send);
      if (!auth) return;
      const state = getOrCreatePlayerState(auth.playerId);
      send(ws, {
        type: "hero.info",
        playerId: auth.playerId,
        serverTimeUnixMs: nowAl(nowMs),
        hero: heroSnapshotHazirla(state)
      });
    },
    { authRequired: true, mutation: false }
  );

  return router;
}

module.exports = {
  heroSnapshotHazirla,
  lastShelterHeroCommandleriniQeydEt
};
