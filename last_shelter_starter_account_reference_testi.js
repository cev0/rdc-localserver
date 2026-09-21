"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_STARTER_ITEM_TEMPLATES,
  LAST_SHELTER_STARTER_QUEUE_LAYOUT,
  starterItemsHazirla,
  starterQueueRuntimeHazirla,
  starterQueueInitProjectionHazirla,
  lastShelterStarterAccountRuntimeDefaultHazirla,
  lastShelterStarterAccountRuntimeTeminEt
} = require("./last_shelter_starter_account_reference");

assert.deepStrictEqual(LAST_SHELTER_STARTER_ITEM_TEMPLATES,[
  {itemId:"200200",use:"0",count:1,para1:"1",para2:"1",para3:"3600"},
  {itemId:"200201",use:"0",count:3,para1:"1",para2:"1",para3:"300"}
]);

assert.strictEqual(LAST_SHELTER_STARTER_QUEUE_LAYOUT.length,12);
assert.deepStrictEqual(
  LAST_SHELTER_STARTER_QUEUE_LAYOUT.map(x => [x.typeCode,x.qid]),
  [[3,1],[26,1],[0,3],[11,1],[6,2],[36,1],[0,2],[0,1],[28,1],[13,1],[1,1],[29,1]]
);
assert.deepStrictEqual(
  LAST_SHELTER_STARTER_QUEUE_LAYOUT.filter(x => x.observedEndTime > 0).map(x => [x.typeCode,x.qid]),
  [[0,3],[6,2],[0,2]]
);

let seq=0;
const uuid=()=> "u-" + (++seq);
const items=starterItemsHazirla(uuid);
assert.deepStrictEqual(items.map(x=>x.uuid),["u-1","u-2"]);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(LAST_SHELTER_STARTER_ITEM_TEMPLATES[0],"uuid"),
  false
);

const queues=starterQueueRuntimeHazirla(uuid);
assert.strictEqual(queues.length,12);
assert.strictEqual(queues[0].typeName,"HOSPITAL");
assert.strictEqual(queues[1].typeName,"HIRE_ARM");
assert.strictEqual(queues[2].typeName,"BUILDING");
assert.strictEqual(queues[4].typeName,"SCIENCE");
assert.strictEqual(queues[5].typeName,"NEW_EQUIP_MATERIAL");
assert.strictEqual(queues[8].typeName,"RESCUE_CENTER");
assert.strictEqual(queues[9].typeName,"HELICOPTER");
assert.strictEqual(queues[10].typeName,"FOOT_SOLDIER");
assert.strictEqual(queues[11].typeName,"MISSILE");

for(const q of queues){
  assert.strictEqual(q.startTime,0);
  assert.strictEqual(q.updateTime,0);
  assert.strictEqual(q.endTime,0);
  assert.deepStrictEqual(q.itemObj,{});
  assert.strictEqual(q.isHelped,0);
}

const projection=starterQueueInitProjectionHazirla(queues);
assert.strictEqual(projection.length,12);
assert.strictEqual(projection[4].type,6);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(projection[4],"typeName"),
  false
);

seq=0;
const runtime=lastShelterStarterAccountRuntimeDefaultHazirla(uuid);
assert.strictEqual(runtime.items.length,2);
assert.strictEqual(runtime.queues.length,12);
assert.deepStrictEqual(runtime.finishedQueue,[]);

const state={};
const first=lastShelterStarterAccountRuntimeTeminEt(state,()=> "stable");
first.items[0].count=9;
const second=lastShelterStarterAccountRuntimeTeminEt(state,()=> "other");
assert.strictEqual(first,second);
assert.strictEqual(second.items[0].count,9);

console.log("PASS: Last Shelter starter item inventory and 12-slot queue layout are preserved without replaying stale UUID/timestamps.");
