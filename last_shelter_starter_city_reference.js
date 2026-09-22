"use strict";

const crypto = require("crypto");

/*
 * Verified Last Shelter v1.250.102 fresh-account city/building snapshot.
 *
 * Dynamic UUIDs are not copied from the captured account. Raw
 * unlock_num/next_unlock_num strings are preserved exactly. The reference
 * payload itself contains "600003;0600004;0"; it is reported malformed rather
 * than silently repaired.
 */

const CURRENT_UNLOCK_NUM_RAW = "413000;0|412000;0|414000;0|415000;1|432000;1|431000;0|433000;1|434000;0|447000;0|444000;0|439000;0|520000;0|521000;0|442000;0|522000;0|523000;0|441000;0|524000;0|525000;0|440000;0|526000;0|527000;0|438000;0|528000;0|529000;0|437000;0|530000;0|531000;0|436000;0|443000;1|477000;0|478000;0|479000;0|480000;0|481000;0|482000;0|445000;0|435000;0|403000;0|448000;0|460000;1|428000;0|417000;0|418000;0|401000;0|402000;0|407000;0|483000;0|484000;0|485000;0|446000;0|486000;0|488000;0|489000;0|532000;0|533000;0|535000;0|411000;0|410000;0|427000;0|451000;0|452000;0|416000;0|423000;0|424000;0|425000;0|426000;0|449000;0|450000;0|464000;0|465000;0|466000;0|469000;0|472000;0|537000;0|538000;0|539000;0|540000;0|541000;0|467000;0|468000;0|542000;0|543000;0|544000;0|545000;0|546000;0|429000;0|461000;0|462000;0|547000;0|487000;0|536000;0|600001;0|600002;0|600003;0600004;0|600005;0|600006;0|600007;0|600008;0|600009;0";
const NEXT_UNLOCK_NUM_RAW = "413000;2|412000;0|414000;0|415000;2|432000;1|431000;1|433000;1|434000;0|447000;1|444000;1|439000;0|520000;0|521000;0|442000;0|522000;0|523000;0|441000;0|524000;0|525000;0|440000;0|526000;0|527000;0|438000;0|528000;0|529000;0|437000;0|530000;0|531000;0|436000;0|443000;1|477000;0|478000;0|479000;0|480000;1|481000;1|482000;1|445000;1|435000;0|403000;0|448000;1|460000;1|428000;0|417000;0|418000;1|401000;0|402000;0|407000;0|483000;0|484000;0|485000;0|446000;0|486000;0|488000;0|489000;0|532000;0|533000;0|535000;0|411000;1|410000;0|427000;0|451000;0|452000;0|416000;0|423000;1|424000;0|425000;0|426000;0|449000;0|450000;0|464000;0|465000;0|466000;0|469000;0|472000;0|537000;0|538000;0|539000;0|540000;0|541000;0|467000;0|468000;0|542000;0|543000;0|544000;0|545000;0|546000;0|429000;0|461000;0|462000;0|547000;0|487000;0|536000;0|600001;0|600002;0|600003;0600004;0|600005;0|600006;0|600007;0|600008;0|600009;0";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_STARTER_BUILDINGS = deepFreeze([
  {
    buildActiveTime:-1, opType:0, para1:"1", type:1,
    building:"400000;2", pos:0, destroy_time:1, onlyPlace:false,
    wood:0, power:50, exp:0, connect:1, level:1,
    electricity:0, water:0, food:0, stone:0,
    nextLevelParas:"1", itemId:"443000", money:0, is_stationed:0,
    x:33, iron:0, y:29, silver:0, time:1
  },
  {
    para8:"0", unlock_num:CURRENT_UNLOCK_NUM_RAW, para9:"0",
    buildActiveTime:-1, opType:0, para1:"3000;11000", para2:"1",
    para4:"239100", next_unlock_num:NEXT_UNLOCK_NUM_RAW,
    para5:"0;0;0;0", building:"460000;1|433000;1", para6:"30",
    pos:0, para10:"5000;5000;5000;5000;2000", destroy_time:1,
    onlyPlace:false, wood:0, power:2323, exp:0, connect:1, level:1,
    electricity:0, next_population:"180", water:0, food:0, stone:0,
    population:"0",
    nextLevelParas:"3000;11000,1,,239100,0;0;0;0,30,,0,0,5000;5000;5000;5000;2000",
    itemId:"400000", money:0, is_stationed:0, x:32, iron:0, y:32,
    silver:0, time:1
  }
]);

const LAST_SHELTER_BUILD_LIST_CONFIG = deepFreeze([
  { para1:212004, para2:600, id:600000 },
  { para1:212004, para2:200, id:600001 },
  { para1:212004, para2:10, id:600002 },
  { para1:212004, para2:10, id:600003 },
  { para1:212004, para2:300, id:600004 },
  { para1:212004, para2:80, id:600005 },
  { para1:212102, para2:300, id:600006 },
  { para1:212101, para2:100, id:600007 },
  { para1:212004, para2:300, id:600008 },
  { para1:212004, para2:300, id:600009 }
]);

function unlockNumParseEt(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { entries:[], malformed:[] };

  const entries = [];
  const malformed = [];

  for (const token of text.split("|")) {
    const part = token.trim();
    if (!part) continue;
    const fields = part.split(";");

    if (
      fields.length !== 2 ||
      !/^\d+$/.test(fields[0]) ||
      !/^\d+$/.test(fields[1])
    ) {
      malformed.push(part);
      continue;
    }

    entries.push({
      buildingTypeId: fields[0],
      count: Number(fields[1])
    });
  }

  return { entries, malformed };
}

function uuid32Hazirla(uuidFactory) {
  if (typeof uuidFactory === "function") {
    const value = String(uuidFactory()).trim();
    if (value) return value;
  }
  return crypto.randomBytes(16).toString("hex");
}

function starterCityRuntimeHazirla(uuidFactory) {
  return {
    buildings: LAST_SHELTER_STARTER_BUILDINGS.map(row => ({
      ...row,
      uuid: uuid32Hazirla(uuidFactory)
    })),
    buildListConfig: LAST_SHELTER_BUILD_LIST_CONFIG.map(row => ({ ...row }))
  };
}

function lastShelterCityRuntimeTeminEt(state, uuidFactory) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterCityRuntime ||
    typeof state.lastShelterCityRuntime !== "object" ||
    Array.isArray(state.lastShelterCityRuntime)
  ) {
    state.lastShelterCityRuntime = starterCityRuntimeHazirla(uuidFactory);
  }

  const city = state.lastShelterCityRuntime;
  if (!Array.isArray(city.buildings)) city.buildings = [];
  if (!Array.isArray(city.buildListConfig)) {
    city.buildListConfig = LAST_SHELTER_BUILD_LIST_CONFIG.map(row => ({ ...row }));
  }

  return city;
}

module.exports = {
  CURRENT_UNLOCK_NUM_RAW,
  NEXT_UNLOCK_NUM_RAW,
  LAST_SHELTER_STARTER_BUILDINGS,
  LAST_SHELTER_BUILD_LIST_CONFIG,
  unlockNumParseEt,
  starterCityRuntimeHazirla,
  lastShelterCityRuntimeTeminEt
};
