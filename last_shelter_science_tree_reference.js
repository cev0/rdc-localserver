"use strict";

/*
 * Last Shelter Survival v1.250.102 GetScienceInfo runtime topology reference.
 *
 * IMPORTANT:
 * - This is a bulk topology projection from the verified server response.
 * - It intentionally does NOT treat response research_need/time_research as
 *   original science.xml balance values. Those response fields are runtime-
 *   transformed on the captured server and remain separate from the raw XML
 *   catalog in last_shelter_science_kataloqu.js.
 * - scienceConditionRaw keeps the server's level-specific prerequisite IDs
 *   verbatim. No root/level inference is performed here.
 */

function row(
  itemId,
  para1,
  maxLevel,
  buildingCondition = "",
  scienceConditionRaw = "",
  goodsNeedRaw = "",
  nextPara2 = "1",
  para2 = "0",
  scienceTypeCondition = ""
) {
  return Object.freeze({
    itemId,
    para1,
    maxLevel,
    buildingCondition,
    scienceConditionRaw,
    goodsNeedRaw,
    nextPara2,
    para2,
    scienceTypeCondition
  });
}

const RAW_SCIENCE_TREE = Object.freeze({
  "901000": row("901000", "801", 1, "403001"),
  "901100": row("901100", "802", 1, "403001"),
  "901200": row("901200", "803", 1, "403001"),
  "901300": row("901300", "804", 1, "403001"),
  "901400": row("901400", "805", 1, "403001"),
  "901500": row("901500", "806", 1, "403001"),
  "901600": row("901600", "816", 1, "403001", "901401;901501"),
  "901700": row("901700", "807", 5, "403001", "901601", "", "5"),
  "901800": row("901800", "808", 5, "403001", "901601", "", "5"),
  "901900": row("901900", "809", 5, "403001", "901701", "", "5"),
  "902000": row("902000", "810", 5, "403001", "901801", "", "5"),
  "902100": row("902100", "811", 5, "403001", "901901", "", "5"),
  "902200": row("902200", "812", 5, "403001", "902001", "", "5"),
  "902300": row("902300", "814", 1, "403001", "902205;902105"),
  "902400": row("902400", "813", 5, "403001", "902301", "", "2"),
  "902500": row("902500", "820", 1, "403001", "", "210163;5"),
  "902600": row("902600", "979", 5, "403003", "902803", "210163;1", "5"),
  "902700": row("902700", "980", 5, "403003", "902803", "210163;1", "5"),
  "902800": row("902800", "832|833|834|835|836|837|838", 5, "403003", "974501;970501;972501", "210163;1", "5"),
  "902900": row("902900", "981", 5, "403005", "903103", "210163;2", "5"),
  "903000": row("903000", "982", 5, "403005", "903103", "210163;2", "5"),
  "903100": row("903100", "822", 5, "403005", "980001;980101;980201", "210163;2", "10"),
  "903200": row("903200", "983", 5, "403007", "903403", "210163;3", "5"),
  "903300": row("903300", "984", 5, "403007", "903403", "210163;3", "5"),
  "903400": row("903400", "823", 5, "403006", "902902;903002", "210163;5", "4"),
  "903500": row("903500", "827", 5, "403005", "903203;903303", "210163;5", "5"),
  "903600": row("903600", "828", 1, "403005", "903505", "210163;180", "5"),
  "903700": row("903700", "828", 1, "403005", "903505", "210163;180", "15", "10"),

  "904000": row("904000", "840", 1),
  "904100": row("904100", "843", 5, "403001", "904001", "", "5"),
  "904200": row("904200", "844", 5, "403001", "904001", "", "5"),
  "904300": row("904300", "1031|1032", 10, "403002", "904101", "", "2"),
  "904400": row("904400", "1035|1036", 10, "403002", "904201;904101", "", "2"),
  "904500": row("904500", "1033|1034", 10, "403002", "904201", "", "2"),
  "904600": row("904600", "841", 1, "403004", "904701"),
  "904700": row("904700", "845", 1, "403003", "904305;904405;904505"),
  "904800": row("904800", "846", 1, "403004", "904601"),
  "904900": row("904900", "1011|1012", 10, "403004", "905301", "", "2"),
  "905000": row("905000", "1015|1016", 10, "403004", "905301;905501", "", "2"),
  "905100": row("905100", "1013|1014", 10, "403004", "905501", "", "2"),
  "905200": row("905200", "842", 1, "403006", "905110;904910;905010"),
  "905300": row("905300", "847", 5, "403004", "904801", "", "5"),
  "905500": row("905500", "849", 5, "403004", "904801", "", "6"),

  "905600": row("905600", "840", 1),
  "905700": row("905700", "843", 5, "403001", "905601", "", "5"),
  "905800": row("905800", "844", 5, "403001", "905601", "", "5"),
  "905900": row("905900", "1031|1032", 10, "403002", "905701", "", "2"),
  "906000": row("906000", "1035|1036", 10, "403002", "905801;905701", "", "2"),
  "906100": row("906100", "1033|1034", 10, "403002", "905801", "", "2"),
  "906200": row("906200", "841", 1, "403004", "906301"),
  "906300": row("906300", "845", 1, "403003", "905905;906005;906105"),
  "906400": row("906400", "846", 1, "403004", "906201"),
  "906500": row("906500", "1011|1012", 10, "403004", "906901", "", "2"),
  "906600": row("906600", "1015|1016", 10, "403004", "906901;907101", "", "2"),
  "906700": row("906700", "1013|1014", 10, "403004", "907101", "", "2"),
  "906800": row("906800", "842", 1, "403006", "906710;906510;906610", "", "1", "0", "20004002"),
  "906900": row("906900", "847", 5, "403004", "906401", "", "5"),
  "907100": row("907100", "849", 5, "403004", "906401", "", "6")
});

function splitRaw(raw) {
  return typeof raw === "string" && raw.trim()
    ? raw.split(";").map(x => x.trim()).filter(Boolean)
    : [];
}

function goodsNeedParseEt(raw) {
  const parts = splitRaw(raw);
  if (parts.length !== 2) return null;

  const amount = Number(parts[1]);
  if (!parts[0] || !Number.isFinite(amount)) {
    return null;
  }

  return {
    itemId: parts[0],
    amount: Math.max(0, Math.trunc(amount))
  };
}

function scienceTreeMelumatiniAl(itemId) {
  const id = itemId == null ? "" : String(itemId).trim();
  const value = RAW_SCIENCE_TREE[id];

  if (!value) return null;

  return {
    ...value,
    scienceConditions:
      splitRaw(value.scienceConditionRaw),
    goodsNeed:
      goodsNeedParseEt(value.goodsNeedRaw)
  };
}

function scienceTreeIdleriniAl() {
  return Object.keys(RAW_SCIENCE_TREE);
}

module.exports = {
  RAW_SCIENCE_TREE,
  splitRaw,
  goodsNeedParseEt,
  scienceTreeMelumatiniAl,
  scienceTreeIdleriniAl
};
