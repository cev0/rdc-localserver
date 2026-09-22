"use strict";

// Evaluate the same production registrar block used by the wiring regression,
// without opening network listeners or a database. Route presence is reported
// separately from behavioral parity; reference/catalog routes are not gameplay.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");
const root = path.join(__dirname, "..");
const requireRoot = createRequire(path.join(root, "server.js"));
const { RuntimeCommandRouter } = requireRoot("./runtime_command_router");
const manifest = requireRoot("./data/last_shelter/manifest.json");
const inventory = requireRoot("./data/last_shelter/commands.json");
const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
const router = new RuntimeCommandRouter();
const context = { runtimeCommandRouter: router, getOrCreatePlayerState: () => ({}),
  runtimeStateSync: { ensureFresh: async () => ({}) }, updateServerTime: () => {} };
for (const match of source.matchAll(/const\s*\{([^}]+)\}\s*=\s*require\("(\.\/runtime_last_shelter_[^"]+)"\);/g)) {
  Object.assign(context, requireRoot(match[2]));
}
const start = source.indexOf("\nlastShelterItemCommandleriniQeydEt(");
const end = source.indexOf("// HTTP SERVER", start);
if (start < 0 || end < start) throw new Error("Production registrar block not found");
vm.runInNewContext(source.slice(start, end), context);
const native = Object.keys(inventory.commands);
const matching = native.filter(name => router.has(name));
const missing = native.filter(name => !router.has(name));
const routeList = router.listRoutes();
const mutationRoutes = [...router._routes].filter(([, route]) => route.mutation).map(([type]) => type).sort();
const referenceOnlyRoutes = routeList.filter(name => /(?:\.reference\.|\.catalog$|\.topology(?:\.|$)|\.list$|\.get$|\.info$|\.state$|\.panel$)/.test(name) && !mutationRoutes.includes(name));
const parity = {
  nativeCommandCoveragePercent: native.length ? Number((matching.length * 100 / native.length).toFixed(2)) : 0,
  nativeCommandsMissing: missing.length,
  productionRoutes: routeList.length,
  productionMutations: mutationRoutes.length,
  productionReadOnly: routeList.length - mutationRoutes.length,
  referenceOrProjectionReads: referenceOnlyRoutes.length
};
const result = {
  complete: false,
  source: { catalogs: manifest.catalogCount, xmlFiles: manifest.sourceXmlFiles, rows: manifest.itemSpecCount,
    excludedFiles: Object.keys(manifest.excluded), nativeCommands: native.length,
    scienceLevels: manifest.catalogs.science.itemSpecCount, buildingLevels: manifest.catalogs.building.itemSpecCount,
    goods: manifest.catalogs.goods.itemSpecCount, shops: manifest.catalogs.shop.itemSpecCount },
  registeredLastShelterRoutes: routeList,
  mutations: mutationRoutes,
  parity,
  nativeNamesWithRoutes: matching,
  nativeNamesWithoutRoutes: missing,
  limitations: [
    "A matching route name does not establish full source behavior or native SmartFox wire compatibility.",
    "The existing RDC gameplay routes are separate and are not counted as absent Last Shelter features by this inventory.",
    "Science gold top-up/direct completion, EnergySkill lifecycle, event/group rewards and non-science effect providers still require ports.",
    "Only HQ balance is overlaid on RDC construction; other source building rows are available as data.",
    "Player database transfer, live server cutover and client end-to-end parity have not been verified."
  ]
};
if (process.argv.includes("--summary")) {
  console.log(JSON.stringify({ complete: false, ...result.source, ...parity,
    mutations: result.mutations, nativeNamesWithRoutes: matching.length,
    nativeNamesWithoutRoutes: missing.length }, null, 2));
} else console.log(JSON.stringify(result, null, 2));
