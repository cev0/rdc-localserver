"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

function slim(row) {
  const out={};
  for (const [k,v] of Object.entries(row||{})) {
    if (v == null || String(v) === "") continue;
    if (/^(id|building|army|arms|science|type|level|max|num|para\d+|effect|unlock|queue|promot|upgrade|train|storage|resource|capacity|need|condition|function)/i.test(k)) out[k]=v;
  }
  return out;
}

const catalogs=["army","arms","queue_unlock","function_on","function_on_b","effect","Function_special","resources_type","facility"];
const schemas={};
for (const name of catalogs) {
  const rows=sourceCatalog.rows(name);
  const keys=[...new Set(rows.flatMap(row=>Object.keys(row)))].sort();
  const keywordRows=rows.filter(row => {
    const text=JSON.stringify(row);
    return /(promot|upgrade|train|storage|warehouse|command|depot|soldier|troop|army|building)/i.test(text);
  }).slice(0,100).map(slim);
  schemas[name]={keys,sample:rows.slice(0,12).map(slim),keywordRows};
  sourceCatalog.release(name);
}
console.log("COMMAND_DEPOT_SCHEMA_PROBE="+JSON.stringify(schemas));

const extraArms = sourceCatalog.rows("arms").filter(row => String(row.id || "").startsWith("1079")).slice(0, 100);
sourceCatalog.release("arms");
const extraBuilding = sourceCatalog.rows("building").filter(row => ["416000","417000","419000","426000","427000","435000","444000","447000","448000"].includes(String(Number(row.id || 0) - Number(row.level || 0)))).filter(row => [0,1,5,10,15,20,25,29,30].includes(Number(row.level || 0)));
sourceCatalog.release("building");
console.log("COMMAND_CENTER_EXTRA_PROBE=" + JSON.stringify({extraArms, extraBuilding}));
