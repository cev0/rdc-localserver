"use strict";

const { sourceCatalog } = require("./last_shelter_source_catalog");

function compactEntry(entry) {
  return { groups: entry.groups || [], attributes: entry.attributes || {} };
}

function scanCatalog(name, predicate, limit = 100) {
  const hits = sourceCatalog.entries(name)
    .filter(entry => predicate(entry.attributes || {}, entry.groups || []))
    .slice(0, limit)
    .map(compactEntry);
  sourceCatalog.release(name);
  return hits;
}

const targetBuildingTypes = [
  "401000","402000","403000","404000","407000","410000","411000",
  "412000","413000","414000","415000","416000","417000","418000",
  "419000","423000","424000","425000","426000","427000","428000",
  "429000","431000","432000","433000","434000","435000","436000",
  "437000","438000","439000","440000","441000","442000","443000",
  "444000","445000","446000","447000","448000","449000","450000",
  "451000","452000","460000","461000","462000","464000","465000",
  "466000","467000","468000","469000","472000","477000","478000",
  "479000","480000","481000","482000","483000","484000","485000",
  "486000","487000","488000","489000","532000","533000","535000",
  "536000","537000","538000","539000","540000","541000","542000",
  "543000","544000","545000","546000","547000"
];

const buildingRows = sourceCatalog.rows("building");
const level01 = buildingRows
  .filter(row => targetBuildingTypes.includes(String(Number(row.id || 0) - Number(row.level || 0))))
  .filter(row => Number(row.level || 0) <= 1)
  .map(row => {
    const typeId = String(Number(row.id || 0) - Number(row.level || 0));
    const keep = { typeId };
    for (const key of [
      "id","level","building","building_effect","effect_region","unlock_effect",
      "is_stationed","num","tiles","max_level","craft_time_reduce_ratio",
      "unlock_population","unlock_num","para1","para2","para3","para4","para5",
      "para6","para7","para8","para9","para10","para11","para12"
    ]) {
      if (row[key] != null && String(row[key]) !== "") keep[key] = row[key];
    }
    return keep;
  });
sourceCatalog.release("building");

const relationshipCatalogs = [
  "building_b","building_world","inner_city_map","inner_city_map_1",
  "city","function_on","function_on_b","unlock_attribute","queue_unlock",
  "effect","Function_special"
];

const relationshipHits = {};
for (const name of relationshipCatalogs) {
  relationshipHits[name] = scanCatalog(
    name,
    attrs => {
      const text = JSON.stringify(attrs);
      return targetBuildingTypes.some(id => text.includes(id)) ||
        /(?:^|\D)(406|449)(?:\D|$)/.test(text);
    },
    200
  );
}

console.log("COMMAND_DEPOT_DEEP_PROBE=" + JSON.stringify({
  level01,
  relationshipHits
}));
