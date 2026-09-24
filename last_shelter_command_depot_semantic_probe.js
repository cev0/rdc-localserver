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

const fingerprintRows=sourceCatalog.rows("building");
const fingerprintHits=fingerprintRows.filter(row=>{
  const n=k=>Number(row[k]||0);
  return (
    (n("level")===1 && n("money")===6300 && n("time")===2040) ||
    (n("level")===1 && n("money")===22000 && n("time")===1800) ||
    (n("level")===1 && n("time")===480 && n("money")===630) ||
    (n("level")===1 && n("power")===28) ||
    (n("level")===1 && n("power")===2 && (n("para1")===100 || n("para1")===110))
  );
});
sourceCatalog.release("building");
console.log("BUILDING_FINGERPRINT_PROBE="+JSON.stringify(fingerprintHits));

const storageSource=sourceCatalog.rows("building");
const storageRoots=["437000","438000","439000","440000","441000","442000"];
const storageGraph={};
for(const root of storageRoots){
  storageGraph[root]={
    rows:storageSource.filter(r=>String(Number(r.id||0)-Number(r.level||0))===root)
      .filter(r=>[0,1,2,5,9,10].includes(Number(r.level||0))),
    dependents:storageSource.filter(r=>Number(r.level||0)===0 && String(r.building||"").split("|").some(x=>{
      const [id,lvl]=x.split(";");
      return id===root && Number(lvl)>=9;
    })).map(r=>({
      typeId:String(Number(r.id||0)-Number(r.level||0)),
      ...r
    }))
  };
}
sourceCatalog.release("building");
console.log("STORAGE_GRAPH_PROBE="+JSON.stringify(storageGraph));

const producerSource=sourceCatalog.rows("building");
const producerIds=["412000","413000","414000","415000","431000","432000"];
const producerRows={};
for(const root of producerIds){
  producerRows[root]=producerSource.filter(r=>String(Number(r.id||0)-Number(r.level||0))===root)
    .filter(r=>[0,1,2,3,4,5,10,15,20,25].includes(Number(r.level||0)));
}
sourceCatalog.release("building");
console.log("RESOURCE_PRODUCER_PROBE="+JSON.stringify(producerRows));

const storageTierSource=sourceCatalog.rows("building");
const storageTierIds=["520000","521000","522000","523000","524000","525000","526000","527000","528000","529000","530000","531000"];
const storageTierRows={};
for(const root of storageTierIds){
  storageTierRows[root]=storageTierSource.filter(r=>String(Number(r.id||0)-Number(r.level||0))===root)
    .filter(r=>[0,1,9,10].includes(Number(r.level||0)));
}
sourceCatalog.release("building");
console.log("STORAGE_TIER_PROBE="+JSON.stringify(storageTierRows));



const candidateBuildingIds=[
  "410000","416000","417000","419000","426000","427000","435000",
  "444000","446000","447000","448000","462000","483000","486000"
];

function compactSemanticEntry(entry){
  const attrs=entry && entry.attributes || {};
  const keep={};
  for(const [k,v] of Object.entries(attrs)){
    if(v == null || String(v)==="") continue;
    if(/^(id|name|type|value|building|building_id|buildingid|army|arm|arms|level|effect|function|para\d+|science|skill|item|resource|capacity|queue|unlock|description|desc|text|key)$/i.test(k)){
      keep[k]=v;
    }
  }
  return {
    groups:Array.isArray(entry && entry.groups) ? entry.groups : [],
    attributes:keep
  };
}

const semanticRegex=/(command[_ -]?center|depot|warehouse|storage|garrison|barrack|military|radar|clone|chip[_ -]?building|hero(?:es)?[_ -]?hall|management[_ -]?station|commercial[_ -]?hub)/i;
const candidateCrossRefs=Object.fromEntries(candidateBuildingIds.map(id=>[id,[]]));
const semanticTextHits=[];

for(const catalogName of sourceCatalog.names()){
  if(catalogName==="building") continue;
  const entries=sourceCatalog.entries(catalogName);
  for(const entry of entries){
    const raw=JSON.stringify(entry && entry.attributes || {});
    for(const candidateId of candidateBuildingIds){
      const bucket=candidateCrossRefs[candidateId];
      if(bucket.length<60 && raw.includes(candidateId)){
        bucket.push({
          catalog:catalogName,
          ...compactSemanticEntry(entry)
        });
      }
    }
    if(semanticTextHits.length<220 && semanticRegex.test(raw)){
      semanticTextHits.push({
        catalog:catalogName,
        ...compactSemanticEntry(entry)
      });
    }
  }
  sourceCatalog.release(catalogName);
}

console.log("CANDIDATE_BUILDING_CROSS_REFS="+JSON.stringify(candidateCrossRefs));
console.log("COMMAND_DEPOT_TEXT_HITS="+JSON.stringify(semanticTextHits));


const buildingBSemanticRoots=sourceCatalog.rows("building_b")
  .filter(row=>Number(row.level||0)===0 && semanticRegex.test(JSON.stringify(row)))
  .map(row=>({...row}));
sourceCatalog.release("building_b");
console.log("BUILDING_B_SEMANTIC_ROOTS="+JSON.stringify(buildingBSemanticRoots));


const remainingRootIds=[
  "401000","404000","407000","410000","417000","419000","427000",
  "428000","429000","435000","444000","447000","448000","461000",
  "462000","483000","486000"
];
const remainingRootRows={};
for(const catalogName of ["building","building_b"]){
  const rows=sourceCatalog.rows(catalogName);
  remainingRootRows[catalogName]=Object.fromEntries(
    remainingRootIds.map(id=>[
      id,
      rows.filter(row=>String(Number(row.id||0)-Number(row.level||0))===id)
        .filter(row=>[0,1,2,5,10,15,20,25,29,30].includes(Number(row.level||0)))
    ])
  );
  sourceCatalog.release(catalogName);
}
console.log("REMAINING_BUILDING_ROOT_ROWS="+JSON.stringify(remainingRootRows));

const semanticCatalogs=["city","inner_city_map","inner_city_map_1","facility","alliance_language","building_world","eventBuilding"];
const semanticCatalogSamples={};
for(const catalogName of semanticCatalogs){
  const entries=sourceCatalog.entries(catalogName);
  semanticCatalogSamples[catalogName]=entries.filter(entry=>{
    const raw=JSON.stringify(entry && entry.attributes || {});
    return remainingRootIds.some(id=>raw.includes(id)) ||
      /(command[_ -]?center|depot|warehouse|garrison|barrack|radar|clone|chip|military)/i.test(raw);
  }).slice(0,200);
  sourceCatalog.release(catalogName);
}
console.log("REMAINING_SEMANTIC_CATALOG_HITS="+JSON.stringify(semanticCatalogSamples));
