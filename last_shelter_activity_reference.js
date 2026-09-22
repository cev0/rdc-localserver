"use strict";

/*
 * Verified Last Shelter v1.250.102 activity rows observed in the reference
 * server init payload. These timestamps/ids are source data, not a new event
 * schedule. The server must not silently shift historical windows to "now".
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_ACTIVITY_REFERENCE = deepFreeze([
  { id:"57002" },
  {
    id:"57032",
    needMainCityLevel:0,
    startTime:1538031780000,
    endTime:1546170300000,
    activityInfo:{}
  },
  {
    id:"57041",
    needMainCityLevel:0,
    startTime:1520139600000,
    endTime:1524369600000,
    reward:[
      { type:7, value:{ num:1, id:"207081" } },
      { type:7, value:{ num:1, id:"207082" } },
      { type:7, value:{ num:1, id:"207083" } }
    ]
  },
  {
    id:"57061",
    needMainCityLevel:6,
    startTime:1519621200000,
    endTime:1521777600000
  },
  {
    id:"57059",
    popup:"0",
    needMainCityLevel:0,
    startTime:1463198400000,
    endTime:1463511600000,
    reward:[
      { type:7, value:{ num:1, id:"209005" } },
      { type:7, value:{ num:1, id:"209004" } },
      { type:7, value:{ num:1, id:"209007" } }
    ]
  },
  {
    id:"57063",
    needMainCityLevel:0,
    startTime:0,
    endTime:0
  },
  {
    id:"57067",
    popup:"0",
    needMainCityLevel:0,
    startTime:1526356800000,
    endTime:1529294400000,
    reward:[
      { type:7, value:{ num:1, id:"209005" } },
      { type:7, value:{ num:1, id:"209004" } },
      { type:7, value:{ num:1, id:"209007" } }
    ]
  },
  { id:"57087" },
  {
    id:"57089",
    rewardnum:1,
    needMainCityLevel:6
  },
  {
    id:"57121",
    popup:"0",
    needMainCityLevel:0,
    startTime:1537070400000,
    endTime:1537848000000
  },
  {
    id:"57127",
    popup:"0",
    needMainCityLevel:6,
    startTime:1543554000000,
    endTime:1545800400000,
    reward:[
      { type:7, value:{ num:1, id:"212112" } },
      { type:7, value:{ num:1, id:"212113" } },
      { type:7, value:{ num:1, id:"212114" } },
      { type:7, value:{ num:1, id:"212115" } }
    ]
  },
  {
    id:"57149",
    needMainCityLevel:6,
    startTime:1545973200000,
    endTime:1546750740000,
    reward:[
      { type:7, value:{ num:1, id:"212115" } },
      { type:7, value:{ num:1, id:"212113" } },
      { type:7, value:{ num:1, id:"212112" } },
      { type:7, value:{ num:1, id:"212114" } }
    ]
  }
]);

function clone(value) {
  return value == null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function activityReferenceAl(id) {
  const key =
    id == null
      ? ""
      : String(id).trim();

  const row =
    LAST_SHELTER_ACTIVITY_REFERENCE
      .find(item => item.id === key);

  return row
    ? clone(row)
    : null;
}

function activityReferenceProjectionHazirla() {
  return clone(
    LAST_SHELTER_ACTIVITY_REFERENCE
  );
}

module.exports = {
  LAST_SHELTER_ACTIVITY_REFERENCE,
  activityReferenceAl,
  activityReferenceProjectionHazirla
};
