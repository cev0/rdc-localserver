"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  mappedLastShelterBuildingTypeId
} = require("./last_shelter_building_identity_bridge");

const {
  verifiedLastShelterBuildingLevelDataAl,
  verifiedLastShelterBuildingLevelStatusAl
} = require("./last_shelter_building_runtime_overlay");

const source = fs.readFileSync(
  path.join(__dirname, "server.js"),
  "utf8"
);

assert.ok(
  source.includes("const LEGACY_RDC_BUILDING_LEVEL_CONFIG = {"),
  "Unmapped RDC level fallback must be explicitly marked compatibility-only."
);

assert.ok(
  !source.includes("const BUILDING_LEVEL_CONFIG = {"),
  "Old generic custom building level source must be removed."
);

const legacyLevelStart =
  source.indexOf("const LEGACY_RDC_BUILDING_LEVEL_CONFIG = {");
const legacyMetaStart =
  source.indexOf("const LEGACY_RDC_BUILDING_DEFINITION_META = {");

assert.ok(legacyLevelStart >= 0);
assert.ok(legacyMetaStart > legacyLevelStart);

const legacyLevelBlock =
  source.slice(legacyLevelStart, legacyMetaStart);

assert.ok(!/^\s*hq\s*:/m.test(legacyLevelBlock));
assert.ok(!/^\s*road\s*:/m.test(legacyLevelBlock));

const legacyMetaEnd =
  source.indexOf(
    "let EXTERNAL_BUILDING_DEFINITION_META",
    legacyMetaStart
  );

const legacyMetaBlock =
  source.slice(legacyMetaStart, legacyMetaEnd);

for (const mappedAlias of [
  "bank",
  "embassy",
  "hospital",
  "house",
  "hq",
  "ration_truck",
  "road",
  "tower",
  "institute"
]) {
  assert.ok(
    !new RegExp(
      '^\\s*"' + mappedAlias + '"\\s*:',
      "m"
    ).test(legacyMetaBlock),
    mappedAlias + " must not keep duplicate legacy metadata."
  );
}

// Farm placement remains an explicit compatibility exception only until an
// original Last Shelter placement source is recovered.
assert.ok(
  /^\s*"farm"\s*:/m.test(legacyMetaBlock),
  "Farm resource-slot compatibility must remain explicit, not guessed."
);

for (const [alias, numericId] of [
  ["hq", "400000"],
  ["road", "436000"],
  ["farm", "415000"],
  ["institute", "403000"]
]) {
  assert.strictEqual(
    mappedLastShelterBuildingTypeId(alias),
    numericId
  );
}

const hqLevel1 =
  verifiedLastShelterBuildingLevelDataAl("hq", 1);

assert.ok(hqLevel1);
assert.strictEqual(hqLevel1.buildingTypeId, "400000");

const hqPastCap =
  verifiedLastShelterBuildingLevelStatusAl("hq", 26);

assert.strictEqual(hqPastCap.mapped, true);
assert.strictEqual(hqPastCap.withinDeclaredMax, false);
assert.strictEqual(hqPastCap.verified, false);

assert.ok(
  source.includes(
    'verifiedCoverage.mapped &&\n    !verifiedCoverage.verified'
  ),
  "Mapped level gaps/out-of-cap levels must fail closed before legacy fallback."
);

assert.ok(
  source.includes(
    "if (mappedLastShelterBuildingTypeId(id)) {\n          continue;"
  ),
  "Old building_definitions exports must be ignored for mapped Last Shelter IDs."
);

console.log(
  "PASS: mapped Last Shelter buildings cannot fall back to old RDC balance/metadata."
);
