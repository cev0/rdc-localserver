"use strict";

/*
 * Verified structural goods.xml rows from the Last Shelter v1.250.102
 * reference server.
 *
 * The running reference copy had direct price/price_all/price_hot fields
 * temporarily zeroed for probing. Those mutated direct-price fields are
 * therefore excluded here. Structural fields (type, limits, use/useall,
 * para1..para3, not_gift and sales strings) are preserved exactly as observed.
 * Original verified prices remain in last_shelter_goods_reference.js.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const GOODS_STRUCTURE = deepFreeze({
  "200001": { id:"200001", type:0, levelLimit:1, use:1 },
  "200002": { id:"200002", type:0, levelLimit:1, use:0 },
  "200003": { id:"200003", type:0, levelLimit:1, use:0 },
  "200004": { id:"200004", type:0, levelLimit:1, use:0, useAll:1 },
  "200005": { id:"200005", type:0, levelLimit:1, use:0, notGift:1 },
  "200006": { id:"200006", type:0, levelLimit:1, use:0 },
  "200008": { id:"200008", type:0, levelLimit:1, use:1, notGift:1 },
  "200009": { id:"200009", type:0, levelLimit:1, use:0, notGift:1 },
  "200010": { id:"200010", type:0, levelLimit:1, use:1, notGift:1 },
  "200013": { id:"200013", type:0, levelLimit:1, use:1, notGift:1 },
  "200014": { id:"200014", type:0, levelLimit:1, use:1, notGift:1 },
  "200016": { id:"200016", type:0, levelLimit:1, use:0, salesRaw:"1;15|10;120|100;1100|1000;10000" },
  "200017": { id:"200017", type:0, levelLimit:1, use:0 },
  "200018": { id:"200018", type:0, levelLimit:1, use:0 },
  "200020": { id:"200020", type:0, levelLimit:1, use:0, salesRaw:"1;5|10;40|100;400|1000;4000" },
  "200021": { id:"200021", type:0, levelLimit:1, use:1 },
  "200026": { id:"200026", type:0, levelLimit:1, use:1 },
  "200027": { id:"200027", type:0, levelLimit:1, para2:86400, use:1 },
  "200028": { id:"200028", type:0, levelLimit:1, para2:86400, use:1 },
  "200029": { id:"200029", type:0, levelLimit:10, para2:86400, use:1 },

  "200200": { id:"200200", type:2, levelLimit:1, para1:1, para2:1, para3:3600, use:0, useAll:1 },
  "200201": { id:"200201", type:2, levelLimit:1, para1:1, para2:1, para3:300, use:0, useAll:1 },
  "200202": { id:"200202", type:2, levelLimit:1, para1:1, para2:1, para3:28800, use:0, useAll:1 },
  "200203": { id:"200203", type:2, levelLimit:1, para1:4, para2:1, para3:300, use:0, useAll:1 },
  "200204": { id:"200204", type:2, levelLimit:1, para1:4, para2:1, para3:7200, use:0, useAll:1 },
  "200205": { id:"200205", type:2, levelLimit:1, para1:6, para2:1, para3:300, use:0, useAll:1 },
  "200206": { id:"200206", type:2, levelLimit:1, para1:6, para2:1, para3:7200, use:0, useAll:1 },
  "200207": { id:"200207", type:2, levelLimit:1, para1:3, para2:1, para3:300, use:0, useAll:1 },
  "200208": { id:"200208", type:2, levelLimit:1, para1:3, para2:1, para3:7200, use:0, useAll:1 },
  "200209": { id:"200209", type:2, levelLimit:1, para1:4, para2:1, para3:28800, use:0, useAll:1 },
  "200210": { id:"200210", type:2, levelLimit:1, para1:4, para2:1, para3:3600, use:0, useAll:1 },
  "200215": { id:"200215", type:2, levelLimit:1, para1:7, para2:1, para3:300, use:0, useAll:1 },
  "200216": { id:"200216", type:2, levelLimit:1, para1:7, para2:1, para3:7200, use:0, useAll:1 },
  "200217": { id:"200217", type:2, levelLimit:1, para1:5, para2:1, para3:300, use:0, useAll:1 },
  "200218": { id:"200218", type:2, levelLimit:1, para1:5, para2:1, para3:7200, use:0, useAll:1 }
});

function goodsStructureAl(itemId) {
  const id = itemId == null ? "" : String(itemId).trim();
  const row = GOODS_STRUCTURE[id];
  return row ? { ...row } : null;
}

function goodsStructureIdsAl() {
  return Object.keys(GOODS_STRUCTURE);
}

function salesRawEntriesAl(itemId) {
  const row = goodsStructureAl(itemId);
  if (!row || typeof row.salesRaw !== "string" || !row.salesRaw.trim()) return [];

  return row.salesRaw.split("|").map(segment => {
    const [countRaw, totalPriceRaw] = segment.split(";");
    const count = Number(countRaw);
    const totalPrice = Number(totalPriceRaw);
    return Number.isFinite(count) && Number.isFinite(totalPrice)
      ? { count:Math.trunc(count), totalPrice:Math.trunc(totalPrice) }
      : null;
  }).filter(Boolean);
}

module.exports = {
  GOODS_STRUCTURE,
  goodsStructureAl,
  goodsStructureIdsAl,
  salesRawEntriesAl
};
