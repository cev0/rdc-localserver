"use strict";

const assert=require("assert");
const {lastShelterItemCommandleriniQeydEt}=require("./runtime_last_shelter_item_commands");
const {lastShelterTutorialCommandiniQeydEt}=require("./runtime_last_shelter_tutorial_command");
const {lastShelterWorldCupCommandleriniQeydEt}=require("./runtime_last_shelter_worldcup_commands");
const {lastShelterResourceCommandiniQeydEt}=require("./runtime_last_shelter_resource_command");
const {lastShelterEconomyReferenceCommandleriniQeydEt}=require("./runtime_last_shelter_economy_reference_commands");
const {lastShelterEngagementCommandleriniQeydEt}=require("./runtime_last_shelter_engagement_commands");
const {lastShelterBuildingReferenceCommandleriniQeydEt}=require("./runtime_last_shelter_building_reference_commands");
const {lastShelterQueueScienceCommandleriniQeydEt}=require("./runtime_last_shelter_queue_science_commands");
const {lastShelterTroopReferenceCommandleriniQeydEt}=require("./runtime_last_shelter_troop_reference_commands");
const {lastShelterInitCommandiniQeydEt}=require("./runtime_last_shelter_init_command");

class StrictRouter {
  constructor(){this.routes=new Map();}
  register(type,handler,options){
    const key=String(type||"").trim().toLowerCase();
    if(!key) throw new Error("empty route");
    if(this.routes.has(key)) throw new Error("duplicate route: "+key);
    assert.strictEqual(typeof handler,"function",key);
    this.routes.set(key,{handler,options});
    return this;
  }
}

const state={};
const getOrCreatePlayerState=()=>state;
const router=new StrictRouter();
lastShelterItemCommandleriniQeydEt(router,{getOrCreatePlayerState});
lastShelterTutorialCommandiniQeydEt(router,{getOrCreatePlayerState});
lastShelterWorldCupCommandleriniQeydEt(router);
lastShelterResourceCommandiniQeydEt(router,{getOrCreatePlayerState});
lastShelterEconomyReferenceCommandleriniQeydEt(router,{getOrCreatePlayerState});
lastShelterEngagementCommandleriniQeydEt(router,{getOrCreatePlayerState});
lastShelterBuildingReferenceCommandleriniQeydEt(router);
lastShelterQueueScienceCommandleriniQeydEt(router,{getOrCreatePlayerState});
lastShelterTroopReferenceCommandleriniQeydEt(router);
lastShelterInitCommandiniQeydEt(router,{getOrCreatePlayerState,ensureFreshPlayerState:async()=>state,updateServerTime:()=>{}});

const expected=[
  "item.buy","settutorial","worldcup.list","worldcup.get","synuserresource",
  "activity.list","activity.get","shop.list","shop.get","repay.info",
  "alliance.group_purchase.info","alliance.group_purchase.offer","vipstore.panel",
  "engagement.info","building.reference.list","building.reference.get",
  "queue.list","science.catalog","science.topology.list","science.topology","science.state",
  "science.prerequisite","science.plan","troop.catalog","troop.get",
  "troop.transfer.level6","troop.transfer.type","troop.transfer.point","last_shelter.init"
];

assert.deepStrictEqual([...router.routes.keys()].sort(),expected.sort());
assert.strictEqual(new Set(router.routes.keys()).size,router.routes.size);
console.log("PASS: all Last Shelter runtime command modules register together without route collisions.");
