"use strict";

/*
 * Verified Last Shelter v1.250.102 fresh-account truck/convoy projection.
 *
 * The captured buuid is building-instance state, not configuration, and is
 * deliberately omitted. No route-duration or convoy combat formula is guessed.
 */

const LAST_SHELTER_STARTER_TRUCK = Object.freeze({
  id:1,
  xmlId:"20001001",
  type:0,
  roadSpeed:2,
  desertSpeed:2,
  load:1000,
  unloadTime:3000,
  repair:0.05,
  development:0.05,
  building:0.05,
  saving:0.05,
  aid:0.05,
  fight:0.05
});

function truckRuntimeDefaultHazirla(buildingUuid = "") {
  return {
    id:LAST_SHELTER_STARTER_TRUCK.id,
    xmlId:LAST_SHELTER_STARTER_TRUCK.xmlId,
    type:LAST_SHELTER_STARTER_TRUCK.type,
    buildingUuid:String(buildingUuid || ""),
    roadSpeed:LAST_SHELTER_STARTER_TRUCK.roadSpeed,
    desertSpeed:LAST_SHELTER_STARTER_TRUCK.desertSpeed,
    load:LAST_SHELTER_STARTER_TRUCK.load,
    unloadTime:LAST_SHELTER_STARTER_TRUCK.unloadTime,
    repair:LAST_SHELTER_STARTER_TRUCK.repair,
    development:LAST_SHELTER_STARTER_TRUCK.development,
    building:LAST_SHELTER_STARTER_TRUCK.building,
    saving:LAST_SHELTER_STARTER_TRUCK.saving,
    aid:LAST_SHELTER_STARTER_TRUCK.aid,
    fight:LAST_SHELTER_STARTER_TRUCK.fight,
    endX:0,
    endY:0,
    endTime:0
  };
}

function starterTruckBuildingUuidAl(state) {
  const city =
    state &&
    state.lastShelterCityRuntime;

  if (!city || !Array.isArray(city.buildings)) return "";

  const row = city.buildings.find(x => String(x.itemId) === "443000");
  return row && row.uuid ? String(row.uuid) : "";
}

function lastShelterTruckRuntimeTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterTruckRuntime ||
    typeof state.lastShelterTruckRuntime !== "object" ||
    Array.isArray(state.lastShelterTruckRuntime)
  ) {
    state.lastShelterTruckRuntime =
      truckRuntimeDefaultHazirla(
        starterTruckBuildingUuidAl(state)
      );
  }

  const truck = state.lastShelterTruckRuntime;

  if (!truck.buildingUuid) {
    truck.buildingUuid =
      starterTruckBuildingUuidAl(state);
  }

  return truck;
}

function initTruckProjectionHazirla(state) {
  const truck = lastShelterTruckRuntimeTeminEt(state);
  if (!truck) return [];

  return [{
    repair:truck.repair,
    development:truck.development,
    roadSpeed:truck.roadSpeed,
    buuid:truck.buildingUuid,
    type:truck.type,
    building:truck.building,
    desertSpeed:truck.desertSpeed,
    endY:truck.endY,
    saving:truck.saving,
    endX:truck.endX,
    load:truck.load,
    unloadTime:truck.unloadTime,
    id:truck.id,
    endTime:truck.endTime,
    xmlId:truck.xmlId,
    aid:truck.aid,
    fight:truck.fight
  }];
}

module.exports = {
  LAST_SHELTER_STARTER_TRUCK,
  truckRuntimeDefaultHazirla,
  starterTruckBuildingUuidAl,
  lastShelterTruckRuntimeTeminEt,
  initTruckProjectionHazirla
};
