"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

const targetId = /^(cd_gold|transport_cd_gold|goldbuild)$/i;
const semanticId = /(science.*gold|gold.*science|research.*gold|gold.*research|cd_gold|goldbuild)/i;
let count = 0;

for (const catalogName of sourceCatalog.names()) {
  let rows;
  try {
    rows = sourceCatalog.rows(catalogName);
  } catch {
    sourceCatalog.release(catalogName);
    continue;
  }
  for (const row of rows) {
    const id = String(row.id ?? "");
    if (!targetId.test(id) && !semanticId.test(id)) continue;
    console.log("[SCIENCE_GOLD_CATALOG_PROBE]", catalogName, JSON.stringify(row));
    count += 1;
    if (count >= 100) break;
  }
  sourceCatalog.release(catalogName);
  if (count >= 100) break;
}
console.log("[SCIENCE_GOLD_CATALOG_PROBE_COUNT]", count);
