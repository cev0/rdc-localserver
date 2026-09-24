"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

function entriesWith(catalogName, predicate) {
  const entries=sourceCatalog.entries(catalogName);
  const hits=entries
    .filter(entry=>predicate(entry.attributes||{},entry.groups||[]))
    .map(entry=>({groups:entry.groups||[],attributes:entry.attributes||{}}));
  sourceCatalog.release(catalogName);
  return hits;
}

const effect406=entriesWith("effect",(a)=>String(a.id||"")==="406" || JSON.stringify(a).includes('"406"'));
const effect449=entriesWith("effect",(a)=>String(a.id||"")==="449" || JSON.stringify(a).includes('"449"'));

const buildingB429=entriesWith("building_b",(a)=>JSON.stringify(a).includes("429000") || /^4290\d\d$/.test(String(a.id||"")));
const buildingWorld429=entriesWith("building_world",(a)=>JSON.stringify(a).includes("429000") || /^4290\d\d$/.test(String(a.id||"")));
const city429=entriesWith("city",(a)=>JSON.stringify(a).includes("429000"));
const unlock429=entriesWith("unlock_attribute",(a)=>JSON.stringify(a).includes("429000") || ["406","449"].some(v=>JSON.stringify(a).includes(v)));

const directBuildingRows=sourceCatalog.rows("building")
  .filter(row=>/^4290(?:00|01|02|03|04)$/.test(String(row.id||"")));
sourceCatalog.release("building");

console.log("COMMAND_DEPOT_EFFECT_PROBE="+JSON.stringify({
  effect406,
  effect449,
  buildingB429,
  buildingWorld429,
  city429,
  unlock429,
  directBuildingRows
}));
