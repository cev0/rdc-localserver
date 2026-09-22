"use strict";

const { scienceLevelMelumatiniAl } = require("./last_shelter_science_kataloqu");
const { scienceLevelAl } = require("./last_shelter_science_prerequisite_runtime");
const { sourceBuildings, sourceBuildingType, sourceBuildingLevel } = require("./last_shelter_building_state");
const { RESOURCE_STATE_KEYS } = require("./last_shelter_resource_types");
const {
  SCIENCE_EFFECT_IDS, verifiedScienceResourceCost, verifiedScienceGoodsCost, verifiedScienceTimeMs
} = require("./last_shelter_science_cost_contract");
const {
  LAST_SHELTER_SCIENCE_HERO_SKILLS, stationBuildingTypeAl, skillIdAl
} = require("./last_shelter_science_hero_skill_reference");
const {
  scienceQueueListesiAl, scienceQueueTipidir,
  verifiedScienceResearchPlanHazirla, verifiedScienceResearchPlaniniStateEt,
  verifiedScienceResearchYekunlasdir
} = require("./last_shelter_science_runtime_adapteri");
const { lastShelterResourcePayloadHazirla } = require("./last_shelter_resource_runtime");
const { lastShelterGoldWalletTeminEt, totalGoldAl } = require("./last_shelter_gold_wallet");

const ENERGY_SKILL = LAST_SHELTER_SCIENCE_HERO_SKILLS.ENERGY_SKILL;
const SECOND_RESEARCH_QUEUE_SKILL = LAST_SHELTER_SCIENCE_HERO_SKILLS.SECOND_RESEARCH_QUEUE;
const SCIENCE_HERO_STATION_BUILDING = stationBuildingTypeAl(ENERGY_SKILL);
const ENERGY_SKILL_ID = skillIdAl(ENERGY_SKILL);
const SECOND_RESEARCH_QUEUE_SKILL_ID = skillIdAl(SECOND_RESEARCH_QUEUE_SKILL);

if (!SCIENCE_HERO_STATION_BUILDING ||
    SCIENCE_HERO_STATION_BUILDING !== stationBuildingTypeAl(SECOND_RESEARCH_QUEUE_SKILL) ||
    !ENERGY_SKILL_ID || !SECOND_RESEARCH_QUEUE_SKILL_ID) {
  throw new Error("Invalid verified Last Shelter science hero skill contract");
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function fail(code, details = {}) { return { ok: false, code, ...details }; }
function skills(hero) {
  const out = [];
  for (const value of [hero?.skills, hero?.skill, hero?.ability]) {
    if (!Array.isArray(value)) continue;
    for (const entry of value) {
      if (entry == null) continue;
      if (typeof entry === "string" || typeof entry === "number") {
        out.push({ skillId: String(entry) });
      } else if (typeof entry === "object") {
        out.push(entry);
      }
    }
  }
  return out;
}
function newHeroes(state) {
  const runtime = state?.lastShelterHeroRuntime;
  if (!runtime || typeof runtime !== "object") return [];
  if (Array.isArray(runtime.heroes)) return runtime.heroes;
  if (Array.isArray(runtime.generals)) return runtime.generals;
  return [];
}
function heroId(hero) {
  return String(hero?.heroId ?? hero?.generalId ?? hero?.itemId ?? hero?.id ?? "");
}
function runtimeSkillId(skill) {
  return String(skill?.skillId ?? skill?.id ?? skill?.heroSkill ?? "");
}

function academyStationedHeroIds(state) {
  // UserBuildingManager.getHeroListByItemId parses building.heroId as a
  // semicolon-separated list of numeric hero IDs. The verified science hero
  // skill rows both require the same source station building.
  const stationed = new Set();
  for (const building of sourceBuildings(state)) {
    if (sourceBuildingType(building) !== SCIENCE_HERO_STATION_BUILDING) continue;
    for (const id of String(building.heroId || "").split(";")) {
      if (/^\d+$/.test(id)) stationed.add(id);
    }
  }
  return stationed;
}

function sourceSecondScienceQueueUnlocked(state) {
  // Owning the skill is insufficient: the matching general must be stationed
  // in the building required by the verified 61012 source row.
  const stationed = academyStationedHeroIds(state);
  return newHeroes(state).some(hero => stationed.has(heroId(hero)) &&
    skills(hero).some(skill => runtimeSkillId(skill) === SECOND_RESEARCH_QUEUE_SKILL_ID));
}

function sourceScienceEffects(state) {
  const effects = {};
  const runtime = state?.lastShelterScienceRuntime || {};
  const rows = Array.isArray(state?.science) ? state.science.map(row => String(row.itemId ?? row.id)) : Object.keys(state?.science || {});
  for (const itemId of new Set(rows)) {
    const level = scienceLevelAl(state, itemId);
    if (level <= 0) continue;
    const row = scienceLevelMelumatiniAl(itemId, level)?.sourceAttributes;
    if (!row || (row.object && row.object !== "user")) continue;
    if (row.onlyInActivity === "1" && runtime.activityScienceActive !== true) continue;
    const cross = runtime.crossFightSrcServerId ?? -1;
    if (row.onlyOutState === "1" && cross === -1) continue;
    if (row.onlyInState === "1" && cross !== -1) continue;
    for (const id of String(row.para1 || "").split("|")) {
      if (!/^\d+$/.test(id)) continue;
      effects[id] = Math.fround((effects[id] || 0) + Math.fround(Number(row.para2 || 0)));
    }
  }
  for (const [name, id] of Object.entries(SCIENCE_EFFECT_IDS)) {
    const extra = Number(runtime.externalEffects?.[name] ?? runtime.externalEffects?.[id] ?? 0);
    if (!Number.isFinite(extra)) throw new Error(`Invalid persisted science effect: ${name}`);
    effects[id] = Math.fround((effects[id] || 0) + Math.fround(extra));
  }
  return effects;
}

function sourceSciencePrerequisite(state, row) {
  const useNew = state?.lastShelterScienceRuntime?.useNewScienceCondition !== false;
  const requirements = [], missingScience = [], missingBuilding = [];
  for (const token of (useNew ? row.scienceConditionNew : row.scienceCondition).split(";").filter(Boolean)) {
    if (!/^\d{3,}$/.test(token)) return fail("SCIENCE_CONDITION_INVALID");
    const itemId = token.slice(0, -2) + "00", requiredLevel = Number(token.slice(-2));
    const currentLevel = scienceLevelAl(state, itemId);
    const entry = { itemId, requiredLevel, currentLevel };
    requirements.push(entry);
    if (currentLevel < requiredLevel) missingScience.push(entry);
  }
  for (const token of row.buildingCondition.split(";").filter(Boolean)) {
    if (!/^\d+$/.test(token)) return fail("SCIENCE_CONDITION_INVALID");
    const buildingTypeId = String(Math.floor(Number(token) / 1000) * 1000);
    const requiredLevel = Number(token) % 100;
    const currentLevel = sourceBuildingLevel(state, buildingTypeId);
    if (currentLevel < requiredLevel) missingBuilding.push({ buildingTypeId, requiredLevel, currentLevel });
  }
  const code = missingScience.length ? "SCIENCE_CONDITION_NOT_MET" : missingBuilding.length ? "BUILDING_CONDITION_NOT_MET" : "OK";
  return { ok: code === "OK", code, requirements, missingScience, missingBuilding };
}

function sourceScienceResearchPlan(state, request, nowUnixMs) {
  if (!state || typeof state !== "object") return fail("STATE_MISSING");
  if (!Number.isSafeInteger(nowUnixMs) || nowUnixMs < 0) return fail("INVALID_SERVER_TIME");
  if (request?.gold != null && (!Number.isInteger(request.gold) || request.gold < 0 || request.gold > 2147483647)) {
    return fail("INVALID_OPT");
  }
  const plan = verifiedScienceResearchPlanHazirla(state, request, nowUnixMs, {
    secondQueueCheck: sourceSecondScienceQueueUnlocked
  });
  if (!plan.ok) return plan;
  const row = scienceLevelMelumatiniAl(plan.itemId, plan.currentLevel);
  const prerequisite = sourceSciencePrerequisite(state, row);
  if (!prerequisite.ok) return { ...prerequisite, prerequisite };
  if (scienceQueueListesiAl(state).some(queue => scienceQueueTipidir(queue) &&
      queue.status !== "completed" && String(queue.itemObj?.itemId || queue.itemId || "") === plan.itemId)) {
    return fail("SCIENCE_ALREADY_RESEARCHING");
  }
  const effects = sourceScienceEffects(state);
  const runtime = state.lastShelterScienceRuntime || {};
  // The verified 50046 row proves this is an active, station-scoped science
  // skill, but not yet its runtime lifecycle. Block only when the persisted
  // active state is actually present on a correctly stationed general.
  const academyStationed = academyStationedHeroIds(state);
  if (newHeroes(state).some(hero => academyStationed.has(heroId(hero)) &&
      skills(hero).some(skill =>
        (skill.state === "READY" || Number(skill.state) === Number(ENERGY_SKILL.state)) &&
        runtimeSkillId(skill) === ENERGY_SKILL_ID))) {
    return fail("SCIENCE_ENERGY_SKILL_UNMIGRATED");
  }
  const resources = {};
  for (const need of row.researchNeed) {
    const key = RESOURCE_STATE_KEYS[need.typeCode];
    if (!key) return fail("SCIENCE_RESOURCE_TYPE_UNMIGRATED");
    const amount = verifiedScienceResourceCost(need.amount, need.typeCode, effects);
    if (amount == null) return fail("SCIENCE_EFFECT_INVALID");
    resources[key] = amount;
  }
  const goods = [];
  for (const token of row.goodsNeedRaw.split("|").filter(Boolean)) {
    const fields = token.split(";");
    if (fields.length !== 2 || !fields.every(value => /^\d+$/.test(value))) return fail("SCIENCE_GOODS_INVALID");
    goods.push({ itemId: fields[0], amount: verifiedScienceGoodsCost(Number(fields[1]), fields[0], effects) });
  }
  const academy = sourceBuildings(state).find(building => sourceBuildingType(building) === SCIENCE_HERO_STATION_BUILDING);
  const stationExtra = Number(runtime.stationEffects?.[academy?.uuid ?? academy?.instanceId]?.SCIENCE_RESEARCH ?? 0);
  const durationMs = verifiedScienceTimeMs(row.researchTimeSeconds, row.effectType, effects,
    academy ? Math.fround((effects[69] || 0) + Math.fround(stationExtra)) : 0);
  if (durationMs == null || !Number.isSafeInteger(nowUnixMs + durationMs)) return fail("SCIENCE_EFFECT_INVALID");
  return {
    ...plan, prerequisite, costs: { resources, goods }, durationMs,
    queue: { ...plan.queue, finishUnixMs: nowUnixMs + durationMs }
  };
}

function sourceScienceResearch(state, request, nowUnixMs) {
  const plan = sourceScienceResearchPlan(state, request, nowUnixMs);
  if (!plan.ok) return plan;
  const missingResources = [];
  for (const [key, amount] of Object.entries(plan.costs.resources)) {
    const balance = Number(state.resources?.[key] ?? 0);
    if (!Number.isFinite(balance) || balance < amount) missingResources.push({ resource: key, required: amount });
  }
  if (missingResources.length) {
    return fail(plan.optionalGold > 0 ? "SCIENCE_GOLD_TOPUP_UNMIGRATED" : "USERRESOURCE_IS_NOT_ENOUGH", { missingResources });
  }
  const inventory = state.lastShelterStarterAccountRuntime?.items || [];
  const goodsCosts = new Map();
  for (const cost of plan.costs.goods) goodsCosts.set(cost.itemId, (goodsCosts.get(cost.itemId) || 0) + cost.amount);
  for (const [itemId, amount] of goodsCosts) {
    const count = inventory.filter(item => String(item.itemId) === itemId)
      .reduce((sum, item) => sum + Math.max(0, Math.trunc(Number(item.count) || 0)), 0);
    if (count < amount) return fail("SILVER_MEDAL_NOT_ENOUGH", { itemId, required: amount });
  }
  const applied = verifiedScienceResearchPlaniniStateEt(state, plan);
  if (!applied.ok) return applied;
  if (!state.resources) state.resources = {};
  for (const [key, amount] of Object.entries(plan.costs.resources)) {
    if (amount > 0) state.resources[key] = Number(state.resources[key]) - amount;
  }
  for (const [itemId, amount] of goodsCosts) {
    let remaining = amount;
    for (const item of inventory) {
      if (remaining === 0) break;
      if (String(item.itemId) !== itemId) continue;
      const take = Math.min(remaining, Math.max(0, Math.trunc(Number(item.count) || 0)));
      item.count -= take;
      remaining -= take;
    }
  }
  const queue = scienceQueueListesiAl(state).find(row => row.uuid === plan.queue.uuid);
  queue.scienceCost = clone(plan.costs);
  return {
    ok: true, itemId: plan.itemId, level: plan.currentLevel, targetLevel: plan.targetLevel,
    resource: lastShelterResourcePayloadHazirla(state, nowUnixMs), queue: clone(queue),
    gold: totalGoldAl(lastShelterGoldWalletTeminEt(state)), costs: clone(plan.costs)
  };
}

function sourceScienceUpgrade(state, request, nowUnixMs) {
  const itemId = String(request?.itemId || "");
  const quuid = String(request?.quuid || request?.queueUuid || "");
  const queue = scienceQueueListesiAl(state).find(row => row.uuid === quuid && scienceQueueTipidir(row));
  if (!queue || String(queue.itemId || queue.itemObj?.itemId || "") !== itemId) return fail("INVALID_OPT");
  if (queue.status === "completed" && queue.lastScienceCompletion?.itemId === itemId) {
    return { ok: true, itemId, level: scienceLevelAl(state, itemId), cd: 0, queue: clone(queue) };
  }
  if (queue.status !== "running") return fail("INVALID_OPT");
  const finish = Number(queue.finishUnixMs ?? queue.updateTime);
  if (!Number.isFinite(finish) || nowUnixMs < finish - 1000) return fail("SCIENCE_CD_NOT_REACHED");
  verifiedScienceResearchYekunlasdir(state, nowUnixMs, { queueUuid: quuid, earlyWindowMs: 1000 });
  if (queue.status !== "completed") return fail("SCIENCE_PLAN_STALE");
  return { ok: true, itemId, level: scienceLevelAl(state, itemId), cd: 0, queue: clone(queue) };
}

module.exports = {
  academyStationedHeroIds, sourceSecondScienceQueueUnlocked, sourceScienceEffects, sourceSciencePrerequisite,
  sourceScienceResearchPlan, sourceScienceResearch, sourceScienceUpgrade
};