"use strict";

const assert=require("assert");
const {
  LAST_SHELTER_TROOP_CLASS_REFERENCE,
  troopRequirementAl
}=require("./last_shelter_troop_building_reference");
const {
  rdcBuildingTypeIdAl,
  buildingTypeMaxLevelAl
}=require("./last_shelter_building_kataloqu");

assert.strictEqual(LAST_SHELTER_TROOP_CLASS_REFERENCE.warrior.buildingTypeId,"423000");
assert.strictEqual(LAST_SHELTER_TROOP_CLASS_REFERENCE.vehicle.buildingTypeId,"424000");
assert.strictEqual(LAST_SHELTER_TROOP_CLASS_REFERENCE.shooter.buildingTypeId,"425000");

assert.strictEqual(rdcBuildingTypeIdAl("fighter_camp"),"423000");
assert.strictEqual(rdcBuildingTypeIdAl("vehicle_factory"),"424000");
assert.strictEqual(rdcBuildingTypeIdAl("shooter_camp"),"425000");

const expectedLevels=[1,2,5,10,13,16,19,22,25,30];

for(const [classId,prefix] of [["warrior","1070"],["vehicle","1071"],["shooter","1072"]]){
  const classRef=LAST_SHELTER_TROOP_CLASS_REFERENCE[classId];
  assert.strictEqual(classRef.requirements.length,10);

  for(let tier=1;tier<=10;tier+=1){
    const armyId=prefix+String(tier-1).padStart(2,"0");
    const requirement=troopRequirementAl(armyId);
    assert.ok(requirement);
    assert.strictEqual(requirement.buildingTypeId,classRef.buildingTypeId);
    assert.strictEqual(requirement.requiredBuildingLevel,expectedLevels[tier-1]);

    if(tier<=8) assert.strictEqual(requirement.scienceId,"");
    else assert.match(requirement.scienceId,/^\d+$/);
  }

  assert.ok(buildingTypeMaxLevelAl(classRef.buildingTypeId)>=30);
}

assert.strictEqual(troopRequirementAl("107008").scienceId,"973400");
assert.strictEqual(troopRequirementAl("107009").scienceId,"973700");
assert.strictEqual(troopRequirementAl("107108").scienceId,"971400");
assert.strictEqual(troopRequirementAl("107109").scienceId,"971700");

console.log("PASS: original arms catalog owns troop training building, level and science requirements.");
