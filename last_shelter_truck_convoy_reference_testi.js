"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_STARTER_TRUCK,
  truckRuntimeDefaultHazirla,
  starterTruckBuildingUuidAl,
  lastShelterTruckRuntimeTeminEt,
  initTruckProjectionHazirla
} = require("./last_shelter_truck_convoy_reference");

assert.deepStrictEqual(LAST_SHELTER_STARTER_TRUCK, {
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

assert.strictEqual(
  Object.prototype.hasOwnProperty.call(LAST_SHELTER_STARTER_TRUCK,"buuid"),
  false,
  "Captured account building UUID must not become static configuration."
);

const state = {
  lastShelterCityRuntime:{
    buildings:[
      { itemId:"400000", uuid:"hq-u" },
      { itemId:"443000", uuid:"truck-building-u" }
    ]
  }
};

assert.strictEqual(starterTruckBuildingUuidAl(state),"truck-building-u");

const runtime = lastShelterTruckRuntimeTeminEt(state);
assert.strictEqual(runtime.buildingUuid,"truck-building-u");
assert.strictEqual(runtime.endX,0);
assert.strictEqual(runtime.endY,0);
assert.strictEqual(runtime.endTime,0);

assert.deepStrictEqual(initTruckProjectionHazirla(state), [{
  repair:0.05,
  development:0.05,
  roadSpeed:2,
  buuid:"truck-building-u",
  type:0,
  building:0.05,
  desertSpeed:2,
  endY:0,
  saving:0.05,
  endX:0,
  load:1000,
  unloadTime:3000,
  id:1,
  endTime:0,
  xmlId:"20001001",
  aid:0.05,
  fight:0.05
}]);

runtime.endX = 12;
runtime.endY = 34;
runtime.endTime = 9999;
assert.deepStrictEqual(
  initTruckProjectionHazirla(state)[0],
  {
    repair:0.05,
    development:0.05,
    roadSpeed:2,
    buuid:"truck-building-u",
    type:0,
    building:0.05,
    desertSpeed:2,
    endY:34,
    saving:0.05,
    endX:12,
    load:1000,
    unloadTime:3000,
    id:1,
    endTime:9999,
    xmlId:"20001001",
    aid:0.05,
    fight:0.05
  }
);

assert.deepStrictEqual(
  truckRuntimeDefaultHazirla("b1"),
  {
    id:1,xmlId:"20001001",type:0,buildingUuid:"b1",
    roadSpeed:2,desertSpeed:2,load:1000,unloadTime:3000,
    repair:0.05,development:0.05,building:0.05,saving:0.05,
    aid:0.05,fight:0.05,endX:0,endY:0,endTime:0
  }
);

console.log("PASS: verified Last Shelter starter truck/convoy projection is preserved.");
