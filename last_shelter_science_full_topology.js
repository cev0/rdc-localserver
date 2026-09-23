"use strict";

/*
 * Complete Last Shelter Survival v1.250.102 science topology observed in two
 * identical GetScienceInfo server responses.
 *
 * Only topology/UI-linked fields are promoted here. The captured runtime
 * transformed research_need to "0" and time_research to "1" for every node;
 * those values are deliberately NOT treated as the original XML balance.
 */

const ROWS = Object.freeze([
  ...require("./last_shelter_science_full_rows_1"),
  ...require("./last_shelter_science_full_rows_2"),
  ...require("./last_shelter_science_full_rows_3"),
  ...require("./last_shelter_science_full_rows_4"),
  ...require("./last_shelter_science_full_rows_5")
]);

const GROUP_ROWS =
  require("./last_shelter_science_groups_reference");

const SOURCE = Object.freeze({
  version: "1.250.102",
  endpoint: "GetScienceInfo",
  command: "science.data.init",
  handlerClass: "com.elex.cok.handlers.requesthandlers.science.GetScienceInfo",
  handlerClassSha256: "0ada5557196c609441b31ffa053ce7bb336ed3e1e1449b4ef440834f3524a97e",
  responseFields: Object.freeze(["hasKingdomAct", "scienceGroup", "science", "scienceRecord"]),
  observedHasKingdomAct: 0,
  observedScienceRecordCount: 0,
  dynamicFieldsUnmapped: Object.freeze(["valid", "cd"]),
  verifiedCaptureCount: 2,
  scienceCount: 441,
  scienceGroupCount: 52,
  compactRowsFNV64: "0xcf04499a013cdb01",
  rawScienceSha256:
    "6e6c0e94ea8d075356db21633974e65f3595064288edb5f6de96a0cf4aaf4cfa",
  rawScienceGroupSha256:
    "a32d4e8eebd5dc8bacd9c1c5817eb2df677c48f5cf1789060f79984ee700ce2e"
});

function splitRaw(raw) {
  return (
    typeof raw === "string" &&
    raw.trim()
  )
    ? raw
        .split(";")
        .map(x => x.trim())
        .filter(Boolean)
    : [];
}

function goodsNeedParseEt(raw) {
  const p = splitRaw(raw);

  if (p.length !== 2) {
    return null;
  }

  const amount =
    Number(p[1]);

  if (
    !p[0] ||
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return {
    itemId: p[0],
    amount:
      Math.max(
        0,
        Math.trunc(amount)
      )
  };
}

function rowToNode(r) {
  return Object.freeze({
    itemId: r[0],
    para1: r[1],
    maxLevel: r[2],
    buildingCondition: r[3],
    scienceConditionRaw: r[4],
    goodsNeedRaw: r[5],
    nextPara2: r[6],
    para2: r[7],
    scienceTypeCondition: r[8]
  });
}

const SCIENCE =
  Object.freeze(
    Object.fromEntries(
      ROWS.map(
        r => [
          r[0],
          rowToNode(r)
        ]
      )
    )
  );

const SCIENCE_GROUPS =
  Object.freeze(
    Object.fromEntries(
      GROUP_ROWS.map(
        r => [
          String(r[0]),
          Object.freeze({
            id: r[0],
            effects:
              Object.freeze({
                ...r[1]
              }),
            isActive: r[2]
          })
        ]
      )
    )
  );

function scienceTopologyMelumatiniAl(
  itemId
) {
  const id =
    itemId == null
      ? ""
      : String(itemId).trim();

  const n =
    SCIENCE[id];

  if (!n) {
    return null;
  }

  return {
    ...n,
    scienceConditions:
      splitRaw(
        n.scienceConditionRaw
      ),
    buildingConditions:
      splitRaw(
        n.buildingCondition
      ),
    scienceTypeConditions:
      splitRaw(
        n.scienceTypeCondition
      ),
    goodsNeed:
      goodsNeedParseEt(
        n.goodsNeedRaw
      )
  };
}

function scienceTopologyIdleriniAl() {
  return Object.keys(SCIENCE);
}

function scienceGroupMelumatiniAl(id) {
  return (
    SCIENCE_GROUPS[
      String(id)
    ] ||
    null
  );
}

module.exports = {
  SOURCE,
  ROWS,
  GROUP_ROWS,
  SCIENCE,
  SCIENCE_GROUPS,
  splitRaw,
  goodsNeedParseEt,
  scienceTopologyMelumatiniAl,
  scienceTopologyIdleriniAl,
  scienceGroupMelumatiniAl
};
