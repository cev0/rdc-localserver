"use strict";

const {
  LAST_SHELTER_HERO_TEMPLATES
} = require("./last_shelter_hero_reference");

const {
  fortInitProjectionHazirla
} = require("./last_shelter_fort_troop_reference");

const {
  starterQueueInitProjectionHazirla
} = require("./last_shelter_starter_account_reference");

const {
  goldInitProjectionHazirla
} = require("./last_shelter_gold_wallet");
const {
  activityReferenceProjectionHazirla
} = require("./last_shelter_activity_reference");

const {
  LAST_SHELTER_FIRST_PAY_REWARD,
  LAST_SHELTER_ONLINE_DURATION,
  LAST_SHELTER_HELICOPTER
} = require("./last_shelter_engagement_reward_reference");

const {
  LAST_SHELTER_TASK_TEMPLATES,
  LAST_SHELTER_CHAPTER_TASK_REFERENCE
} = require("./last_shelter_task_reference");

const {
  LAST_SHELTER_SEVEN_DAYS_REWARD,
  LAST_SHELTER_SEVEN_DAYS_TASK_INFO
} = require("./last_shelter_seven_days_reference");

const {
  initTruckProjectionHazirla
} = require("./last_shelter_truck_convoy_reference");

const {
  LAST_SHELTER_LOTTERY_REFERENCE,
  LAST_SHELTER_CARGO_REFERENCE
} = require("./last_shelter_auxiliary_runtime_reference");

const {
  LAST_SHELTER_REPAY_REFERENCE
} = require("./last_shelter_repay_reference");

const {
  getVerifiedStoreReward,
  getVerifiedStoreRewardIds
} = require("./last_shelter_store_resource_rewards");

const {
  missileInitProjectionHazirla
} = require("./last_shelter_missile_runtime");

const LONG_MAX_STRING = "9223372036854775807";

function clone(value) {
  return value == null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function finiteInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.trunc(n)
    : fallback;
}

function nonNegativeInt(value, fallback = 0) {
  return Math.max(
    0,
    finiteInt(value, fallback)
  );
}

function runtimeTaskMap(state) {
  const rows =
    state &&
    state.lastShelterMissionRuntime &&
    Array.isArray(state.lastShelterMissionRuntime.tasks)
      ? state.lastShelterMissionRuntime.tasks
      : [];

  return new Map(
    rows
      .filter(Boolean)
      .map(row => [
        String(row.id == null ? "" : row.id),
        row
      ])
  );
}

function taskProjectionHazirla(state) {
  const runtimeById = runtimeTaskMap(state);

  return LAST_SHELTER_TASK_TEMPLATES.map(template => {
    const runtime = runtimeById.get(template.id) || {};

    return {
      reward: clone(template.reward),
      num: nonNegativeInt(runtime.num, 0),
      id: template.id,
      state: nonNegativeInt(runtime.state, 0),
      type1: template.type1
    };
  });
}

function chapterTaskProjectionHazirla(state, uid = "") {
  const runtime =
    state &&
    state.lastShelterMissionRuntime &&
    state.lastShelterMissionRuntime.chapterTask &&
    typeof state.lastShelterMissionRuntime.chapterTask === "object"
      ? state.lastShelterMissionRuntime.chapterTask
      : {};

  const runtimeChapter =
    runtime.chapter &&
    typeof runtime.chapter === "object"
      ? runtime.chapter
      : {};

  const runtimeSubTaskById = new Map(
    (Array.isArray(runtime.subTasks) ? runtime.subTasks : [])
      .filter(Boolean)
      .map(row => [
        String(row.id == null ? "" : row.id),
        row
      ])
  );

  const chapterTemplate =
    LAST_SHELTER_CHAPTER_TASK_REFERENCE.chapter;

  return {
    hasNextChapter:
      runtime.hasNextChapter == null
        ? LAST_SHELTER_CHAPTER_TASK_REFERENCE.hasNextChapter
        : runtime.hasNextChapter === true,
    chaterTask: {
      reward: clone(chapterTemplate.reward),
      uid: String(uid || ""),
      chapterid:
        String(
          runtimeChapter.chapterid == null
            ? chapterTemplate.chapterid
            : runtimeChapter.chapterid
        ),
      state:
        String(
          runtimeChapter.state == null
            ? chapterTemplate.state
            : runtimeChapter.state
        )
    },
    chapterSubTaskArray:
      LAST_SHELTER_CHAPTER_TASK_REFERENCE.subTasks.map(template => {
        const runtimeRow =
          runtimeSubTaskById.get(template.id) || {};

        return {
          reward: clone(template.reward),
          num: nonNegativeInt(
            runtimeRow.num,
            template.num
          ),
          id: template.id,
          state: nonNegativeInt(
            runtimeRow.state,
            template.state
          ),
          type1: template.type1
        };
      })
  };
}

function onlineDurationProjectionHazirla(state) {
  const runtimeRows =
    state &&
    state.lastShelterEngagementRuntime &&
    state.lastShelterEngagementRuntime.onlineDuration &&
    Array.isArray(
      state.lastShelterEngagementRuntime.onlineDuration.rewards
    )
      ? state.lastShelterEngagementRuntime.onlineDuration.rewards
      : [];

  const byId = new Map(
    runtimeRows
      .filter(Boolean)
      .map(row => [
        String(row.entryId == null ? "" : row.entryId),
        row
      ])
  );

  return {
    onlineDurationRewards:
      LAST_SHELTER_ONLINE_DURATION.rewards.map(template => {
        const runtime = byId.get(template.entryId) || {};

        return {
          duration:
            nonNegativeInt(
              runtime.duration,
              template.duration
            ),
          durationMax: template.durationMax,
          rewardState:
            nonNegativeInt(
              runtime.rewardState,
              template.rewardState
            ),
          rewardArray: clone(template.rewardArray),
          entryId: template.entryId
        };
      }),
    onlineDurationRecruitHero:
      LAST_SHELTER_ONLINE_DURATION.onlineDurationRecruitHero
  };
}

function helicopterProjectionHazirla(state) {
  const runtime =
    state &&
    state.lastShelterEngagementRuntime &&
    state.lastShelterEngagementRuntime.helicopter &&
    typeof state.lastShelterEngagementRuntime.helicopter === "object"
      ? state.lastShelterEngagementRuntime.helicopter
      : {};

  const taskState = new Map(
    (Array.isArray(runtime.taskState) ? runtime.taskState : [])
      .filter(Boolean)
      .map(row => [
        Number(row.id),
        row
      ])
  );

  const record = {
    ...LAST_SHELTER_HELICOPTER.recordDefaults,
    ...(
      runtime.record &&
      typeof runtime.record === "object"
        ? runtime.record
        : {}
    )
  };

  return {
    helicopters:
      LAST_SHELTER_HELICOPTER.taskTemplates.map(template => {
        const row = taskState.get(template.id) || {};

        const result = {
          finishTime: nonNegativeInt(row.finishTime, 0)
        };

        if (
          Array.isArray(template.rewardInfo2) &&
          template.rewardInfo2.length > 0
        ) {
          result.rewardInfo2 =
            clone(template.rewardInfo2);
        }

        result.rewardInfo =
          clone(template.rewardInfo);

        /*
         * startTime is mutable account state in the reference. Until the exact
         * refresh-generation command is migrated, preserve a runtime value
         * when available and otherwise use 0 instead of replaying a captured
         * historical epoch.
         */
        result.startTime =
          nonNegativeInt(row.startTime, 0);

        result.id = template.id;
        result.state =
          nonNegativeInt(
            row.state,
            template.observedInitialState
          );

        return result;
      }),
    refugees:
      Array.isArray(runtime.refugees)
        ? clone(runtime.refugees)
        : [],
    record: {
      freeRefreshCount:
        nonNegativeInt(record.freeRefreshCount, 0),
      todayTaskCount:
        nonNegativeInt(record.todayTaskCount, 0),
      todayTaskCountLimit:
        nonNegativeInt(
          record.todayTaskCountLimit,
          LAST_SHELTER_HELICOPTER
            .recordDefaults
            .todayTaskCountLimit
        )
    },
    cdgoldk:
      LAST_SHELTER_HELICOPTER.cdgoldk,
    refugeeLimit:
      LAST_SHELTER_HELICOPTER.refugeeLimit
  };
}

function worldProjectionHazirla(state) {
  const world =
    state &&
    state.lastShelterWorldRuntime &&
    typeof state.lastShelterWorldRuntime === "object"
      ? state.lastShelterWorldRuntime
      : {};

  return {
    maxstamina:
      nonNegativeInt(world.maxstamina, 100),
    lyt:
      nonNegativeInt(world.lyt, 0),
    stamina:
      nonNegativeInt(world.stamina, 100),
    enemy:
      Array.isArray(world.enemy)
        ? clone(world.enemy)
        : [],
    cityDefValue:
      nonNegativeInt(world.cityDefValue, 500),
    m:
      Array.isArray(world.marches)
        ? clone(world.marches)
        : [],
    point:
      world.point == null
        ? 0
        : finiteInt(world.point, 0),
    ft:
      nonNegativeInt(world.ft, 0),
    userActMarchCntPerDay:
      nonNegativeInt(
        world.userActMarchCntPerDay,
        0
      ),
    autoIncrDefLimitValue:
      nonNegativeInt(
        world.autoIncrDefLimitValue,
        0
      ),
    sheildCdTime:
      nonNegativeInt(world.sheildCdTime, 0),
    lastStaminaTime:
      world.lastStaminaTime == null
        ? LONG_MAX_STRING
        : String(world.lastStaminaTime),
    gridType:
      nonNegativeInt(world.gridType, 2),
    lastCityDefTime:
      nonNegativeInt(world.lastCityDefTime, 0)
  };
}

function sevenDaysProjectionHazirla(state, uid = "") {
  const runtime =
    state &&
    state.lastShelterSevenDaysRuntime &&
    typeof state.lastShelterSevenDaysRuntime === "object"
      ? state.lastShelterSevenDaysRuntime
      : {};

  return {
    reward:
      clone(LAST_SHELTER_SEVEN_DAYS_REWARD),
    taskInfo:
      clone(LAST_SHELTER_SEVEN_DAYS_TASK_INFO),
    activityInfo: {
      finishFlg:
        nonNegativeInt(runtime.finishFlg, 0),
      uid: String(uid || ""),
      taskCount:
        nonNegativeInt(runtime.taskCount, 100),
      count:
        nonNegativeInt(runtime.count, 0),
      startTime:
        nonNegativeInt(runtime.startTime, 0),
      unlockFlg:
        nonNegativeInt(runtime.unlockFlg, 1),
      endTime:
        nonNegativeInt(runtime.endTime, 0),
      type:
        nonNegativeInt(runtime.type, 49)
    }
  };
}

function storeProjectionHazirla() {
  return getVerifiedStoreRewardIds().map(id => ({
    id:String(id),
    reward:getVerifiedStoreReward(id)
  }));
}

function repayProjectionHazirla(state) {
  const runtime =
    state &&
    state.lastShelterAuxiliaryRuntime &&
    state.lastShelterAuxiliaryRuntime.repayinfo &&
    typeof state.lastShelterAuxiliaryRuntime.repayinfo === "object"
      ? state.lastShelterAuxiliaryRuntime.repayinfo
      : {};

  return {
    startTime:
      LAST_SHELTER_REPAY_REFERENCE.observedWindow.startTime,
    payPoint:
      nonNegativeInt(runtime.payPoint,0),
    endTime:
      LAST_SHELTER_REPAY_REFERENCE.observedWindow.endTime,
    payRewards:
      clone(LAST_SHELTER_REPAY_REFERENCE.payRewards)
  };
}

function auxiliaryProjectionHazirla(state) {
  const runtime =
    state &&
    state.lastShelterAuxiliaryRuntime &&
    typeof state.lastShelterAuxiliaryRuntime === "object"
      ? state.lastShelterAuxiliaryRuntime
      : {};

  const lotteryRuntime =
    runtime.lottery &&
    typeof runtime.lottery === "object"
      ? runtime.lottery
      : {};

  const cargoRuntime =
    runtime.cargo &&
    typeof runtime.cargo === "object"
      ? runtime.cargo
      : {};

  return {
    killWorldBossNumber:
      nonNegativeInt(runtime.killWorldBossNumber,0),
    heroprison:
      Array.isArray(runtime.heroprison)
        ? clone(runtime.heroprison)
        : [],
    chatShield:
      Array.isArray(runtime.chatShield)
        ? clone(runtime.chatShield)
        : [],
    hasPassword:
      runtime.hasPassword === true,
    isOpenedKingdomAct:
      runtime.isOpenedKingdomAct === true,
    kingdomSeasonObj:
      clone(runtime.kingdomSeasonObj || {riseInfo:[]}),
    city_def_recover_record:
      nonNegativeInt(runtime.cityDefRecoverRecord,0),
    mail_translation:
      runtime.mailTranslation === true,
    killActivityBossNumber:
      nonNegativeInt(runtime.killActivityBossNumber,0),
    activationStoptime:
      nonNegativeInt(runtime.activationStoptime,0),
    exchange_gift:
      Array.isArray(runtime.exchangeGift)
        ? clone(runtime.exchangeGift)
        : [],
    resourcePoints:
      Array.isArray(runtime.resourcePoints)
        ? clone(runtime.resourcePoints)
        : [],
    currentCapacity:
      nonNegativeInt(runtime.currentCapacity, 0),
    maxCapacity:
      nonNegativeInt(runtime.maxCapacity, 0),
    city_def_val:
      nonNegativeInt(runtime.cityDefValue, 0),
    army_formation:
      Array.isArray(runtime.armyFormation)
        ? clone(runtime.armyFormation)
        : [],
    hospital:
      Array.isArray(runtime.hospital)
        ? clone(runtime.hospital)
        : [],
    defenseInfo:
      Array.isArray(runtime.defenseInfo)
        ? clone(runtime.defenseInfo)
        : [],
    careerInfo:
      Array.isArray(runtime.careerInfo)
        ? clone(runtime.careerInfo)
        : [],
    dayAndNight:
      clone(runtime.dayAndNight || {}),
    hireArmyShop:
      clone(runtime.hireArmyShop || {}),
    mine:
      clone(runtime.mine || {}),
    world_fortress:
      Array.isArray(runtime.worldFortress)
        ? clone(runtime.worldFortress)
        : [],
    recover_durability:
      clone(runtime.recoverDurability || {}),
    rescueCenterInfo:
      clone(runtime.rescueCenterInfo || {}),
    mixedInfo:
      clone(runtime.mixedInfo || {}),
    lottery: {
      times2:
        nonNegativeInt(lotteryRuntime.times2, 0),
      lotteryInfo:
        LAST_SHELTER_LOTTERY_REFERENCE.lotteryInfo,
      super:
        LAST_SHELTER_LOTTERY_REFERENCE.super,
      normal:
        LAST_SHELTER_LOTTERY_REFERENCE.normal,
      diamond:
        LAST_SHELTER_LOTTERY_REFERENCE.diamond,
      isNewLottery:
        LAST_SHELTER_LOTTERY_REFERENCE.isNewLottery,
      isOpen:
        LAST_SHELTER_LOTTERY_REFERENCE.isOpen,
      times1:
        nonNegativeInt(lotteryRuntime.times1, 0),
      todayCount:
        nonNegativeInt(
          lotteryRuntime.todayCount,
          0
        ),
      supermode:
        nonNegativeInt(
          lotteryRuntime.supermode,
          LAST_SHELTER_LOTTERY_REFERENCE.supermode
        ),
      type:
        nonNegativeInt(
          lotteryRuntime.type,
          LAST_SHELTER_LOTTERY_REFERENCE.type
        ),
      updatetime:
        nonNegativeInt(
          lotteryRuntime.updatetime,
          0
        )
    },
    cargo: {
      rewardTime:
        nonNegativeInt(
          cargoRuntime.rewardTime,
          0
        ),
      rewardInfo:
        typeof cargoRuntime.rewardInfo === "string"
          ? cargoRuntime.rewardInfo
          : LAST_SHELTER_CARGO_REFERENCE.rewardInfo
    }
  };
}

function lastShelterVerifiedInitProjectionHazirla(
  state,
  options = {}
) {
  const uid =
    String(
      options.uid == null
        ? ""
        : options.uid
    ).trim();

  const city =
    state &&
    state.lastShelterCityRuntime &&
    typeof state.lastShelterCityRuntime === "object"
      ? state.lastShelterCityRuntime
      : {};

  const starter =
    state &&
    state.lastShelterStarterAccountRuntime &&
    typeof state.lastShelterStarterAccountRuntime === "object"
      ? state.lastShelterStarterAccountRuntime
      : {};

  const hero =
    state &&
    state.lastShelterHeroRuntime &&
    typeof state.lastShelterHeroRuntime === "object"
      ? state.lastShelterHeroRuntime
      : {};

  const missions =
    state &&
    state.lastShelterMissionRuntime &&
    typeof state.lastShelterMissionRuntime === "object"
      ? state.lastShelterMissionRuntime
      : {};

  const alliance =
    state &&
    state.lastShelterAllianceRuntime &&
    typeof state.lastShelterAllianceRuntime === "object"
      ? state.lastShelterAllianceRuntime
      : {};

  const auxiliary =
    auxiliaryProjectionHazirla(state);

  const walletUser =
    goldInitProjectionHazirla(state) ||
    {
      gold:0,
      gold1:0,
      paidGold:0
    };

  return {
    user: {
      uid,
      ...walletUser
    },
    building:
      Array.isArray(city.buildings)
        ? clone(city.buildings)
        : [],
    buildListConfig:
      Array.isArray(city.buildListConfig)
        ? clone(city.buildListConfig)
        : [],
    items:
      Array.isArray(starter.items)
        ? clone(starter.items)
        : [],
    queue:
      starterQueueInitProjectionHazirla(
        starter.queues
      ),
    finishedQueue:
      Array.isArray(starter.finishedQueue)
        ? clone(starter.finishedQueue)
        : [],
    heroTemplates:
      clone(LAST_SHELTER_HERO_TEMPLATES),
    userGenerals:
      Array.isArray(hero.generals)
        ? clone(hero.generals)
        : [],
    troopTranList:
      Array.isArray(
        state &&
        state.troopTransferRuntime
      )
        ? clone(state.troopTransferRuntime)
        : [],
    fort:
      fortInitProjectionHazirla(state),
    truckInfo:
      initTruckProjectionHazirla(state),
    world:
      worldProjectionHazirla(state),
    store:
      storeProjectionHazirla(),
    missileList:
      missileInitProjectionHazirla(state),
    activity:
      activityReferenceProjectionHazirla(),
    firstPayReward:
      clone(LAST_SHELTER_FIRST_PAY_REWARD),
    onlineDuration:
      onlineDurationProjectionHazirla(state),
    helicopter_info:
      helicopterProjectionHazirla(state),
    task:
      taskProjectionHazirla(state),
    chapterTask:
      chapterTaskProjectionHazirla(
        state,
        uid
      ),
    taskPoint:
      nonNegativeInt(
        missions.taskPoint,
        0
      ),
    sevenDaysActivity:
      sevenDaysProjectionHazirla(
        state,
        uid
      ),
    repayinfo:
      repayProjectionHazirla(
        state
      ),
    alliance:
      alliance.alliance &&
      typeof alliance.alliance === "object" &&
      !Array.isArray(alliance.alliance)
        ? clone(alliance.alliance)
        : {},
    ...auxiliary
  };
}

module.exports = {
  LONG_MAX_STRING,
  taskProjectionHazirla,
  chapterTaskProjectionHazirla,
  onlineDurationProjectionHazirla,
  helicopterProjectionHazirla,
  worldProjectionHazirla,
  sevenDaysProjectionHazirla,
  storeProjectionHazirla,
  repayProjectionHazirla,
  auxiliaryProjectionHazirla,
  lastShelterVerifiedInitProjectionHazirla
};
