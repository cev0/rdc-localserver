"use strict";

/*
 * Stable building runtime rows observed across multiple Last Shelter
 * v1.250.102 init snapshots.
 *
 * These are NOT promoted as raw building.xml values: they are server init
 * runtime projections that were byte-for-byte stable across >=2 independent
 * accounts/snapshots after excluding dynamic UUID/position/refresh/hero data.
 * Keeping this catalog separate prevents observed runtime tuning from
 * overwriting the raw building.xml authority.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const BUILDING_RUNTIME_STABLE = deepFreeze({
  "400000:26": { itemId:"400000", level:26, observedSnapshots:3, building:"419000;26|404000;26", wood:105000000, food:105000000, stone:626000, iron:10000000, silver:0, destroy_time:772200, time:1544400, exp:222058, power:327113, para1:"58100;11000", para2:"239100", para3:"43200;0;0;43200", nextLevelParas:"61250;11000,239100,43200;0;0;43200", is_stationed:3, opType:0 },
  "402000:25": { itemId:"402000", level:25, observedSnapshots:4, building:"400000;26", wood:13200000, food:0, stone:550000, iron:2200000, silver:0, destroy_time:144000, time:331200, exp:41313, power:23851, para1:"27", para2:"102", para3:"330000", para4:"26", nextLevelParas:"28,105,360000,27", is_stationed:0, opType:0 },
  "403000:25": { itemId:"403000", level:25, observedSnapshots:3, building:"400000;26", wood:31400000, food:0, stone:327000, iron:2610000, silver:0, destroy_time:192600, time:442800, exp:55449, power:32013, para1:"47", nextLevelParas:"50", is_stationed:4, opType:0 },
  "404000:25": { itemId:"404000", level:25, observedSnapshots:3, building:"400000;26", wood:24700000, food:0, stone:386000, iron:2570000, silver:0, destroy_time:174600, time:403200, exp:50437, power:29119, para1:"640000", para2:"26600", para3:"106600", para4:"640000", nextLevelParas:"660000,27500,110000,660000", is_stationed:6, opType:0 },
  "410000:25": { itemId:"410000", level:25, observedSnapshots:2, building:"400000;26", wood:7000000, food:0, stone:109000, iron:729000, silver:0, destroy_time:55800, time:129600, exp:16209, power:9358, para1:"130", para2:"13", nextLevelParas:"130,14", is_stationed:0, opType:0 },
  "411000:25": { itemId:"411000", level:25, observedSnapshots:3, building:"410000;26", wood:5570000, food:0, stone:87100, iron:580000, silver:0, destroy_time:55800, time:129600, exp:13201, power:7621, para1:"12500", nextLevelParas:"13000", is_stationed:8, opType:0 },
  "412000:1": { itemId:"412000", level:1, observedSnapshots:2, building:"400000;2", wood:280, food:0, stone:0, iron:0, silver:0, destroy_time:291, time:584, exp:15, power:1, para1:"5", para2:"50", para3:"4", nextLevelParas:"10,100,8", is_stationed:0, opType:0 },
  "413000:1": { itemId:"413000", level:1, observedSnapshots:3, building:"", wood:0, food:140, stone:0, iron:0, silver:0, destroy_time:1, time:150, exp:8, power:1, para1:"120", para2:"1200", para3:"2", nextLevelParas:"240,2400,4", is_stationed:0, opType:0 },
  "413000:25": { itemId:"413000", level:25, observedSnapshots:4, building:"400000;26", wood:0, food:5490000, stone:0, iron:0, silver:0, destroy_time:23400, time:57600, exp:6980, power:120, para1:"4656", para2:"46560", para3:"50", nextLevelParas:"4920,49200,52", is_stationed:0, opType:0 },
  "414000:1": { itemId:"414000", level:1, observedSnapshots:2, building:"400000;2", wood:224, food:0, stone:0, iron:0, silver:0, destroy_time:290, time:582, exp:12, power:1, para1:"20", para2:"200", para3:"3", nextLevelParas:"40,400,6", is_stationed:0, opType:0 },
  "415000:1": { itemId:"415000", level:1, observedSnapshots:2, building:"", wood:140, food:0, stone:0, iron:0, silver:0, destroy_time:1, time:150, exp:8, power:1, para1:"120", para2:"1200", para3:"2", nextLevelParas:"240,2400,4", is_stationed:0, opType:0 },
  "415000:25": { itemId:"415000", level:25, observedSnapshots:3, building:"400000;26", wood:5490000, food:0, stone:0, iron:0, silver:0, destroy_time:23400, time:57600, exp:6980, power:120, para1:"4656", para2:"46560", para3:"50", nextLevelParas:"4920,49200,52", is_stationed:0, opType:0 },
  "416000:1": { itemId:"416000", level:1, observedSnapshots:2, building:"413000;2", wood:477, food:0, stone:0, iron:0, silver:0, destroy_time:0, time:326, exp:54, power:6, para1:"1", nextLevelParas:"1", is_stationed:8, opType:0 },
  "417000:25": { itemId:"417000", level:25, observedSnapshots:4, building:"415000;26", wood:16600000, food:0, stone:259000, iron:1730000, silver:0, destroy_time:122400, time:280800, exp:35274, power:20365, para1:"1;2;3;4;5;7;8", para2:"1;7;9;10;11;12", nextLevelParas:"1;2;3;4;5;7;8;9,1;7;9;10;11;12", is_stationed:0, opType:0 },
  "418000:25": { itemId:"418000", level:25, observedSnapshots:4, building:"400000;26", wood:8650000, food:0, stone:135000, iron:901000, silver:0, destroy_time:68400, time:158400, exp:19609, power:11321, para1:"107824", para2:"1", nextLevelParas:"107825,1", is_stationed:10, opType:0 },
  "419000:25": { itemId:"419000", level:25, observedSnapshots:4, building:"400000;26", wood:79000000, food:0, stone:206000, iron:2470000, silver:0, destroy_time:327600, time:752400, exp:94117, power:54337, para1:"62500", para2:"12200", nextLevelParas:"66000,12500", is_stationed:8, opType:0 },
  "423000:25": { itemId:"423000", level:25, observedSnapshots:3, building:"400000;26", wood:32400000, food:18500000, stone:770000, iron:1330000, silver:0, destroy_time:295200, time:676800, exp:84651, power:48871, is_stationed:4, opType:0 },
  "427000:1": { itemId:"427000", level:1, observedSnapshots:2, building:"400000;2", wood:275, food:137, stone:0, iron:0, silver:0, destroy_time:17, time:299, exp:41, power:4, para1:"3000", nextLevelParas:"5000", is_stationed:3, opType:0 },
  "429000:25": { itemId:"429000", level:25, observedSnapshots:4, building:"400000;26", wood:32357236, food:18489849, stone:770410, iron:3081641, silver:0, destroy_time:0, time:676800, exp:84651, power:48871, para1:50, nextLevelParas:"52", is_stationed:0, opType:0 },
  "460000:25": { itemId:"460000", level:25, observedSnapshots:3, building:"400000;26", wood:32400000, food:18489849, stone:770000, iron:3080000, silver:0, destroy_time:294439, time:676800, exp:84651, power:48871, para1:"130000", para2:"86400", para3:"0", para4:"710000", nextLevelParas:"140000,86400,0,760000", is_stationed:0, opType:0 },
  "461000:25": { itemId:"461000", level:25, observedSnapshots:4, building:"400000;26", wood:32400000, food:18489849, stone:770000, iron:3080000, silver:0, destroy_time:294439, time:676800, exp:84651, power:48871, is_stationed:0, opType:0 }
});

function buildingRuntimeStableAl(itemId, level) {
  const key = String(itemId == null ? "" : itemId).trim() + ":" + Math.trunc(Number(level) || 0);
  const row = BUILDING_RUNTIME_STABLE[key];
  return row ? { ...row } : null;
}

function buildingRuntimeStableIdsAl() {
  return Object.keys(BUILDING_RUNTIME_STABLE);
}

function minimumObservationCountAl(itemId, level) {
  const row = buildingRuntimeStableAl(itemId, level);
  return row ? row.observedSnapshots : 0;
}

module.exports = {
  BUILDING_RUNTIME_STABLE,
  buildingRuntimeStableAl,
  buildingRuntimeStableIdsAl,
  minimumObservationCountAl
};
