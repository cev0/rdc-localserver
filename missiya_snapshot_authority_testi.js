"use strict";

const assert =
  require("assert");

const {
  gameplaySnapshotiTelebOlunur
} = require("./missiya_handler");

const postgresAuthoritativeMesajlar = [
  "expand_area_request",
  "expand_base",
  "build_request",
  "train_unit_request",
  "upgrade_request",
  "base_teleport_request",
  "move_request",
  "connect_road_request",
  "start_construction_request"
];

for (
  const type of
  postgresAuthoritativeMesajlar
) {
  assert.strictEqual(
    gameplaySnapshotiTelebOlunur(
      type
    ),
    false,
    type +
      " üçün legacy setImmediate snapshot writer aktiv qalmamalıdır."
  );
}

assert.strictEqual(
  gameplaySnapshotiTelebOlunur(
    "mission_list_request"
  ),
  false
);

assert.strictEqual(
  gameplaySnapshotiTelebOlunur(
    "unknown_mutation_request"
  ),
  false
);

console.log(
  "PASS: mission observer does not schedule legacy snapshots for PostgreSQL-authoritative gameplay mutations."
);
