"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

const CATALOGS = [
  "gold_price",
  "resources",
  "resources_type",
  "resource2",
  "exchange_price",
  "function_on",
  "Function_special"
];

for (const name of CATALOGS) {
  let rows = [];
  try {
    rows = sourceCatalog.rows(name);
  } catch (error) {
    console.log("[INSTANT_COST_CATALOG_ERROR]", name, error && error.message);
    sourceCatalog.release(name);
    continue;
  }
  console.log("[INSTANT_COST_CATALOG]", name, JSON.stringify(rows));
  sourceCatalog.release(name);
}
