"use strict";

const assert = require("assert");
const { ittifaqKimliyiniAl } = require("./ittifaq_kimliyi_sistemi");
const {
  LAST_SHELTER_ALLIANCE_INIT_FIELDS,
  LAST_SHELTER_ALLIANCE_CONFIG,
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE_DB_FIELDS,
  allianceRewardGroupsParseEt,
  allianceContributionThresholdsParseEt,
  allianceSnapshotFieldYoxlamasi,
  allianceGroupPurchaseRecordHazirla,
  lastShelterAllianceRuntimeDefaultHazirla,
  lastShelterAllianceRuntimeTeminEt
} = require("./last_shelter_alliance_runtime_contract");

assert.ok(LAST_SHELTER_ALLIANCE_INIT_FIELDS.length >= 60);
for (const field of [
  "uid",
  "alliancename",
  "abbr",
  "learderUid",
  "rank",
  "maxMember",
  "curMember",
  "alliancepoint",
  "fightpower",
  "event",
  "territory",
  "signrewards",
  "allianceContributionList",
  "allianceContributionRewardList"
]) {
  assert.ok(LAST_SHELTER_ALLIANCE_INIT_FIELDS.includes(field), field);
}

assert.deepStrictEqual(
  LAST_SHELTER_ALLIANCE_CONFIG.alliance_cost,
  {
    k1:"500",
    k2:"200",
    k3:"1000",
    k4:"200",
    k5:"500",
    k6:"8",
    k7:"1000",
    k8:"604800"
  }
);

assert.deepStrictEqual(
  LAST_SHELTER_ALLIANCE_GROUP_PURCHASE_DB_FIELDS,
  [
    "uid",
    "allianceId",
    "endTime",
    "times",
    "sendFlag",
    "optionalRewardIndex",
    "lotteryNum",
    "awardIndex"
  ]
);

assert.deepStrictEqual(
  allianceContributionThresholdsParseEt("1000|3000"),
  [1000,3000]
);

assert.deepStrictEqual(
  allianceRewardGroupsParseEt(
    "goods,200306,3|goods,200207,1;goods,200201,1|goods,200300,1"
  ),
  [
    [
      { kind:"goods", id:"200306", amount:3 },
      { kind:"goods", id:"200207", amount:1 }
    ],
    [
      { kind:"goods", id:"200201", amount:1 },
      { kind:"goods", id:"200300", amount:1 }
    ]
  ]
);

const shape = allianceSnapshotFieldYoxlamasi({
  uid:"a",
  alliancename:"A",
  customFutureField:1
});
assert.strictEqual(shape.validObject, true);
assert.deepStrictEqual(shape.unknownFields, ["customFutureField"]);
assert.ok(shape.missingVerifiedFields.includes("abbr"));

assert.deepStrictEqual(
  allianceGroupPurchaseRecordHazirla({
    uid:"u1",
    allianceId:"a1",
    endTime:123456789,
    times:2,
    sendFlag:1,
    optionalRewardIndex:3,
    lotteryNum:4,
    awardIndex:5
  }),
  {
    uid:"u1",
    allianceId:"a1",
    endTime:123456789,
    times:2,
    sendFlag:1,
    optionalRewardIndex:3,
    lotteryNum:4,
    awardIndex:5
  }
);
assert.strictEqual(allianceGroupPurchaseRecordHazirla({}), null);

const state = {};
assert.deepStrictEqual(
  lastShelterAllianceRuntimeTeminEt(state),
  {
    allianceId:"",
    alliance:{},
    groupPurchaseRecords:[],
    groupPurchaseActivity:{
      activityId:"57032",
      progress:0,
      selectedOptionalRewardIndex:0,
      lotteryNum:0,
      awardIndex:0,
      sendFlag:0
    }
  }
);
state.lastShelterAllianceRuntime.allianceId = "abc";
assert.strictEqual(
  lastShelterAllianceRuntimeTeminEt(state).allianceId,
  "abc"
);

assert.deepStrictEqual(
  lastShelterAllianceRuntimeDefaultHazirla(),
  {
    allianceId:"",
    alliance:{},
    groupPurchaseRecords:[]
  }
);

const identity = ittifaqKimliyiniAl({
  lastShelterAllianceRuntime: {
    allianceId: "Alliance-ABC",
    alliance: {},
    groupPurchaseRecords: []
  },
  allianceId: "legacy-other"
});
assert.strictEqual(identity.ittifaqId, "alliance-abc");
assert.strictEqual(identity.sabitdir, true);
assert.strictEqual(identity.menbe, "stable_id");

console.log("PASS: Last Shelter alliance runtime/schema, identity bridge, and group-purchase persistence contracts are preserved.");
