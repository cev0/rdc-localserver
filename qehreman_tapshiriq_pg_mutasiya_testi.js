"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  qehremanTapshiriqMutasiyasiniTetbiqEt
} = require("./qehreman_tapshiriq_handler");

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

(function legacyRemoveSuccessTesti() {
  const state = {
    playerId: "oyuncu_a",
    heroes: [
      { heroId: "doyuscu" }
    ],
    qehremanTapshiriqlari: {
      version: 1,
      technology: {
        heroId: "legacy_tech_hero",
        instituteInstanceId: "institute_1"
      },
      resources: []
    }
  };

  const netice = qehremanTapshiriqMutasiyasiniTetbiqEt(
    state,
    "technology_hero_remove_request",
    { heroId: "legacy_tech_hero" }
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, true);
  assert.strictEqual(state.qehremanTapshiriqlari.technology, null);
})();

(function assignFailureExactRollbackTesti() {
  const state = {
    playerId: "oyuncu_a",
    heroes: [
      { heroId: "doyuscu" }
    ],
    buildings: [
      {
        instanceId: "institute_1",
        buildingId: "institute",
        isCompleted: true
      }
    ]
  };

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "qehremanTapshiriqlari"),
    false
  );

  const evvelki = kopyala(state);

  const netice = qehremanTapshiriqMutasiyasiniTetbiqEt(
    state,
    "technology_hero_assign_request",
    {
      heroId: "doyuscu",
      instituteInstanceId: "institute_1"
    }
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.ok(netice.message.includes("Texnologiya"));
  assert.deepStrictEqual(
    state,
    evvelki,
    "Uğursuz assign default qehremanTapshiriqlari state-i saxlamamalıdır."
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "qehremanTapshiriqlari"),
    false
  );
})();

(function wrongRemoveRollbackTesti() {
  const state = {
    playerId: "oyuncu_a",
    qehremanTapshiriqlari: {
      version: 1,
      technology: {
        heroId: "legacy_tech_hero",
        instituteInstanceId: "institute_1"
      },
      resources: []
    }
  };

  const evvelki = kopyala(state);

  const netice = qehremanTapshiriqMutasiyasiniTetbiqEt(
    state,
    "technology_hero_remove_request",
    { heroId: "basqa_hero" }
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.deepStrictEqual(state, evvelki);
})();

(function sourceInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "qehreman_tapshiriq_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Hero assignment handler PostgreSQL player mutation helper istifadə etməlidir."
  );
  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Hero assignment handler köhnə full-state save yolunu istifadə etməməlidir."
  );
  assert.ok(
    kod.includes("hero_assignment_info_request"),
    "Assignment info read contract saxlanmalıdır."
  );
})();

console.log("[QEHRAMAN_TAPSHIRIQ_PG_MUTASIYA_TEST] OK");
