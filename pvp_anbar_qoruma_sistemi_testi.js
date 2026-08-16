"use strict";

const assert = require("assert");
const definitionsRaw = require("./building_definitions.json");
const {
  anbarTutumBazisiniHesabla,
  anbarPvpQorumasiniHesabla
} = require("./pvp_anbar_qoruma_sistemi");
const { qorumaCedveliniAl } = require("./pvp_resurs_talani_sistemi");

const defs = Array.isArray(definitionsRaw)
  ? definitionsRaw
  : definitionsRaw.definitions;

const storageDef = defs.find(def => {
  if (!def || def.providesStorage !== true) return false;
  return Array.isArray(def.levels) && def.levels.some(x => Number(x && x.storageCapacityBonus) > 0);
});

assert(storageDef, "building_definitions.json daxilində real storage binası tapılmalıdır");
const levelInfo = storageDef.levels.find(x => Number(x && x.storageCapacityBonus) > 0);
assert(levelInfo, "storage binasının müsbət tutumlu level-i olmalıdır");

const state = {
  buildings: [{
    buildingId: storageDef.id,
    level: levelInfo.level,
    isCompleted: true,
    isPlaced: true
  }]
};

const basis = anbarTutumBazisiniHesabla(state);
const resourceId = String(storageDef.storageResource).trim().toLowerCase();
const capacity = Math.trunc(Number(levelInfo.storageCapacityBonus));
assert.strictEqual(basis.byResource[resourceId], capacity);

const oldPercent = process.env.PVP_STORAGE_PROTECTION_PERCENT;
const oldJson = process.env.PVP_RESOURCE_PROTECTION_JSON;
try {
  delete process.env.PVP_STORAGE_PROTECTION_PERCENT;
  let protection = anbarPvpQorumasiniHesabla(state);
  assert.strictEqual(protection.enabled, false, "balans faizi verilməyibsə gizli protection aktivləşməməlidir");
  assert.strictEqual(protection.byResource[resourceId], 0);

  process.env.PVP_STORAGE_PROTECTION_PERCENT = "25";
  protection = anbarPvpQorumasiniHesabla(state);
  assert.strictEqual(protection.enabled, true);
  assert.strictEqual(protection.byResource[resourceId], Math.floor(capacity * 0.25));

  process.env.PVP_RESOURCE_PROTECTION_JSON = JSON.stringify({ [resourceId]: capacity });
  const merged = qorumaCedveliniAl(state);
  assert.strictEqual(merged.byResource[resourceId], capacity, "manual/server qoruması building qorumasından aşağı salınmamalıdır");
  assert.strictEqual(merged.mergePolicy, "max_per_resource");
}
finally {
  if (oldPercent == null) delete process.env.PVP_STORAGE_PROTECTION_PERCENT;
  else process.env.PVP_STORAGE_PROTECTION_PERCENT = oldPercent;
  if (oldJson == null) delete process.env.PVP_RESOURCE_PROTECTION_JSON;
  else process.env.PVP_RESOURCE_PROTECTION_JSON = oldJson;
}

console.log("pvp_anbar_qoruma_sistemi_testi: OK");
