"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const kod =
  fs.readFileSync(
    path.join(__dirname, "server.js"),
    "utf8"
  );

for (const legacy of [
  "function completeFinishedJobsForAllPlayers",
  "function completeTechnologyResearchForAllPlayers",
  "function pushStateLocalMapToStatePlayers(stateId)"
]) {
  assert.strictEqual(
    kod.includes(legacy),
    false,
    "Legacy RAM/global-scan helper server runtime-da qalmamalıdır: " + legacy
  );
}

assert.strictEqual(
  kod.includes("for (const [playerId, state] of players)"),
  false,
  "Server runtime global players Map scan etməməlidir."
);

assert.ok(
  kod.includes("RuntimeDeadlineScheduler"),
  "Deadline-driven scheduler global player scan əvəzinə aktiv qalmalıdır."
);

assert.ok(
  kod.includes("pushStateLocalMapToStatePlayersAuthoritative"),
  "Cross-instance local-map broadcast PostgreSQL-authoritative sender istifadə etməlidir."
);

console.log(
  "PASS: legacy RAM-only global player scans and local-map broadcaster are absent."
);
