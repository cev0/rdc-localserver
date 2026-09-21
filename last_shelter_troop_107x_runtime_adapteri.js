"use strict";

const { TROOP_107X, troop107xAl } = require("./last_shelter_troop_107x_reference");

/*
 * Runtime bridge from verified Last Shelter init.army rows into the RDC troop
 * shape. It projects only rows admitted to the verified reference catalog;
 * unlock/building rules remain outside this adapter until their source
 * handlers/config are verified.
 *
 * Important: Last Shelter's payload field is `attack`; legacy RDC calls the
 * corresponding stat `attackSpeed`. Keep both names in the projection so new
 * server-authoritative battle code can consume the reference semantic without
 * silently changing the existing Unity contract.
 */

function lastShelterArmyIdFromRdcUnit(unit) {
  if (!unit || typeof unit !== "object") return "";
  return String(unit.lastShelterArmyId == null ? "" : unit.lastShelterArmyId).trim();
}

function verified107xProjection(armyId) {
  const row = troop107xAl(armyId);
  if (!row) return null;

  return Object.freeze({
    lastShelterArmyId: String(armyId),
    baseTrainingSeconds: row.time,
    costPerUnit: Object.freeze([
      ...(row.food > 0 ? [{ type: "food", amount: row.food }] : []),
      ...(row.wood > 0 ? [{ type: "wood", amount: row.wood }] : []),
      ...(row.stone > 0 ? [{ type: "stone", amount: row.stone }] : []),
      ...(row.iron > 0 ? [{ type: "iron", amount: row.iron }] : [])
    ].map(Object.freeze)),
    stats: Object.freeze({
      attack: row.attack,
      attackSpeed: row.attack,
      defense: row.defen,
      hp: row.health,
      battlePower: row.power,
      marchSpeed: row.speed,
      move: row.move,
      range: row.range,
      march: row.march,
      loadCapacity: row.load,
      upkeep: row.upkeep,
      healResource: row.heal_res,
      healTime: row.heal_time
    })
  });
}

function applyVerified107xToRdcUnit(unit) {
  const armyId = lastShelterArmyIdFromRdcUnit(unit);
  const verified = verified107xProjection(armyId);
  if (!verified) return unit || null;

  return Object.freeze({
    ...unit,
    lastShelterArmyId: verified.lastShelterArmyId,
    baseTrainingSeconds: verified.baseTrainingSeconds,
    costPerUnit: verified.costPerUnit,
    stats: Object.freeze({
      ...(unit && unit.stats ? unit.stats : {}),
      ...verified.stats,
      consumption: Object.freeze({ resourceId: "food", amount: verified.stats.upkeep })
    }),
    lastShelterVerified: true
  });
}

function applyVerified107xBatch(units) {
  if (!Array.isArray(units)) return [];
  return units.map(applyVerified107xToRdcUnit);
}

function verified107xIds() {
  return Object.keys(TROOP_107X);
}

module.exports = {
  lastShelterArmyIdFromRdcUnit,
  verified107xProjection,
  applyVerified107xToRdcUnit,
  applyVerified107xBatch,
  verified107xIds
};
