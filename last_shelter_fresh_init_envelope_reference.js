"use strict";

/*
 * Verified Last Shelter v1.250.102 fresh-account init envelope defaults.
 *
 * These fields were observed in the current reference init payload. Dynamic
 * session/day fields (tomorrow, newAccount transition), tutorial-generated
 * unformation/status rows, identifiers and timestamps are deliberately not
 * promoted here.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_FRESH_INIT_ENVELOPE = deepFreeze({
  worldPrisonBuilding:[],
  alliancemerge:0,
  identification:{
    authenticate:false,
    isCN:false,
    isArab:false
  },
  goldprices:[],
  buildRapidType:"",
  vip:{
    vipEndTime:0,
    score:0,
    level:0,
    nextDayScore:20,
    loginDays:1
  },
  alliancenewmail:0,
  armyFormationMaxCount:0,
  debuffObj:{
    debuffList:[]
  },
  isHavaOfflineLvUp:0,
  cdTimeArray:[],
  vipstoreLevel:1,
  kingdomContribution:0,
  fbShare:[],
  exchangeVip:[]
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function freshInitEnvelopeRuntimeDefaultHazirla() {
  return clone(LAST_SHELTER_FRESH_INIT_ENVELOPE);
}

function freshInitEnvelopeRuntimeTeminEt(runtime) {
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) {
    return null;
  }

  const defaults=freshInitEnvelopeRuntimeDefaultHazirla();

  for (const key of [
    "worldPrisonBuilding",
    "goldprices",
    "cdTimeArray",
    "fbShare",
    "exchangeVip"
  ]) {
    if (!Array.isArray(runtime[key])) runtime[key]=clone(defaults[key]);
  }

  if (
    !runtime.identification ||
    typeof runtime.identification!=="object" ||
    Array.isArray(runtime.identification)
  ) {
    runtime.identification=clone(defaults.identification);
  }

  for (const key of ["authenticate","isCN","isArab"]) {
    if (typeof runtime.identification[key]!=="boolean") {
      runtime.identification[key]=defaults.identification[key];
    }
  }

  if (!runtime.vip || typeof runtime.vip!=="object" || Array.isArray(runtime.vip)) {
    runtime.vip=clone(defaults.vip);
  }
  for (const key of ["vipEndTime","score","level","nextDayScore","loginDays"]) {
    const n=Number(runtime.vip[key]);
    runtime.vip[key]=Number.isFinite(n)
      ? Math.max(0,Math.trunc(n))
      : defaults.vip[key];
  }

  if (
    !runtime.debuffObj ||
    typeof runtime.debuffObj!=="object" ||
    Array.isArray(runtime.debuffObj)
  ) {
    runtime.debuffObj=clone(defaults.debuffObj);
  }
  if (!Array.isArray(runtime.debuffObj.debuffList)) {
    runtime.debuffObj.debuffList=[];
  }

  for (const key of [
    "alliancemerge",
    "alliancenewmail",
    "armyFormationMaxCount",
    "isHavaOfflineLvUp",
    "vipstoreLevel",
    "kingdomContribution"
  ]) {
    const n=Number(runtime[key]);
    runtime[key]=Number.isFinite(n)
      ? Math.max(0,Math.trunc(n))
      : defaults[key];
  }

  if (typeof runtime.buildRapidType!=="string") {
    runtime.buildRapidType=defaults.buildRapidType;
  }

  return runtime;
}

module.exports = {
  LAST_SHELTER_FRESH_INIT_ENVELOPE,
  freshInitEnvelopeRuntimeDefaultHazirla,
  freshInitEnvelopeRuntimeTeminEt
};
