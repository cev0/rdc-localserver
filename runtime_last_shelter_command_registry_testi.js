"use strict";
const assert=require("assert");
const {lastShelterItemCommandleriniQeydEt}=require("./runtime_last_shelter_item_commands");
const {lastShelterTutorialCommandiniQeydEt}=require("./runtime_last_shelter_tutorial_command");
const {lastShelterWorldCupCommandleriniQeydEt}=require("./runtime_last_shelter_worldcup_commands");
const {lastShelterResourceCommandiniQeydEt}=require("./runtime_last_shelter_resource_command");
const {lastShelterEconomyReferenceCommandleriniQeydEt}=require("./runtime_last_shelter_economy_reference_commands");
const {lastShelterEngagementCommandleriniQeydEt}=require("./runtime_last_shelter_engagement_commands");
const {lastShelterMissionCommandleriniQeydEt}=require("./runtime_last_shelter_mission_commands");
const {lastShelterBuildingReferenceCommandleriniQeydEt}=require("./runtime_last_shelter_building_reference_commands");
const {lastShelterQueueScienceCommandleriniQeydEt}=require("./runtime_last_shelter_queue_science_commands");
const {lastShelterTroopReferenceCommandleriniQeydEt}=require("./runtime_last_shelter_troop_reference_commands");
const {lastShelterInitCommandiniQeydEt}=require("./runtime_last_shelter_init_command");
const {lastShelterAuxiliaryCommandleriniQeydEt}=require("./runtime_last_shelter_auxiliary_reference_commands");

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
lastShelterMissionCommandleriniQeydEt(router,{getOrCreatePlayerState});
lastShelterBuildingReferenceCommandleriniQeydEt(router);
lastShelterQueueScienceCommandleriniQeydEt(router,{getOrCreatePlayerState});
lastShelterTroopReferenceCommandleriniQeydEt(router);
// Production server installs hero and auxiliary routes through the Last Shelter init registrar.
lastShelterInitCommandiniQeydEt(router,{getOrCreatePlayerState,ensureFreshPlayerState:async()=>state,updateServerTime:()=>{}});

const expected=[
  "item.buy","settutorial","worldcup.list","worldcup.get","synuserresource",
  "activity.list","activity.get","shop.list","shop.get","repay.info",
  "fresh_init.envelope.info","starter_city.info","troop.reference.list","troop.reference.get","resource.info","item.tuning.list","item.tuning.get","starter_account.info","goods.structure.list","goods.structure.get","store.reward.get","store.reward.catalog","alliance.group_purchase.info","alliance.group_purchase.offer","vipstore.panel",
  "engagement.info","engagement.online_duration.get","engagement.helicopter.task.get","mission.info","building.catalog.level","building.reference.list","building.reference.get",
  "queue.list","science.catalog","science.topology.list","science.topology","science.state",
  "science.prerequisite","science.plan","science.directly","science.research","science.upgrade","troop.catalog","troop.get",
  "troop.transfer.level6","troop.transfer.type","troop.transfer.point","hero.info","hero.get","hero.general.list","hero.general.get","alliance.group_purchase.offer.get","fort.troop.list","fort.troop.get","troop_transfer.state","troop_transfer.reference.list","troop_transfer.reference.get","shop.reference.list","vip_store.info","activity.reference.list","activity.reference.get","missile.info","seven_days.info","truck.info","world.info","battlefield.get","last_shelter.init"
];

assert.deepStrictEqual([...router.routes.keys()].sort(),expected.sort());
assert.strictEqual(new Set(router.routes.keys()).size,router.routes.size);
console.log("PASS: all Last Shelter runtime command modules register together without route collisions.");
