"use strict";

const assert = require("assert");

const {
  missiyaniTap
} = require("./missiya_kataloqu");

const {
  missiyaStateTeminEt,
  serverHadisesiniQeydEt,
  missiyaProqresiniHesabla,
  missiyaStatusunuAl
} = require("./missiya_proqres");

const {
  missiyaMukafatiniAl
} = require("./missiya_mukafat");

function bazaStateYarat() {
  return {
    playerId: "test_player",
    resources: {
      food: 0,
      water: 0,
      wood: 0,
      iron: 0,
      fuel: 0,
      electricity: 0,
      money: 0,
      chips: 0
    },
    resourceCaps: {
      food: 100000,
      water: 100000,
      wood: 100000,
      iron: 100000,
      fuel: 100000,
      electricity: 100000,
      money: 100000,
      chips: 100000
    },
    map: {
      unlockedMinX: 0,
      unlockedMaxX: 7,
      unlockedMinZ: 0,
      unlockedMaxZ: 7,
      unlockedBlocks: ["0,0"]
    },
    buildings: [
      {
        instanceId: "hq_1",
        buildingId: "hq",
        level: 1,
        isCompleted: true
      }
    ],
    army: {
      troops: {}
    },
    missions: {
      claimedRewardIds: [],
      eventCounters: {}
    }
  };
}

function proqres(state, id) {
  return missiyaProqresiniHesabla(state, missiyaniTap(id));
}

function claimEt(state, id) {
  const netice = missiyaMukafatiniAl(state, id);
  assert.strictEqual(
    netice.success,
    true,
    `${id} claim uğurlu olmalı idi: ${netice.message}`
  );
  return netice;
}

function testleriBaslat() {
  const state = bazaStateYarat();
  missiyaStateTeminEt(state);

  assert.strictEqual(proqres(state, "M001"), 1);
  assert.strictEqual(missiyaStatusunuAl(state, missiyaniTap("M001")), "tamamlandi");

  const m001 = claimEt(state, "M001");
  assert.strictEqual(m001.rewards[0].resourceId, "food");
  assert.strictEqual(state.resources.food, 200);

  const m001Tekrar = missiyaMukafatiniAl(state, "M001");
  assert.strictEqual(m001Tekrar.success, false);
  assert.strictEqual(m001Tekrar.alreadyClaimed, true);

  state.buildings.push({
    instanceId: "farm_1",
    buildingId: "farm",
    level: 1,
    isCompleted: true
  });

  assert.strictEqual(proqres(state, "M002"), 1);
  claimEt(state, "M002");

  state.buildings.push({
    instanceId: "house_1",
    buildingId: "house",
    level: 1,
    isCompleted: true
  });

  assert.strictEqual(proqres(state, "M003"), 2);
  claimEt(state, "M003");

  serverHadisesiniQeydEt(state, "bina_yeri_deyisdirildi", 1);
  assert.strictEqual(proqres(state, "M004"), 1);
  claimEt(state, "M004");

  state.buildings[0].level = 2;
  assert.strictEqual(proqres(state, "M005"), 1);
  claimEt(state, "M005");

  state.map.unlockedBlocks.push("1,0");
  state.map.unlockedMaxX = 15;
  assert.strictEqual(proqres(state, "M006"), 1);
  claimEt(state, "M006");

  state.buildings.push({
    instanceId: "tower_1",
    buildingId: "tower",
    level: 1,
    isCompleted: true
  });

  assert.strictEqual(proqres(state, "M007"), 1);
  claimEt(state, "M007");

  serverHadisesiniQeydEt(state, "baza_girisi_aktivlesdi", 1);
  assert.strictEqual(proqres(state, "M008"), 1);
  claimEt(state, "M008");

  state.buildings.push({
    instanceId: "fighter_1",
    buildingId: "fighter_camp",
    level: 1,
    isCompleted: true
  });

  assert.strictEqual(proqres(state, "M009"), 1);
  claimEt(state, "M009");

  state.army.troops.fighter_lv1 = 1;
  assert.strictEqual(proqres(state, "M010"), 1);
  claimEt(state, "M010");

  assert.strictEqual(
    state.missions.claimedRewardIds.length,
    10,
    "M001-M010 reward claim-ləri qeyd olunmalıdır."
  );

  console.log("[MISSIYA_TEST] M001-M010 smoke test uğurludur.");
}

testleriBaslat();
