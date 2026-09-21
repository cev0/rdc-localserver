"use strict";

/*
 * Verified Last Shelter v1.250.102 auxiliary fresh-account runtime fields.
 *
 * Account/session timestamps are not used as current configuration. Where a
 * timestamp was present in the capture it is kept only in an "observed" block
 * so the live server does not accidentally reuse a historical epoch value.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_CAREER_INFO = deepFreeze([
  {
    careerId:"222000",
    talentArray:["222100","222101","222102","222103","222104","222105","222106"]
  },
  {
    careerId:"222001",
    talentArray:["222200","222201","222202","222203","222204","222205","222206"]
  },
  {
    careerId:"222002",
    talentArray:["222300","222301","222302","222303","222304","222305"]
  }
]);

const LAST_SHELTER_HIRE_ARMY_SHOP_DEFAULT = deepFreeze({
  gridNum:0,
  refreshGold:100,
  nextFreeReFresh:0,
  refreshTimes:0,
  items:[]
});

const LAST_SHELTER_MINE_DEFAULT = deepFreeze({
  call:0,
  level:1,
  xml_miner:2,
  mineTime:0,
  exp:0,
  miner:0,
  xml_exp:1
});

const LAST_SHELTER_WORLD_FORTRESS_DEFAULT = deepFreeze([
  {
    maxDefence:10000,
    defence:0,
    fireTime:0,
    weaponLevel:0,
    completeTime:0,
    uid:"",
    destroyTime:0,
    weaponId:0,
    fortressLevel:1,
    pointId:0,
    maxMember:7,
    fortressIndex:1,
    locateTime:0,
    vanishTime:0
  }
]);

const LAST_SHELTER_RECOVER_DURABILITY_DEFAULT = deepFreeze({
  "200065":0,
  "200078":0,
  "200079":0
});

const LAST_SHELTER_RESCUE_CENTER_DEFAULT = deepFreeze({
  operateType:0,
  startTime:"0",
  endTime:"0",
  beanList:[]
});

const LAST_SHELTER_MIXED_INFO_DEFAULT = deepFreeze({
  materialBackup:1,
  popRate:"gift_pop;50|nmonth_pop;50",
  todayLoginTimes:1,
  scoreSwitch:true,
  discoveryRemainCount:50
});

const LAST_SHELTER_LOTTERY_REFERENCE = deepFreeze({
  lotteryInfo:"200393:3|200320:2|200332:1|200202:2|202:1|200336:1|200380:1|200871:1|200332:1",
  super:"0:0|0:0|3:0|2:0|13:1|13:5|200393:1|200200:1|100:1",
  normal:"0:0|3:0|3:0|3:0|12:1100|13:1|200200:1|200380:1|100:1",
  diamond:200,
  isNewLottery:1,
  isOpen:"1",
  supermode:0,
  type:2,
  observedUpdatetime:1789659154467
});

const LAST_SHELTER_CARGO_REFERENCE = deepFreeze({
  rewardInfo:"goods,210120,1",
  observedRewardTime:1789659010649
});

const LAST_SHELTER_BUSINESSMAN_OBSERVED = deepFreeze({
  isOpen:0,
  startTime:1789617600000,
  endTime:1790308800000
});

const LAST_SHELTER_DAY_AND_NIGHT_RUNTIME = deepFreeze({
  night:"3",
  day:"300000"
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rewardTokenParseEt(raw) {
  const parts = String(raw == null ? "" : raw)
    .split(",")
    .map(x => x.trim());

  if (parts.length !== 3 || !parts[0] || !parts[1]) return null;

  const amount = Number(parts[2]);
  if (!Number.isFinite(amount)) return null;

  return {
    kind:parts[0],
    id:parts[1],
    amount:Math.max(0,Math.trunc(amount))
  };
}

function lotteryEntryListParseEt(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return [];

  return text.split("|").map((token,index) => {
    const [id,value] = token.split(":");
    return {
      index,
      id:String(id == null ? "" : id).trim(),
      value:Number(value) || 0
    };
  });
}

function lastShelterAuxiliaryRuntimeDefaultHazirla() {
  return {
    currentCapacity:0,
    maxCapacity:0,
    cityDefValue:0,
    armyFormation:[],
    hospital:[],
    defenseInfo:[],
    recoverDurability:clone(LAST_SHELTER_RECOVER_DURABILITY_DEFAULT),
    careerInfo:clone(LAST_SHELTER_CAREER_INFO),
    dayAndNight:clone(LAST_SHELTER_DAY_AND_NIGHT_RUNTIME),
    hireArmyShop:clone(LAST_SHELTER_HIRE_ARMY_SHOP_DEFAULT),
    mine:clone(LAST_SHELTER_MINE_DEFAULT),
    worldFortress:clone(LAST_SHELTER_WORLD_FORTRESS_DEFAULT),
    rescueCenterInfo:clone(LAST_SHELTER_RESCUE_CENTER_DEFAULT),
    mixedInfo:clone(LAST_SHELTER_MIXED_INFO_DEFAULT),
    lottery:{
      times1:0,
      times2:0,
      todayCount:0,
      supermode:LAST_SHELTER_LOTTERY_REFERENCE.supermode,
      type:LAST_SHELTER_LOTTERY_REFERENCE.type
    },
    cargo:{
      rewardInfo:LAST_SHELTER_CARGO_REFERENCE.rewardInfo,
      rewardTime:0
    }
  };
}

function lastShelterAuxiliaryRuntimeTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterAuxiliaryRuntime ||
    typeof state.lastShelterAuxiliaryRuntime !== "object" ||
    Array.isArray(state.lastShelterAuxiliaryRuntime)
  ) {
    state.lastShelterAuxiliaryRuntime =
      lastShelterAuxiliaryRuntimeDefaultHazirla();
  }

  const runtime = state.lastShelterAuxiliaryRuntime;

  for (const key of ["armyFormation","hospital","defenseInfo","worldFortress","careerInfo"]) {
    if (!Array.isArray(runtime[key])) {
      runtime[key] = clone(lastShelterAuxiliaryRuntimeDefaultHazirla()[key]);
    }
  }

  if (!runtime.recoverDurability || typeof runtime.recoverDurability !== "object") {
    runtime.recoverDurability = clone(LAST_SHELTER_RECOVER_DURABILITY_DEFAULT);
  }
  if (!runtime.rescueCenterInfo || typeof runtime.rescueCenterInfo !== "object") {
    runtime.rescueCenterInfo = clone(LAST_SHELTER_RESCUE_CENTER_DEFAULT);
  }
  if (!runtime.hireArmyShop || typeof runtime.hireArmyShop !== "object") {
    runtime.hireArmyShop = clone(LAST_SHELTER_HIRE_ARMY_SHOP_DEFAULT);
  }
  if (!runtime.mine || typeof runtime.mine !== "object") {
    runtime.mine = clone(LAST_SHELTER_MINE_DEFAULT);
  }
  if (!runtime.mixedInfo || typeof runtime.mixedInfo !== "object") {
    runtime.mixedInfo = clone(LAST_SHELTER_MIXED_INFO_DEFAULT);
  }
  if (!runtime.lottery || typeof runtime.lottery !== "object") {
    runtime.lottery = { times1:0,times2:0,todayCount:0,supermode:0,type:2 };
  }
  if (!runtime.cargo || typeof runtime.cargo !== "object") {
    runtime.cargo = {
      rewardInfo:LAST_SHELTER_CARGO_REFERENCE.rewardInfo,
      rewardTime:0
    };
  }

  return runtime;
}

module.exports = {
  LAST_SHELTER_CAREER_INFO,
  LAST_SHELTER_HIRE_ARMY_SHOP_DEFAULT,
  LAST_SHELTER_MINE_DEFAULT,
  LAST_SHELTER_WORLD_FORTRESS_DEFAULT,
  LAST_SHELTER_RECOVER_DURABILITY_DEFAULT,
  LAST_SHELTER_RESCUE_CENTER_DEFAULT,
  LAST_SHELTER_MIXED_INFO_DEFAULT,
  LAST_SHELTER_LOTTERY_REFERENCE,
  LAST_SHELTER_CARGO_REFERENCE,
  LAST_SHELTER_BUSINESSMAN_OBSERVED,
  LAST_SHELTER_DAY_AND_NIGHT_RUNTIME,
  rewardTokenParseEt,
  lotteryEntryListParseEt,
  lastShelterAuxiliaryRuntimeDefaultHazirla,
  lastShelterAuxiliaryRuntimeTeminEt
};
