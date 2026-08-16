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
assert(levelInfo, "storage binasının müsbət qoruma tutumlu level-i olmalıdır");

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
const protectedAmount = Math.trunc(Number(levelInfo.storageCapacityBonus));
assert.strictEqual(basis.version, 2);
assert.strictEqual(basis.byResource[resourceId], protectedAmount);

const oldJson = process.env.PVP_RESOURCE_PROTECTION_JSON;
try {
  const protection = anbarPvpQorumasiniHesabla(state);
  assert.strictEqual(protection.enabled, true);
  assert.strictEqual(protection.policyId, "fixed_protected_amount_by_storage_level_v2");
  assert.strictEqual(protection.byResource[resourceId], protectedAmount,
    "Anbar level-i faizsiz konkret qorunan miqdar verməlidir");

  const ikiAnbarState = {
    buildings: [
      { buildingId: storageDef.id, level: levelInfo.level, isCompleted: true, isPlaced: true },
      { buildingId: storageDef.id, level: levelInfo.level, isCompleted: true, isPlaced: true }
    ]
  };
  const ikiAnbar = anbarPvpQorumasiniHesabla(ikiAnbarState);
  assert.strictEqual(ikiAnbar.byResource[resourceId], protectedAmount * 2,
    "Birdən çox uyğun Anbarın qoruma tutumu toplanmalıdır");

  const tikilmekdeOlan = anbarPvpQorumasiniHesabla({
    buildings: [{ buildingId: storageDef.id, level: levelInfo.level, isCompleted: false, isPlaced: true }]
  });
  assert.strictEqual(tikilmekdeOlan.byResource[resourceId] || 0, 0,
    "Tamamlanmamış bina PvP qoruması verməməlidir");

  process.env.PVP_RESOURCE_PROTECTION_JSON = JSON.stringify({ [resourceId]: protectedAmount + 123 });
  const merged = qorumaCedveliniAl(state);
  assert.strictEqual(merged.byResource[resourceId], protectedAmount + 123,
    "explicit server qoruması Anbar qorumasından yüksəkdirsə aşağı salınmamalıdır");
  assert.strictEqual(merged.mergePolicy, "max_per_resource");
}
finally {
  if (oldJson == null) delete process.env.PVP_RESOURCE_PROTECTION_JSON;
  else process.env.PVP_RESOURCE_PROTECTION_JSON = oldJson;
}

console.log("pvp_anbar_qoruma_sistemi_testi: OK");
