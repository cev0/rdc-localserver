"use strict";

/*
 * Verified Last Shelter alliance runtime contract.
 *
 * Sources:
 * - non-empty reference init.alliance payload (field/schema shape)
 * - reference dataConfig.alliance_cost values
 * - AllianceGroupPurchase persistence model / SQL column names recovered from
 *   the reference server package.
 *
 * Player/alliance-specific sample values (names, power, timestamps, ids) are
 * deliberately not promoted to global configuration.
 */

const LAST_SHELTER_ALLIANCE_INIT_FIELDS = Object.freeze([
  "nextlevel",
  "allianceActiveGroupMissionNum",
  "uid",
  "signNum",
  "eventNum",
  "allianceWageNum",
  "greenState",
  "helpcount",
  "rankone",
  "learderName",
  "castleRestriction",
  "powerRestrictionN",
  "yellow",
  "powerRestriction",
  "castleRestrictionN",
  "myPower",
  "rank",
  "recruit",
  "event",
  "alliancename",
  "monthlyCardRestriction",
  "learderPic",
  "prepareChangeLeaderTime",
  "allianceContributionNum",
  "activeValStr",
  "abbr",
  "country",
  "donateAvailable",
  "jointime",
  "activeVal",
  "accPoint",
  "language",
  "maxMember",
  "applyCount",
  "activeValAvg",
  "dau",
  "monthlyCardRestrictionN",
  "signcount",
  "territory",
  "activeUpdateTime",
  "alliancepoint",
  "militaryNum",
  "latestsignts",
  "allianceCurrentContribution",
  "rankfour",
  "createtime",
  "learderPicVer",
  "abbrRename",
  "reicon",
  "oldfightpower",
  "allianceActiveRewardNum",
  "member",
  "icon",
  "crossFightSrcServerId",
  "allianceContributionRewardNum",
  "fightpower",
  "green",
  "rankfive",
  "giftlevel",
  "intro",
  "allianceContributionRewardList",
  "point",
  "learderUid",
  "ranktwo",
  "rankthree",
  "allianceContributionList",
  "donateCDTime",
  "curMember",
  "currentlevel",
  "signrewards"
]);

const LAST_SHELTER_ALLIANCE_CONFIG = Object.freeze({
  alliance_cost: Object.freeze({
    k1: "500",
    k2: "200",
    k3: "1000",
    k4: "200",
    k5: "500",
    k6: "8",
    k7: "1000",
    k8: "604800"
  })
});

const LAST_SHELTER_ALLIANCE_GROUP_PURCHASE_DB_FIELDS = Object.freeze([
  "uid",
  "allianceId",
  "endTime",
  "times",
  "sendFlag",
  "optionalRewardIndex",
  "lotteryNum",
  "awardIndex"
]);

function nonNegativeInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : fallback;
}

function allianceRewardTokenParseEt(raw) {
  const parts = String(raw == null ? "" : raw)
    .split(",")
    .map(x => x.trim());

  if (parts.length !== 3 || !parts[0] || !parts[1]) return null;

  const amount = Number(parts[2]);
  if (!Number.isFinite(amount)) return null;

  return {
    kind: parts[0],
    id: parts[1],
    amount: Math.max(0, Math.trunc(amount))
  };
}

function allianceRewardGroupsParseEt(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return [];

  return text
    .split(";")
    .map(group =>
      group
        .split("|")
        .map(allianceRewardTokenParseEt)
        .filter(Boolean)
    )
    .filter(group => group.length > 0);
}

function allianceContributionThresholdsParseEt(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return [];

  return text
    .split("|")
    .map(x => Number(x.trim()))
    .filter(Number.isFinite)
    .map(x => Math.max(0, Math.trunc(x)));
}

function allianceSnapshotFieldYoxlamasi(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return {
      validObject: false,
      presentFields: [],
      unknownFields: [],
      missingVerifiedFields: [...LAST_SHELTER_ALLIANCE_INIT_FIELDS]
    };
  }

  const presentFields = Object.keys(snapshot);
  const verified = new Set(LAST_SHELTER_ALLIANCE_INIT_FIELDS);

  return {
    validObject: true,
    presentFields,
    unknownFields: presentFields.filter(x => !verified.has(x)),
    missingVerifiedFields: LAST_SHELTER_ALLIANCE_INIT_FIELDS.filter(
      x => !Object.prototype.hasOwnProperty.call(snapshot, x)
    )
  };
}

function allianceGroupPurchaseRecordHazirla(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const uid = String(raw.uid == null ? "" : raw.uid).trim();
  const allianceId = String(raw.allianceId == null ? "" : raw.allianceId).trim();
  const endTime = Number(raw.endTime);

  if (!uid || !allianceId || !Number.isFinite(endTime)) return null;

  return {
    uid,
    allianceId,
    endTime: Math.trunc(endTime),
    times: nonNegativeInt(raw.times),
    sendFlag: nonNegativeInt(raw.sendFlag),
    optionalRewardIndex: nonNegativeInt(raw.optionalRewardIndex),
    lotteryNum: nonNegativeInt(raw.lotteryNum),
    awardIndex: nonNegativeInt(raw.awardIndex)
  };
}

function lastShelterAllianceRuntimeDefaultHazirla() {
  return {
    allianceId: "",
    alliance: {},
    groupPurchaseRecords: []
  };
}

function lastShelterAllianceRuntimeTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterAllianceRuntime ||
    typeof state.lastShelterAllianceRuntime !== "object" ||
    Array.isArray(state.lastShelterAllianceRuntime)
  ) {
    state.lastShelterAllianceRuntime =
      lastShelterAllianceRuntimeDefaultHazirla();
  }

  const runtime = state.lastShelterAllianceRuntime;

  runtime.allianceId =
    String(runtime.allianceId == null ? "" : runtime.allianceId).trim();

  if (
    !runtime.alliance ||
    typeof runtime.alliance !== "object" ||
    Array.isArray(runtime.alliance)
  ) {
    runtime.alliance = {};
  }

  if (!Array.isArray(runtime.groupPurchaseRecords)) {
    runtime.groupPurchaseRecords = [];
  }

  return runtime;
}

module.exports = {
  LAST_SHELTER_ALLIANCE_INIT_FIELDS,
  LAST_SHELTER_ALLIANCE_CONFIG,
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE_DB_FIELDS,
  allianceRewardTokenParseEt,
  allianceRewardGroupsParseEt,
  allianceContributionThresholdsParseEt,
  allianceSnapshotFieldYoxlamasi,
  allianceGroupPurchaseRecordHazirla,
  lastShelterAllianceRuntimeDefaultHazirla,
  lastShelterAllianceRuntimeTeminEt
};
