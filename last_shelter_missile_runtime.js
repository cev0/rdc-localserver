"use strict";

const {
  missileAl,
  missileIds,
  missileFreshRuntimeHazirla
} = require("./last_shelter_missile_kataloqu");

function nonNegativeInt(value,fallback=0) {
  const n=Number(value);
  return Number.isFinite(n) ? Math.max(0,Math.trunc(n)) : fallback;
}

function rowRuntimeHazirla(missileId,previous) {
  const config=missileAl(missileId);
  if (!config) return null;

  const old =
    previous && typeof previous==="object" && !Array.isArray(previous)
      ? previous
      : {};

  return {
    unlockFlag:nonNegativeInt(old.unlockFlag,0),
    missileId:String(missileId),
    unlock:old.unlock == null ? true : old.unlock === true,
    plugin:typeof old.plugin==="string" ? old.plugin : "",
    ...config,
    totalNum:nonNegativeInt(old.totalNum,0),
    unReceive:nonNegativeInt(old.unReceive,0),
    lastLaunchTime:nonNegativeInt(old.lastLaunchTime,0)
  };
}

function lastShelterMissileRuntimeDefaultHazirla() {
  return {
    missiles:missileFreshRuntimeHazirla()
  };
}

function lastShelterMissileRuntimeTeminEt(state) {
  if (!state || typeof state!=="object") return null;

  if (
    !state.lastShelterMissileRuntime ||
    typeof state.lastShelterMissileRuntime!=="object" ||
    Array.isArray(state.lastShelterMissileRuntime)
  ) {
    state.lastShelterMissileRuntime =
      lastShelterMissileRuntimeDefaultHazirla();
    return state.lastShelterMissileRuntime;
  }

  const runtime=state.lastShelterMissileRuntime;
  const previousById=new Map(
    (Array.isArray(runtime.missiles) ? runtime.missiles : [])
      .filter(Boolean)
      .map(row=>[String(row.missileId==null?"":row.missileId),row])
  );

  runtime.missiles=missileIds()
    .map(id=>rowRuntimeHazirla(id,previousById.get(id)))
    .filter(Boolean);

  return runtime;
}

function missileInitProjectionHazirla(state) {
  const runtime=lastShelterMissileRuntimeTeminEt(state);
  return runtime
    ? JSON.parse(JSON.stringify(runtime.missiles))
    : [];
}

module.exports = {
  rowRuntimeHazirla,
  lastShelterMissileRuntimeDefaultHazirla,
  lastShelterMissileRuntimeTeminEt,
  missileInitProjectionHazirla
};
