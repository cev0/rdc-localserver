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
