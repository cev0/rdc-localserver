"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  tutorialDoyusMutasiyasiniTetbiqEt
} = require("./doyus_handler");
const {
  TUTORIAL_HEDEF_ID
} = require("./kesfiyyat_sistemi");

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    resources: {
      food: 0,
      wood: 0
    },
    resourceCaps: {
      food: 1000,
      wood: 1000
    },
    army: {
      troops: {
        fighter_lv1: 2
      }
    },
    heroes: [
      {
        heroId: "doyuscu",
        level: 1
      }
    ],
    dusmenMovqeleri: {
      tutorial: {
        targetId: TUTORIAL_HEDEF_ID,
        status: "askarlandi"
      }
    }
  };
}

(function startResolveRewardTesti() {
  const state = stateHazirla();

  const start = tutorialDoyusMutasiyasiniTetbiqEt(
    state,
    "battle_start_request",
    1000
  );

  assert.strictEqual(start.success, true);
  assert.strictEqual(start.deyisdi, true);
  assert.strictEqual(start.netice.alreadyStarted, false);
  assert.strictEqual(state.doyus.tutorial.status, "davam_edir");
  assert.strictEqual(state.doyus.tutorial.heroId, "doyuscu");
  assert.strictEqual(state.doyus.tutorial.troopSnapshot.fighter_lv1, 2);

  const tezResolve = tutorialDoyusMutasiyasiniTetbiqEt(
    state,
    "battle_resolve_request",
    4000
  );

  assert.strictEqual(tezResolve.success, false);
  assert.strictEqual(tezResolve.deyisdi, false);
  assert.strictEqual(state.doyus.tutorial.status, "davam_edir");

  const resolve = tutorialDoyusMutasiyasiniTetbiqEt(
    state,
    "battle_resolve_request",
    6000
  );

  assert.strictEqual(resolve.success, true);
  assert.strictEqual(resolve.deyisdi, true);
  assert.strictEqual(resolve.netice.victory, true);
  assert.strictEqual(state.doyus.tutorial.status, "qelebe");
  assert.strictEqual(state.doyus.tutorial.pendingRewards.length, 2);

  const reward = tutorialDoyusMutasiyasiniTetbiqEt(
    state,
    "battle_reward_claim_request",
    7000
  );

  assert.strictEqual(reward.success, true);
  assert.strictEqual(reward.deyisdi, true);
  assert.strictEqual(state.resources.food, 200);
  assert.strictEqual(state.resources.wood, 200);
  assert.strictEqual(state.doyus.tutorial.rewardClaimed, true);
  assert.strictEqual(state.doyus.tutorial.pendingRewards.length, 0);
})();

(function startFailureExactRollbackTesti() {
  const state = stateHazirla();
  delete state.dusmenMovqeleri;
  const evvelki = kopyala(state);

  const netice = tutorialDoyusMutasiyasiniTetbiqEt(
    state,
    "battle_start_request",
    1000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.ok(netice.message.includes("aşkar"));
  assert.deepStrictEqual(
    state,
    evvelki,
    "Uğursuz battle start default doyus state-i saxlamamalıdır."
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "doyus"),
    false
  );
})();

(function rewardCapacityFailureRollbackTesti() {
  const state = stateHazirla();
  state.resources.food = 900;
  state.resourceCaps.food = 1000;
  state.doyus = {
    version: 1,
    tutorial: {
      battleId: "tutorial_doyus_001",
      targetId: TUTORIAL_HEDEF_ID,
      status: "qelebe",
      startedAtMs: 1000,
      completedAtMs: 6000,
      heroId: "doyuscu",
      playerPower: 10,
      enemyPower: 5,
      rewardClaimed: false,
      pendingRewards: [
        { resourceId: "food", amount: 200 },
        { resourceId: "wood", amount: 200 }
      ],
      troopSnapshot: {
        fighter_lv1: 2
      }
    }
  };

  const evvelki = kopyala(state);

  const netice = tutorialDoyusMutasiyasiniTetbiqEt(
    state,
    "battle_reward_claim_request",
    7000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.ok(netice.message.includes("anbarında"));
  assert.deepStrictEqual(state, evvelki);
})();

(function alreadyResolvedNoExtraMutationTesti() {
  const state = stateHazirla();
  state.doyus = {
    version: 1,
    tutorial: {
      battleId: "tutorial_doyus_001",
      targetId: TUTORIAL_HEDEF_ID,
      status: "qelebe",
      startedAtMs: 1000,
      completedAtMs: 6000,
      heroId: "doyuscu",
      playerPower: 10,
      enemyPower: 5,
      rewardClaimed: false,
      pendingRewards: [
        { resourceId: "food", amount: 200 },
        { resourceId: "wood", amount: 200 }
      ],
      troopSnapshot: {
        fighter_lv1: 2
      }
    }
  };

  const evvelki = kopyala(state);
  const netice = tutorialDoyusMutasiyasiniTetbiqEt(
    state,
    "battle_resolve_request",
    8000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.netice.alreadyResolved, true);
  assert.strictEqual(netice.deyisdi, false);
  assert.deepStrictEqual(state, evvelki);
})();

(function sourceInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "doyus_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Tutorial battle mutation-ları PostgreSQL player lock istifadə etməlidir."
  );
  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Tutorial battle handler köhnə full-state save yolunu istifadə etməməlidir."
  );
  assert.ok(
    kod.includes("doyusReadStateKopyasi(state)"),
    "battle_info və cavab info-ları clone üzərində hazırlanmalıdır."
  );
  assert.ok(
    kod.includes("missiyaServerHadisesiniQeydEt"),
    "Tutorial battle mission-event bridge saxlanmalıdır."
  );
})();

console.log("[TUTORIAL_DOYUS_PG_MUTASIYA_TEST] OK");
