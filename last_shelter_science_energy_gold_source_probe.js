"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

const TARGET_IDS = Object.freeze(["50046", "61012"]);
const GOLD_SCAN_CATALOG = /science|skill|hero|resource|gold|function|building|goods|item/i;

function valueTokens(value) {
  return String(value == null ? "" : value)
    .split(/[|;,\s:]+/)
    .filter(Boolean);
}

function rowMatchesTarget(row, target) {
  if (!row || typeof row !== "object") return false;
  return Object.values(row).some(value =>
    String(value) === target || valueTokens(value).includes(target)
  );
}

function goldFields(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    const text = `${key}=${value}`;
    if (/gold/i.test(text) || /science/i.test(text) || /research/i.test(text)) {
      out[key] = value;
    }
  }
  return out;
}

for (const target of TARGET_IDS) {
  const matches = [];
  for (const catalogName of sourceCatalog.names()) {
    let rows;
    try {
      rows = sourceCatalog.rows(catalogName);
    } catch (error) {
      sourceCatalog.release(catalogName);
      continue;
    }
    for (const row of rows) {
      if (!rowMatchesTarget(row, target)) continue;
      matches.push({
        catalogName,
        rowId: row.id == null ? null : String(row.id),
        row
      });
    }
    sourceCatalog.release(catalogName);
  }
  console.log("[SCIENCE_SKILL_SOURCE]", target, JSON.stringify(matches));
}

let emitted = 0;
for (const catalogName of sourceCatalog.names()) {
  if (!GOLD_SCAN_CATALOG.test(catalogName)) continue;
  let rows;
  try {
    rows = sourceCatalog.rows(catalogName);
  } catch (error) {
    sourceCatalog.release(catalogName);
    continue;
  }
  for (const row of rows) {
    const fields = goldFields(row);
    if (Object.keys(fields).length === 0) continue;
    const haystack = JSON.stringify(row);
    if (!/gold/i.test(haystack)) continue;
    console.log("[SCIENCE_GOLD_SOURCE]", catalogName, row.id == null ? "" : String(row.id), JSON.stringify(fields));
    emitted += 1;
    if (emitted >= 100) break;
  }
  sourceCatalog.release(catalogName);
  if (emitted >= 100) break;
}

console.log("[SCIENCE_GOLD_SOURCE_COUNT]", emitted);
