"use strict";

const assert = require("assert");
const commandCatalog = require("./data/last_shelter/commands.json");
const { sourceCatalog } = require("./last_shelter_source_catalog");
const {
  LAST_SHELTER_SCIENCE_NATIVE_FLOW,
  nativeScienceResearchGoldPath
} = require("./last_shelter_science_native_flow_reference");

const flow = LAST_SHELTER_SCIENCE_NATIVE_FLOW;
assert.strictEqual(commandCatalog.referenceJarSha256, flow.referenceJarSha256);

function assertHandler(section) {
  const rows = commandCatalog.commands[section.command] || [];
  assert(
    rows.some(row =>
      row.class === section.handlerClass &&
      row.classSha256 === section.handlerClassSha256
    ),
    `Verified handler mismatch for ${section.command}`
  );
}

assertHandler(flow.research);
assertHandler(flow.directly);

assert.strictEqual(nativeScienceResearchGoldPath(0), "RESOURCE_DEBIT");
assert.strictEqual(nativeScienceResearchGoldPath(1), "SERVER_GOLD_TOPUP");
assert.strictEqual(nativeScienceResearchGoldPath(999999), "SERVER_GOLD_TOPUP");
assert.strictEqual(nativeScienceResearchGoldPath(-1), "SERVER_GOLD_TOPUP");
assert.strictEqual(nativeScienceResearchGoldPath(-2147483648), "SERVER_GOLD_TOPUP");
assert.strictEqual(nativeScienceResearchGoldPath(2147483647), "SERVER_GOLD_TOPUP");
assert.strictEqual(nativeScienceResearchGoldPath(-2147483649), null);
assert.strictEqual(nativeScienceResearchGoldPath(2147483648), null);
assert.strictEqual(nativeScienceResearchGoldPath(1.5), null);

assert.strictEqual(flow.research.clientGoldAuthoritativePrice, false);
assert.strictEqual(
  flow.research.resourceTopUpHelper,
  "CommonUtils.handleResNotEnoughBuildingCost"
);
assert.strictEqual(flow.research.goodsShortage, "SILVER_MEDAL_NOT_ENOUGH");
assert.deepStrictEqual(flow.research.startSideEffects, {
  activityReduceCostMethod: "MadScientistActivity.recordReduceCost",
  activityType: "SCIENCE",
  queueCostRecordMethod: "QueueManager.researchQueueRecordCost",
  startHook: "ScienceService.onStartResearchScience",
  skillExpMethod: "ScienceService.skillAddExp",
  skillExpFormula: "floor(timeCostMs / 1000 / 60)",
  skillExpCondition: "computedExp > 0"
});

assert.strictEqual(flow.directly.clientGoldAuthoritativePrice, false);
assert.strictEqual(
  flow.directly.instantCostHelper,
  "CommonUtils.handleInstantBuildingCost"
);
assert.strictEqual(
  flow.directly.resourceGoldType,
  "GoldCostType.getCDResourceType(QueueType.SCIENCE)"
);
assert.strictEqual(
  flow.directly.timeGoldType,
  "GoldCostType.getCDType(QueueType.SCIENCE)"
);
assert.strictEqual(flow.directly.completionMode, "immediate");
assert.strictEqual(flow.directly.completionMethod, "ScienceService.upGradeReturn");
assert.strictEqual(flow.directly.skillExpFormula, "floor(timeCostMs / 1000 / 60)");
assert.strictEqual(flow.directly.activityReduceCostMethod, "MadScientistActivity.recordReduceCost");
assert.strictEqual(flow.directly.activityType, "SCIENCE");
assert.strictEqual(flow.directly.activityBuffMethod, "MadScientistActivity.changeActivityBuff");
assert.strictEqual(flow.directly.activityBuffEnabled, true);
assert.strictEqual(flow.directly.startHook, "ScienceService.onStartResearchScience");
assert.strictEqual(flow.directly.skillExpMethod, "ScienceService.skillAddExp");
assert.strictEqual(flow.directly.skillExpCondition, "computedExp > 0");
assert.deepStrictEqual(flow.observedGoldCatalogRows.itemCdGold, {
  catalog: "item",
  id: "cd_gold",
  k1: "24",
  k2: "10",
  k3: "600",
  k4: "100"
});
assert.deepStrictEqual(flow.observedGoldCatalogRows.itemBCdGold, {
  catalog: "item_b",
  id: "cd_gold",
  k1: "24",
  k2: "10",
  k3: "600",
  k4: "100"
});
assert.deepStrictEqual(flow.observedGoldCatalogRows.itemCdCost, {
  catalog: "item",
  id: "cd_cost",
  k1: "1",
  k2: "55",
  k3: "150",
  k4: "400",
  k5: "1000",
  k6: "1800",
  k7: "2500",
  k8: "6500",
  k9: "15000",
  k10: "60000"
});
assert.deepStrictEqual(
  sourceCatalog.row("item", "cd_gold"),
  {id:"cd_gold", k1:"24", k2:"10", k3:"600", k4:"100"}
);
assert.deepStrictEqual(
  sourceCatalog.row("item", "cd_cost"),
  {
    id:"cd_cost", k1:"1", k2:"55", k3:"150", k4:"400", k5:"1000",
    k6:"1800", k7:"2500", k8:"6500", k9:"15000", k10:"60000"
  }
);
sourceCatalog.release("item");
assert.deepStrictEqual(flow.unresolved.helpers, [
  "CommonUtils.handleResNotEnoughBuildingCost",
  "CommonUtils.handleInstantBuildingCost"
]);

assert(Object.isFrozen(flow));
assert(Object.isFrozen(flow.research));
assert(Object.isFrozen(flow.research.startSideEffects));
assert(Object.isFrozen(flow.directly));
assert(Object.isFrozen(flow.observedGoldCatalogRows));
assert(Object.isFrozen(flow.observedGoldCatalogRows.itemCdGold));
assert(Object.isFrozen(flow.observedGoldCatalogRows.itemBCdGold));
assert(Object.isFrozen(flow.observedGoldCatalogRows.itemCdCost));
assert(Object.isFrozen(flow.unresolved));

console.log("PASS: verified Last Shelter native science gold/direct control-flow contract.");
