"use strict";

const assert = require("assert");
const commandCatalog = require("./data/last_shelter/commands.json");
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
assert.deepStrictEqual(flow.unresolved.helpers, [
  "CommonUtils.handleResNotEnoughBuildingCost",
  "CommonUtils.handleInstantBuildingCost"
]);

assert(Object.isFrozen(flow));
assert(Object.isFrozen(flow.research));
assert(Object.isFrozen(flow.directly));
assert(Object.isFrozen(flow.unresolved));

console.log("PASS: verified Last Shelter native science gold/direct control-flow contract.");
