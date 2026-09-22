"use strict";

// Last Shelter v1.250.102 Queue$QueueType decompile-dan birbasa cixarilib.
// enumOrdinal RDC daxili indeks deyil; reference enum sirasi-dir.
// code server/client persistence contract-dir. FREE_BUILDING qesden ordinal 37,
// amma code 100-dur.
const LAST_SHELTER_QUEUE_TYPES = Object.freeze([
  ["BUILDING", 0, 0],
  ["FOOT_SOLDIER", 1, 1],
  ["WAR_FORT", 2, 2],
  ["HOSPITAL", 3, 3],
  ["AFFAIRS", 4, 4],
  ["WORLD", 5, 5],
  ["SCIENCE", 6, 6],
  ["ALLIANCE_AFFAIRS", 7, 7],
  ["RIDE_SOLDIER", 8, 8],
  ["BOW_SOLDIER", 9, 9],
  ["CAR_SOLDIER", 10, 10],
  ["EQUIP", 11, 11],
  ["PROP", 12, 12],
  ["HELICOPTER", 13, 13],
  ["STATION_14", 14, 14],
  ["STATION_15", 15, 15],
  ["STATION_16", 16, 16],
  ["STATION_17", 17, 17],
  ["STATION_18", 18, 18],
  ["STATION_19", 19, 19],
  ["STATION_20", 20, 20],
  ["STATION_21", 21, 21],
  ["STATION_22", 22, 22],
  ["STATION_23", 23, 23],
  ["STATION_24", 24, 24],
  ["STATION_25", 25, 25],
  ["HIRE_ARM", 26, 26],
  ["MATERIAL", 27, 27],
  ["RESCUE_CENTER", 28, 28],
  ["MISSILE", 29, 29],
  ["SIEGE_HOSPITAL", 30, 30],
  ["QUEUE_TYPE31", 31, 31],
  ["QUEUE_TYPE32", 32, 32],
  ["QUEUE_TYPE33", 33, 33],
  ["ARMY_UPGRADE", 34, 34],
  ["DOMAIN_HOSPITAL", 35, 35],
  ["NEW_EQUIP_MATERIAL", 36, 36],
  ["FREE_BUILDING", 37, 100]
].map(([name, enumOrdinal, code]) => Object.freeze({ name, enumOrdinal, code })));

const BY_NAME = new Map(LAST_SHELTER_QUEUE_TYPES.map((entry) => [entry.name, entry]));
const BY_CODE = new Map(LAST_SHELTER_QUEUE_TYPES.map((entry) => [entry.code, entry]));

function getLastShelterQueueTypeByName(name) {
  return BY_NAME.get(String(name || "").toUpperCase()) || null;
}

function getLastShelterQueueTypeByCode(code) {
  const numericCode = Number(code);
  if (!Number.isInteger(numericCode)) return null;
  return BY_CODE.get(numericCode) || null;
}

function isLastShelterQueueCode(code) {
  return getLastShelterQueueTypeByCode(code) !== null;
}

module.exports = {
  LAST_SHELTER_QUEUE_TYPES,
  getLastShelterQueueTypeByName,
  getLastShelterQueueTypeByCode,
  isLastShelterQueueCode
};
