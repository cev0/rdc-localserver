"use strict";

const assert = require("assert");
const { TROOP_107X } = require("./last_shelter_troop_107x_reference");
const {
  verified107xProjection,
  applyVerified107xToRdcUnit,
  applyVerified107xBatch,
  verified107xIds
} = require("./last_shelter_troop_107x_runtime_adapteri");

const ids = verified107xIds();
assert.deepStrictEqual(ids, ["107000","107001","107002","107003","107004","107005","107006","107007","107008","107009","107019","107100","107101","107102","107103","107104","107105","107106","107107","107108","107109","107119","107200","107201","107202","107203","107204","107205","107206","107207","107208","107209","107219"]);

for (const id of ids) {
  const source = TROOP_107X[id];
  const projection = verified107xProjection(id);
  assert(projection, `missing projection ${id}`);
  assert.strictEqual(projection.baseTrainingSeconds, source.time);
  assert.strictEqual(projection.stats.attack, source.attack);
  assert.strictEqual(projection.stats.attackSpeed, source.attack);
  assert.strictEqual(projection.stats.defense, source.defen);
  assert.strictEqual(projection.stats.hp, source.health);
  assert.strictEqual(projection.stats.battlePower, source.power);
  assert.strictEqual(projection.stats.marchSpeed, source.speed);
  assert.strictEqual(projection.stats.range, source.range);
  assert.strictEqual(projection.stats.loadCapacity, source.load);
  assert.strictEqual(projection.stats.upkeep, source.upkeep);
  assert.strictEqual(projection.stats.healResource, source.heal_res);
  assert.strictEqual(projection.stats.healTime, source.heal_time);

  const costs = Object.fromEntries(projection.costPerUnit.map(x => [x.type, x.amount]));
  for (const resource of ["food", "wood", "stone", "iron"]) {
    if (source[resource] > 0) assert.strictEqual(costs[resource], source[resource]);
    else assert.strictEqual(costs[resource], undefined);
  }
}

const legacy = {
  unitId: "warrior_t8",
  lastShelterArmyId: "107007",
  baseTrainingSeconds: 999,
  costPerUnit: [{ type: "food", amount: 999 }],
  stats: { attackSpeed: 999, defense: 999, hp: 999, consumption: { resourceId: "food", amount: 999 } },
  requiredBuildingLevel: 22
};
const overlaid = applyVerified107xToRdcUnit(legacy);
assert.strictEqual(overlaid.unitId, legacy.unitId);
assert.strictEqual(overlaid.requiredBuildingLevel, 22, "unverified unlock metadata must be preserved, not invented");
assert.strictEqual(overlaid.baseTrainingSeconds, 118);
assert.strictEqual(overlaid.stats.attack, 70);
assert.strictEqual(overlaid.stats.attackSpeed, 70);
assert.strictEqual(overlaid.stats.defense, 41);
assert.strictEqual(overlaid.stats.hp, 15);
assert.strictEqual(overlaid.stats.consumption.amount, TROOP_107X["107007"].upkeep);
assert.deepStrictEqual(Object.fromEntries(overlaid.costPerUnit.map(x => [x.type, x.amount])), { food: 203, wood: 108, stone: 4, iron: 25 });
assert.strictEqual(overlaid.lastShelterVerified, true);

const vehicleT10 = applyVerified107xToRdcUnit({ unitId: "vehicle_t10", lastShelterArmyId: "107109", stats: {} });
assert.strictEqual(vehicleT10.baseTrainingSeconds, 173);
assert.strictEqual(vehicleT10.stats.attack, 90);
assert.strictEqual(vehicleT10.stats.defense, 65);
assert.strictEqual(vehicleT10.stats.hp, 21);
assert.strictEqual(vehicleT10.stats.marchSpeed, 16.100000381469727);
assert.deepStrictEqual(Object.fromEntries(vehicleT10.costPerUnit.map(x => [x.type, x.amount])), { food: 189, stone: 11, iron: 52 });

const shooterT10 = applyVerified107xToRdcUnit({ unitId: "shooter_t10", lastShelterArmyId: "107209", stats: {} });
assert.strictEqual(shooterT10.baseTrainingSeconds, 173);
assert.strictEqual(shooterT10.stats.attack, 65);
assert.strictEqual(shooterT10.stats.range, 50);
assert.deepStrictEqual(Object.fromEntries(shooterT10.costPerUnit.map(x => [x.type, x.amount])), { food: 155, wood: 77, stone: 19, iron: 13 });

const advanced = applyVerified107xToRdcUnit({ unitId: "advanced_ranged", lastShelterArmyId: "107219", stats: {} });
assert.strictEqual(advanced.baseTrainingSeconds, 173);
assert.strictEqual(advanced.stats.attack, 72);
assert.strictEqual(advanced.stats.defense, 42);
assert.strictEqual(advanced.stats.hp, 16);
assert.strictEqual(advanced.stats.range, 50);
assert.deepStrictEqual(Object.fromEntries(advanced.costPerUnit.map(x => [x.type, x.amount])), { food: 155, stone: 19, iron: 75 });

const unknown = { unitId: "x", lastShelterArmyId: "107319", stats: { attackSpeed: 1 } };
assert.strictEqual(applyVerified107xToRdcUnit(unknown), unknown, "snapshot-varying/unverified rows must not receive guessed values");
assert.deepStrictEqual(applyVerified107xBatch([unknown]), [unknown]);
assert.deepStrictEqual(applyVerified107xBatch(null), []);

console.log("Last Shelter 107x runtime adapter regression: OK");
