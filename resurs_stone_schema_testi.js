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
const {
  LAST_SHELTER_RESURS_IDLERI,
  canonicalResursIdAl,
  lastShelterResursudur,
  legacyOnlyResursdur,
  canonicalResursObyektiHazirla
} = require("./last_shelter_resurs_kataloqu");

function blokAl(startText, endText) {
  const start = serverKod.indexOf(startText);
  const end = serverKod.indexOf(endText, start + startText.length);
  assert.ok(start >= 0 && end > start, startText + " bloku tapılmalıdır.");
  return serverKod.slice(start, end);
}

assert.deepStrictEqual(
  LAST_SHELTER_RESURS_IDLERI,
  ["chip", "electricity", "water", "food", "stone", "diamond", "money", "iron", "silver", "wood"],
  "Canonical resource schema verified Last Shelter new-account response ilə eyni olmalıdır."
);
assert.strictEqual(canonicalResursIdAl("chips"), "chip");
assert.strictEqual(canonicalResursIdAl("stone"), "stone");
assert.strictEqual(lastShelterResursudur("silver"), true);
assert.strictEqual(lastShelterResursudur("fuel"), false);
assert.strictEqual(legacyOnlyResursdur("fuel"), true);
assert.deepStrictEqual(
  canonicalResursObyektiHazirla({ chip: 2, chips: 3, stone: 9, silver: "7", fuel: 999 }),
  { chip: 5, electricity: 0, water: 0, food: 0, stone: 9, diamond: 0, money: 0, iron: 0, silver: 7, wood: 0 }
);

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
