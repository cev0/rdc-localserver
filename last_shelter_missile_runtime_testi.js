"use strict";

const assert=require("assert");
const {
  rowRuntimeHazirla,
  lastShelterMissileRuntimeDefaultHazirla,
  lastShelterMissileRuntimeTeminEt,
  missileInitProjectionHazirla
}=require("./last_shelter_missile_runtime");

const defaults=lastShelterMissileRuntimeDefaultHazirla();
assert.strictEqual(defaults.missiles.length,6);
assert.deepStrictEqual(
  defaults.missiles.map(x=>x.missileId),
  ["53301","53302","53303","53304","53305","53306"]
);
assert.strictEqual(defaults.missiles[0].totalNum,0);
assert.strictEqual(defaults.missiles[0].unlock,true);
assert.strictEqual(defaults.missiles[0].item_need,"212007;800");

const state={
  lastShelterMissileRuntime:{
    missiles:[
      {
        missileId:"53301",
        totalNum:7,
        unReceive:2,
        lastLaunchTime:12345,
        unlockFlag:3,
        unlock:false,
        plugin:"p",
        money:1,
        electricity:1,
        item_need:"wrong"
      },
      {missileId:"53399",totalNum:999}
    ]
  }
};
const runtime=lastShelterMissileRuntimeTeminEt(state);
assert.strictEqual(runtime.missiles.length,6);
const first=runtime.missiles.find(x=>x.missileId==="53301");
assert.strictEqual(first.totalNum,7);
assert.strictEqual(first.unReceive,2);
assert.strictEqual(first.lastLaunchTime,12345);
assert.strictEqual(first.unlockFlag,3);
assert.strictEqual(first.unlock,false);
assert.strictEqual(first.plugin,"p");

// Static source-authoritative values overwrite stale/legacy runtime config.
assert.strictEqual(first.money,1000000);
assert.strictEqual(first.electricity,2500000);
assert.strictEqual(first.item_need,"212007;800");
assert.strictEqual(runtime.missiles.some(x=>x.missileId==="53399"),false);

assert.deepStrictEqual(
  rowRuntimeHazirla("53306",{}),
  {
    unlockFlag:0,
    missileId:"53306",
    unlock:true,
    plugin:"",
    money:100000,
    electricity:250000,
    water:100000,
    time:720,
    item_need:"212007;80",
    totalNum:0,
    unReceive:0,
    lastLaunchTime:0
  }
);

const projection=missileInitProjectionHazirla(state);
projection[0].totalNum=1000;
assert.strictEqual(state.lastShelterMissileRuntime.missiles[0].totalNum,7);
assert.strictEqual(rowRuntimeHazirla("53399",{}),null);

console.log("PASS: Last Shelter active missile runtime preserves mutable state while enforcing v1.250.102 static config.");
