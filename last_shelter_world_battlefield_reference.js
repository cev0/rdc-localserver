"use strict";

/*
 * Verified Last Shelter v1.250.102 world/battlefield reference recovered from
 * the real init payload. Raw k-fields are preserved without inventing units or
 * semantic labels that have not been independently verified.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_WORLD_CONFIG = deepFreeze({
  world_distance: { k1: "100" },
  world_marchtime: {
    k1: "0.82",
    k2: "120",
    k3: "3",
    k4: "20",
    k5: "10",
    k6: "0.2"
  },
  world_detect: {
    k1: "14",
    k2: "6",
    k3: "140"
  },
  worldmap_pvenum: {
    k1: "100",
    k2: "200",
    k3: "300",
    k4: "500",
    k5: "1000"
  },
  defenseValue: {
    k1: "1800",
    k2: "10",
    k3: "1800",
    k4: "200",
    k5: "30",
    k6: "3;1000",
    k7: "1",
    k8: "0.2",
    k9: "2",
    k10: "2"
  },
  recourse_refresh_num: 30,
  firstmass_range: {
    k1: "6",
    k2: "11",
    k3: "20"
  },
  day_and_night: {
    k1: "300000",
    k2: "3"
  }
});

const LAST_SHELTER_BATTLEFIELD_MAPS = deepFreeze([
  {
    ban_missile: "53303;53309;53310;53311;53312;53314",
    show: "0",
    range: "2",
    para1: "10",
    para2: "10",
    ban_goods: "200409;200410;200411;200412;200413;208017;208018;200424;200425",
    type: "1",
    limit_move: "0",
    random_xy: "601;605|607;599|595;599|601;593|599;607|605;601|593;601|599;595",
    size: "20",
    ban_skill: "650004;650006;650007;621900;625100;690002;650005;610700;690012;690013;612000;615100;650003;690005",
    sever_id: "45",
    id: "220100",
    buff: "1010;10;110054|1030;10;110055|1050;10;171792"
  },
  {
    regular_buff: "0;0;1;0;0|2;200;1;172566;172569|0;0;1;0;172568|3;150;1;172567;172570",
    ban_missile: "53303;53309;53310;53311;53312;53314",
    show: "1",
    range: "2",
    para2: "1600",
    ban_goods: "200409;200410;200411;200412;200413;208017;208018;200424;200425",
    type: "2",
    random_xy: "600;607|601;594",
    size: "20",
    ban_skill: "650004;650006;650007;621900;625100;690002;650005;610700;690012;690013;612000;615100;650003;690005",
    sever_id: "46",
    id: "220101",
    buff: "1010;10;110054|1030;10;110055|1050;10;171792",
    element: "220300;220301;220302;220303;220304"
  },
  {
    ban_missile: "53303;53309;53310",
    limit_speedup: "999999",
    random_xy: "607;607|593;593",
    size: "20",
    ban_skill: "650004;650006;650007;621900;625100;690002;650005;610700;690012;690013;612000;615100;650003;690005",
    sever_id: "45",
    show: "0",
    range: "4",
    id: "220102",
    type: "3",
    limit_move: "3"
  }
]);

const LAST_SHELTER_NEW_ACCOUNT_WORLD = deepFreeze({
  maxstamina: 100,
  stamina: 100,
  lyt: 0,
  cityDefValue: 500,
  ft: 0,
  userActMarchCntPerDay: 0,
  autoIncrDefLimitValue: 0,
  sheildCdTime: 0,
  gridType: 2,
  lastStaminaTimeSentinel: "9223372036854775807"
});

function rawSemiColonList(raw) {
  return typeof raw === "string" && raw.trim()
    ? raw.split(";").map(x => x.trim()).filter(Boolean)
    : [];
}

function battlefieldMapAl(id) {
  const key = id == null ? "" : String(id).trim();
  const found = LAST_SHELTER_BATTLEFIELD_MAPS.find(x => x.id === key);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

function battlefieldQadagalariniAl(id) {
  const row = battlefieldMapAl(id);
  if (!row) return null;
  return {
    id: row.id,
    bannedMissileIds: rawSemiColonList(row.ban_missile),
    bannedGoodIds: rawSemiColonList(row.ban_goods),
    bannedSkillIds: rawSemiColonList(row.ban_skill)
  };
}

function lastShelterWorldRuntimeDefaultHazirla() {
  return {
    ...LAST_SHELTER_NEW_ACCOUNT_WORLD,
    enemy: [],
    marches: [],
    point: null,
    lastCityDefTime: 0
  };
}

function lastShelterWorldRuntimeTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterWorldRuntime ||
    typeof state.lastShelterWorldRuntime !== "object" ||
    Array.isArray(state.lastShelterWorldRuntime)
  ) {
    state.lastShelterWorldRuntime =
      lastShelterWorldRuntimeDefaultHazirla();
  }

  const world = state.lastShelterWorldRuntime;
  if (!Array.isArray(world.enemy)) world.enemy = [];
  if (!Array.isArray(world.marches)) world.marches = [];

  return world;
}

module.exports = {
  LAST_SHELTER_WORLD_CONFIG,
  LAST_SHELTER_BATTLEFIELD_MAPS,
  LAST_SHELTER_NEW_ACCOUNT_WORLD,
  rawSemiColonList,
  battlefieldMapAl,
  battlefieldQadagalariniAl,
  lastShelterWorldRuntimeDefaultHazirla,
  lastShelterWorldRuntimeTeminEt
};
