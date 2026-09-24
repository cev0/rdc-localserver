"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

const VALUE_RE = /(rally|assembly|gather|storage|warehouse|depot|command|march|team|queue|army)/i;
const KEY_RE = /(rally|assembly|gather|storage|warehouse|depot|command|march|team|queue|army)/i;

const interestingCatalogs = sourceCatalog.names().filter(name =>
  /(building|city|army|queue|position|facility|unlock|march|team|storage|warehouse|rally|assembly)/i.test(name)
);

const hits=[];

for(const name of interestingCatalogs){
  const entries=sourceCatalog.entries(name);
  const found=[];

  for(const entry of entries){
    const attrs=entry.attributes||{};
    const keyHit=Object.keys(attrs).some(k=>KEY_RE.test(k));
    const valueHit=Object.values(attrs).some(v=>VALUE_RE.test(String(v)));
    if(!keyHit&&!valueHit) continue;

    found.push({
      groups:entry.groups||[],
      attributes:attrs
    });

    if(found.length>=60) break;
  }

  if(found.length>0){
    hits.push({catalog:name,hits:found});
  }

  sourceCatalog.release(name);
}

const buildingRows=sourceCatalog.rows("building");
const candidates=buildingRows.filter(row=>{
  const id=String(row.id||"");
  if(!/^4\d{5}$/.test(id)) return false;
  if(Number(row.level||0)>4) return false;
  const values=Object.entries(row)
    .filter(([k])=>/^para\d+$/.test(k)||/station|num|building|unlock/i.test(k))
    .map(([,v])=>String(v));
  return values.some(v=>/^(?:0|1|2|3|4|5|10|20|25|30|40|50|100|200|300)$/.test(v));
}).slice(0,500);

sourceCatalog.release("building");

console.log("COMMAND_DEPOT_SEMANTIC_PROBE="+JSON.stringify({hits,candidates}));
