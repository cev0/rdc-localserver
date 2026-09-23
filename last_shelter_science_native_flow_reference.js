"use strict";

/*
 * Verified control-flow facts from the Last Shelter v1.250.102 reference JAR.
 * This is deliberately a behavior boundary, not a guessed pricing model.
 * Exact CommonUtils gold-conversion arithmetic remains unmigrated.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_SCIENCE_NATIVE_FLOW = deepFreeze({
  referenceJarSha256: "a79213f67128ad2d60ec1891a21a625a5fedd1738eaba8aef30e09ef15128dc9",
  research: {
    command: "science.research",
    handlerClass: "com.elex.cok.handlers.requesthandlers.science.ScienceResearch",
    handlerClassSha256: "ba92a9b2d5789c968c9b8e319210ee93268eaf30408c8942863ac562a103375b",
    serviceMethod: "ScienceService.researchOneScience",
    clientGoldDefault: 0,
    clientGoldSelector: "zero=resource debit; nonzero=server-side missing-resource gold path",
    clientGoldAuthoritativePrice: false,
    resourceTopUpHelper: "CommonUtils.handleResNotEnoughBuildingCost",
    goodsShortage: "SILVER_MEDAL_NOT_ENOUGH",
    completionMode: "queue"
  },
  directly: {
    command: "science.directly",
    handlerClass: "com.elex.cok.handlers.requesthandlers.science.UpgradeDirectly",
    handlerClassSha256: "084066b1658facdee10dc4dd6e34a2f6f88d1c90ca07d66bb86b62a479424705",
    serviceMethod: "ScienceService.researchDirectlly",
    checkBeforeResearchQueue: false,
    resourceCostMode: false,
    resourceCostMethod: "ScienceService.getResearchResourceCost",
    goodsCostMethod: "ScienceService.getScienceGoodsNeed",
    goodsShortage: "SILVER_MEDAL_NOT_ENOUGH",
    shortageMethod: "UserResource.checkResourceValue",
    timeCostMethod: "ScienceService.getTimeCost",
    instantCostHelper: "CommonUtils.handleInstantBuildingCost",
    resourceGoldType: "GoldCostType.getCDResourceType(QueueType.SCIENCE)",
    timeGoldType: "GoldCostType.getCDType(QueueType.SCIENCE)",
    clientGoldAuthoritativePrice: false,
    clientGoldMismatchBehavior: "log-only when nonzero and different from actual server debit",
    completionMethod: "ScienceService.upGradeReturn",
    completionMode: "immediate",
    skillExpFormula: "floor(timeCostMs / 1000 / 60)"
  },
  unresolved: {
    helpers: [
      "CommonUtils.handleResNotEnoughBuildingCost",
      "CommonUtils.handleInstantBuildingCost"
    ],
    reason: "Exact server-side resource/time-to-gold conversion arithmetic is not yet recovered."
  }
});

function nativeScienceResearchGoldPath(gold) {
  if (!Number.isInteger(gold)) return null;
  return gold === 0 ? "RESOURCE_DEBIT" : "SERVER_GOLD_TOPUP";
}

module.exports = {
  LAST_SHELTER_SCIENCE_NATIVE_FLOW,
  nativeScienceResearchGoldPath
};
