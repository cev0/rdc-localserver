"use strict";

/*
 * Verified Last Shelter v1.250.102 fresh-account init auxiliary defaults.
 *
 * Source: a newly registered reference account (uid omitted from config).
 * Environment/session-derived values such as db_utc_timestamp and ambiguous
 * baseBuildingLevel are deliberately excluded from this static contract.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_FRESH_RESOURCE_POINTS = deepFreeze([
  {showId:20001401,x:18,y:23,rtType:0},
  {showId:20001401,x:45,y:32,rtType:0},
  {showId:20001401,x:27,y:34,rtType:0},
  {showId:20001421,x:39,y:38,rtType:2},
  {showId:20001421,x:45,y:45,rtType:2},
  {showId:20001411,x:26,y:18,rtType:1},
  {showId:20001411,x:34,y:26,rtType:1},
  {showId:20001431,x:44,y:21,rtType:3},
  {showId:20001431,x:38,y:32,rtType:3},
  {showId:20001431,x:19,y:44,rtType:3},
  {showId:20001441,x:38,y:18,rtType:11},
  {showId:20001441,x:32,y:37,rtType:11},
  {showId:20001441,x:28,y:45,rtType:11}
]);

const LAST_SHELTER_FRESH_INIT_AUX_DEFAULTS = deepFreeze({
  killWorldBossNumber:0,
  heroprison:[],
  chatShield:[],
  hasPassword:false,
  isOpenedKingdomAct:false,
  kingdomSeasonObj:{riseInfo:[]},
  cityDefRecoverRecord:0,
  mailTranslation:false,
  killActivityBossNumber:0,
  activationStoptime:0,
  exchangeGift:[]
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function freshInitAuxRuntimeDefaultHazirla() {
  return {
    ...clone(LAST_SHELTER_FRESH_INIT_AUX_DEFAULTS),
    resourcePoints:clone(LAST_SHELTER_FRESH_RESOURCE_POINTS)
  };
}

function freshInitAuxRuntimeTeminEt(runtime) {
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) {
    return null;
  }

  const defaults = freshInitAuxRuntimeDefaultHazirla();

  for (const key of [
    "heroprison",
    "chatShield",
    "exchangeGift",
    "resourcePoints"
  ]) {
    if (!Array.isArray(runtime[key])) {
      runtime[key] = clone(defaults[key]);
    }
  }

  if (
    !runtime.kingdomSeasonObj ||
    typeof runtime.kingdomSeasonObj !== "object" ||
    Array.isArray(runtime.kingdomSeasonObj)
  ) {
    runtime.kingdomSeasonObj = clone(defaults.kingdomSeasonObj);
  }
  if (!Array.isArray(runtime.kingdomSeasonObj.riseInfo)) {
    runtime.kingdomSeasonObj.riseInfo = [];
  }

  for (const key of [
    "killWorldBossNumber",
    "cityDefRecoverRecord",
    "killActivityBossNumber",
    "activationStoptime"
  ]) {
    const n = Number(runtime[key]);
    runtime[key] = Number.isFinite(n)
      ? Math.max(0,Math.trunc(n))
      : defaults[key];
  }

  for (const key of [
    "hasPassword",
    "isOpenedKingdomAct",
    "mailTranslation"
  ]) {
    if (typeof runtime[key] !== "boolean") {
      runtime[key] = defaults[key];
    }
  }

  return runtime;
}

module.exports = {
  LAST_SHELTER_FRESH_RESOURCE_POINTS,
  LAST_SHELTER_FRESH_INIT_AUX_DEFAULTS,
  freshInitAuxRuntimeDefaultHazirla,
  freshInitAuxRuntimeTeminEt
};
