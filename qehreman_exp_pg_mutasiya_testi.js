"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  qehremanProgressMutasiyasiniTetbiqEt
} = require("./qehreman_exp_handler");

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    heroes: [
      {
        heroId: "hero_1",
        level: 1,
        exp: 0,
        skills: []
      }
    ],
    heroRecruit: {
      expItems: {
        exp_small: 3
      }
    },
    serverSorquIdempotentliyi: {
      version: 1,
      items: []
    },
    missions: {
      eventCounters: {}
    }
  };
}

(function expSuccessVeReplayTesti() {
  const state = stateHazirla();
  let expCagirisSayi = 0;

  const asililiqlar = {
    expItemIstifadeEt(kilidliState, heroId, rewardId, count) {
      expCagirisSayi += 1;
      assert.strictEqual(heroId, "hero_1");
      assert.strictEqual(rewardId, "exp_small");
      assert.strictEqual(count, 1);

      const hero = kilidliState.heroes[0];
      hero.level = 2;
      hero.exp = 5;
      kilidliState.heroRecruit.expItems.exp_small = 2;

      return {
        success: true,
        heroId,
        rewardId,
        usedItemCount: 1,
        oldLevel: 1,
        newLevel: 2,
        newExp: 5,
        remainingItemCount: 2
      };
    },
    updateServerTime(kilidliState) {
      kilidliState.serverTimeUnixMs = 1000;
    }
  };

  const ilk = qehremanProgressMutasiyasiniTetbiqEt(
    state,
    "hero_exp_item_use_request",
    {
      requestId: "REQ-EXP-1",
      heroId: "HERO_1",
      rewardId: "EXP_SMALL",
      count: 1
    },
    1000,
    asililiqlar
  );

  assert.strictEqual(ilk.success, true);
  assert.strictEqual(ilk.deyisdi, true);
  assert.strictEqual(ilk.idempotentReplay, false);
  assert.strictEqual(ilk.requestId, "req-exp-1");
  assert.strictEqual(ilk.netice.newLevel, 2);
  assert.strictEqual(state.heroes[0].level, 2);
  assert.strictEqual(state.heroRecruit.expItems.exp_small, 2);
  assert.strictEqual(state.serverSorquIdempotentliyi.items.length, 1);
  assert.strictEqual(expCagirisSayi, 1);

  const ilkdenSonra = kopyala(state);

  const replay = qehremanProgressMutasiyasiniTetbiqEt(
    state,
    "hero_exp_item_use_request",
    {
      requestId: "req-exp-1",
      heroId: "hero_1",
      rewardId: "exp_small",
      count: 1
    },
    2000,
    asililiqlar
  );

  assert.strictEqual(replay.success, true);
  assert.strictEqual(replay.deyisdi, false);
  assert.strictEqual(replay.idempotentReplay, true);
  assert.strictEqual(replay.netice.newLevel, 2);
  assert.strictEqual(expCagirisSayi, 1);
  assert.deepStrictEqual(state, ilkdenSonra);
})();

(function expFailureRollbackTesti() {
  const state = stateHazirla();
  delete state.serverTimeUnixMs;
  const evvelki = kopyala(state);

  const netice = qehremanProgressMutasiyasiniTetbiqEt(
    state,
    "hero_exp_item_use_request",
    {
      requestId: "",
      heroId: "hero_1",
      rewardId: "exp_small",
      count: 1
    },
    3000,
    {
      expItemIstifadeEt(kilidliState) {
        kilidliState.heroes[0].level = 50;
        kilidliState.heroRecruit.expItems.exp_small = 0;
        throw new Error("qesdli_exp_xetasi");
      }
    }
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(netice.daxiliXeta, "qesdli_exp_xetasi");
  assert.deepStrictEqual(
    state,
    evvelki,
    "EXP xətası qismən hero/recruit mutation-u saxlamamalıdır."
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "serverTimeUnixMs"),
    false
  );
})();

(function skillMutationVeMissionFlagTesti() {
  const state = stateHazirla();

  const netice = qehremanProgressMutasiyasiniTetbiqEt(
    state,
    "hero_tutorial_skill_upgrade_request",
    {
      heroId: "hero_1"
    },
    4000,
    {
      tutorialSkilliniArtir(kilidliState, heroId) {
        kilidliState.heroes[0].skills = [
          {
            slotIndex: 1,
            isUnlocked: true,
            skillLevel: 2
          }
        ];
        return {
          success: true,
          heroId,
          slotIndex: 1,
          oldLevel: 1,
          newLevel: 2,
          tutorialFreeUpgrade: true
        };
      }
    }
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, true);
  assert.strictEqual(netice.missionHadisesiLazimdir, true);
  assert.strictEqual(state.heroes[0].skills[0].skillLevel, 2);

  state.missions.eventCounters.qehreman_bacarigi_artdi = 1;
  const ikinci = qehremanProgressMutasiyasiniTetbiqEt(
    state,
    "hero_tutorial_skill_upgrade_request",
    { heroId: "hero_1" },
    5000,
    {
      tutorialSkilliniArtir() {
        return {
          success: true,
          heroId: "hero_1",
          slotIndex: 1,
          oldLevel: 2,
          newLevel: 2,
          alreadyUpgraded: true
        };
      }
    }
  );

  assert.strictEqual(ikinci.success, true);
  assert.strictEqual(ikinci.missionHadisesiLazimdir, false);
})();

(function sourceInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "qehreman_exp_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Hero progress handler PostgreSQL player mutation helper istifadə etməlidir."
  );
  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Hero progress handler köhnə full-state save yolunu istifadə etməməlidir."
  );
  assert.ok(
    kod.includes("missiyaServerHadisesiniQeydEt"),
    "Tutorial skill mission hadisəsi qorunmalıdır."
  );
})();

console.log("[QEHRAMAN_EXP_PG_MUTASIYA_TEST] OK");
