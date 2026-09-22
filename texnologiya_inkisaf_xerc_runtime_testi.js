"use strict";

const assert = require("assert");
const fs = require("fs");

const serverSource =
  fs.readFileSync(
    "./server.js",
    "utf8"
  );
const scienceMutationSource =
  fs.readFileSync(
    "./last_shelter_science_mutation.js",
    "utf8"
  );
const scienceRoutesSource =
  fs.readFileSync(
    "./runtime_last_shelter_queue_science_commands.js",
    "utf8"
  );

assert.strictEqual(
  serverSource.includes(
    "developmentModifier.effektivXerc"
  ),
  false,
  "Removed legacy research mutation cost path must not return."
);

assert.strictEqual(
  serverSource.includes(
    '"research_start"'
  ),
  false,
  "Legacy research_start route must stay removed."
);

assert.ok(
  scienceMutationSource.includes(
    "verifiedScienceResourceCost"
  ),
  "Last Shelter science mutation must calculate resource costs from verified source rules."
);

assert.ok(
  scienceMutationSource.includes(
    "verifiedScienceGoodsCost"
  ),
  "Last Shelter science mutation must calculate goods costs from verified source rules."
);

assert.ok(
  scienceMutationSource.includes(
    "sourceScienceEffects(state)"
  ),
  "Science cost/time modifiers must be derived from authoritative state."
);

assert.ok(
  scienceRoutesSource.includes(
    '"science.research"'
  ),
  "Authoritative science.research route must remain registered."
);

console.log(
  "PASS: legacy technology cost mutation is removed and Last Shelter science authority is active."
);
