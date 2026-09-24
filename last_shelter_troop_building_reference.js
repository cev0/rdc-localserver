"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

const CLASS_SPECS = Object.freeze({
  warrior:Object.freeze({classId:"warrior",armyPrefix:"1070",legacyBuildingAlias:"fighter_camp"}),
  vehicle:Object.freeze({classId:"vehicle",armyPrefix:"1071",legacyBuildingAlias:"vehicle_factory"}),
  shooter:Object.freeze({classId:"shooter",armyPrefix:"1072",legacyBuildingAlias:"shooter_camp"})
});

function buildingRequirementParseEt(raw) {
  const value=String(raw==null?"":raw).trim();
  if(!/^4\d{5}$/.test(value)) return null;

  const buildingTypeId=value.slice(0,3)+"000";
  const requiredBuildingLevel=Number(value.slice(3));

  if(!Number.isInteger(requiredBuildingLevel)||requiredBuildingLevel<=0) return null;

  return {
    buildingRequirementId:value,
    buildingTypeId,
    requiredBuildingLevel
  };
}

const requirementsByArmyId={};
const classReference={};

for(const spec of Object.values(CLASS_SPECS)){
  const requirements=[];

  for(let tier=1;tier<=10;tier+=1){
    const armyId=spec.armyPrefix+String(tier-1).padStart(2,"0");
    const row=sourceCatalog.row("arms",armyId,["arms"]);

    if(!row) throw new Error("Original arms source row yoxdur: "+armyId);

    const building=buildingRequirementParseEt(row.building);
    if(!building) throw new Error("Original troop building requirement etibarsizdir: "+armyId);

    const requirement=Object.freeze({
      armyId,
      tier,
      buildingRequirementId:building.buildingRequirementId,
      buildingTypeId:building.buildingTypeId,
      requiredBuildingLevel:building.requiredBuildingLevel,
      scienceId:row.science==null?"":String(row.science).trim()
    });

    requirements.push(requirement);
    requirementsByArmyId[armyId]=requirement;
  }

  const buildingTypes=new Set(requirements.map(row=>row.buildingTypeId));
  if(buildingTypes.size!==1){
    throw new Error("Troop family birden cox training building type istifadə edir: "+spec.classId);
  }

  classReference[spec.classId]=Object.freeze({
    ...spec,
    buildingTypeId:requirements[0].buildingTypeId,
    requirements:Object.freeze(requirements)
  });
}

sourceCatalog.release("arms");

const LAST_SHELTER_TROOP_CLASS_REFERENCE=Object.freeze(classReference);
const LAST_SHELTER_TROOP_REQUIREMENTS=Object.freeze(requirementsByArmyId);

function troopClassReferenceAl(classId){
  const id=typeof classId==="string"?classId.trim().toLowerCase():"";
  return LAST_SHELTER_TROOP_CLASS_REFERENCE[id]||null;
}

function troopRequirementAl(armyId){
  const id=typeof armyId==="string"?armyId.trim():"";
  return LAST_SHELTER_TROOP_REQUIREMENTS[id]||null;
}

function troopBuildingRequiredMaxLevelAl(buildingTypeId){
  const id=String(buildingTypeId==null?"":buildingTypeId).trim();

  for(const classRef of Object.values(LAST_SHELTER_TROOP_CLASS_REFERENCE)){
    if(classRef.buildingTypeId!==id) continue;
    return Math.max(
      0,
      ...classRef.requirements.map(row=>Number(row.requiredBuildingLevel)||0)
    );
  }

  return 0;
}

module.exports={
  CLASS_SPECS,
  LAST_SHELTER_TROOP_CLASS_REFERENCE,
  LAST_SHELTER_TROOP_REQUIREMENTS,
  buildingRequirementParseEt,
  troopClassReferenceAl,
  troopRequirementAl,
  troopBuildingRequiredMaxLevelAl
};
