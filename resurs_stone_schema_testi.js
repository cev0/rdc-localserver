"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const serverKod = fs.readFileSync(
  path.join(__dirname, "server.js"),
  "utf8"
);

const {
  lastShelterServerBaslangicResurslariniAl
} = require("./last_shelter_baslangic_resurslari");

function blokAl(startText, endText) {
  const start = serverKod.indexOf(startText);
  const end = serverKod.indexOf(endText, start + startText.length);
  assert.ok(start >= 0 && end > start, startText + " bloku tapılmalıdır.");
  return serverKod.slice(start, end);
}

const ensureBloku = blokAl(
  "function ensureResourcesObject",
  "function normalizeMissionId"
);

assert.ok(
  ensureBloku.includes("stone: 0"),
  "Köhnə snapshot-lar restore olunanda stone resursu 0 ilə tamamlanmalıdır."
);
assert.ok(
  ensureBloku.includes('"stone"'),
  "stone authoritative resource key siyahısında olmalıdır."
);

const capBloku = blokAl(
  "function getBaseResourceCaps",
  "function getStorageRule"
);
assert.ok(
  capBloku.includes("stone: 100000"),
  "stone üçün server-side storage cap olmalıdır."
);

const defaultBloku = blokAl(
  "function makeDefaultState",
  "function getOrCreatePlayerState"
);
assert.ok(
  defaultBloku.includes(
    "lastShelterServerBaslangicResurslariniAl()"
  ),
  "Yeni oyunçu resursları Last Shelter başlanğıc kataloqundan gəlməlidir."
);
assert.strictEqual(
  lastShelterServerBaslangicResurslariniAl().stone,
  1500,
  "Yeni oyunçu Last Shelter qaydasına görə 1500 daşla başlamalıdır."
);

const spendBloku = blokAl(
  "function hasEnoughResources",
  "function isGarageBuildingId"
);
assert.ok(
  spendBloku.includes("state.resources[key]"),
  "Generic resource check/spend stone daxil olmaqla schema key-lərini işlətməlidir."
);

console.log("[RESURS_STONE_SCHEMA_TESTI] OK");
