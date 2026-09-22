"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const serverSource = fs.readFileSync(
  path.join(__dirname,"server.js"),
  "utf8"
);

const registrars = [
  {
    module:"runtime_last_shelter_engagement_commands",
    functionName:"lastShelterEngagementCommandleriniQeydEt"
  },
  {
    module:"runtime_last_shelter_mission_commands",
    functionName:"lastShelterMissionCommandleriniQeydEt"
  },
  {
    module:"runtime_last_shelter_building_reference_commands",
    functionName:"lastShelterBuildingReferenceCommandleriniQeydEt"
  }
];

for (const registrar of registrars) {
  assert.ok(
    serverSource.includes(
      `require("./${registrar.module}")`
    ),
    `${registrar.module} production server tərəfindən import edilməlidir.`
  );

  const callMatches = serverSource.match(
    new RegExp(
      registrar.functionName + "\\s*\\(",
      "g"
    )
  ) || [];

  assert.strictEqual(
    callMatches.length,
    1,
    `${registrar.functionName} production serverdə dəqiq bir dəfə qeydiyyata alınmalıdır.`
  );
}

console.log(
  "PASS: verified Last Shelter building, mission and engagement routes are wired into production exactly once."
);

// Execute the actual production registration block with the real router.
// Database connections and listeners are deliberately outside this block.
const vm = require("vm");
const { RuntimeCommandRouter } = require("./runtime_command_router");
const runtimeCommandRouter = new RuntimeCommandRouter();
const state = {};
const context = {
  runtimeCommandRouter,
  getOrCreatePlayerState: () => state,
  runtimeStateSync: { ensureFresh: async () => state },
  updateServerTime: () => {}
};
const imports = /const\s*\{([^}]+)\}\s*=\s*require\("(\.\/runtime_last_shelter_[^"]+)"\);/g;
for (const match of serverSource.matchAll(imports)) {
  Object.assign(context, require(match[2]));
}
const start = serverSource.indexOf("\nlastShelterItemCommandleriniQeydEt(");
const end = serverSource.indexOf("// HTTP SERVER", start);
assert(start >= 0 && end > start, "Production registration block must exist");
vm.runInNewContext(serverSource.slice(start, end), context);
for (const type of ["mission.info", "engagement.info", "building.reference.list",
  "repay.info", "alliance.group_purchase.info", "last_shelter.init"]) {
  assert(runtimeCommandRouter.has(type), `Missing production route: ${type}`);
}
console.log(`PASS: actual production block registers ${runtimeCommandRouter.listRoutes().length} Last Shelter routes without collisions.`);
