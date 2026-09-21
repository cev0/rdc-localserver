"use strict";

const assert=require("assert");
const {
  LAST_SHELTER_FRESH_INIT_ENVELOPE,
  freshInitEnvelopeRuntimeDefaultHazirla,
  freshInitEnvelopeRuntimeTeminEt
}=require("./last_shelter_fresh_init_envelope_reference");

assert.deepStrictEqual(
  LAST_SHELTER_FRESH_INIT_ENVELOPE,
  {
    worldPrisonBuilding:[],
    alliancemerge:0,
    identification:{authenticate:false,isCN:false,isArab:false},
    goldprices:[],
    buildRapidType:"",
    vip:{vipEndTime:0,score:0,level:0,nextDayScore:20,loginDays:1},
    alliancenewmail:0,
    armyFormationMaxCount:0,
    debuffObj:{debuffList:[]},
    isHavaOfflineLvUp:0,
    cdTimeArray:[],
    vipstoreLevel:1,
    kingdomContribution:0,
    fbShare:[],
    exchangeVip:[]
  }
);

const a=freshInitEnvelopeRuntimeDefaultHazirla();
a.vip.level=9;
a.fbShare.push(1);
assert.strictEqual(LAST_SHELTER_FRESH_INIT_ENVELOPE.vip.level,0);
assert.deepStrictEqual(LAST_SHELTER_FRESH_INIT_ENVELOPE.fbShare,[]);

const broken={
  identification:null,
  vip:{level:"3",loginDays:"4"},
  debuffObj:{debuffList:null},
  armyFormationMaxCount:"2",
  vipstoreLevel:"2",
  kingdomContribution:"15",
  buildRapidType:3
};
assert.strictEqual(freshInitEnvelopeRuntimeTeminEt(broken),broken);
assert.deepStrictEqual(broken.identification,{authenticate:false,isCN:false,isArab:false});
assert.deepStrictEqual(broken.vip,{vipEndTime:0,score:0,level:3,nextDayScore:20,loginDays:4});
assert.deepStrictEqual(broken.debuffObj,{debuffList:[]});
assert.strictEqual(broken.armyFormationMaxCount,2);
assert.strictEqual(broken.vipstoreLevel,2);
assert.strictEqual(broken.kingdomContribution,15);
assert.strictEqual(broken.buildRapidType,"");
assert.deepStrictEqual(broken.worldPrisonBuilding,[]);
assert.deepStrictEqual(broken.goldprices,[]);
assert.deepStrictEqual(broken.cdTimeArray,[]);
assert.deepStrictEqual(broken.fbShare,[]);
assert.deepStrictEqual(broken.exchangeVip,[]);

// Explicit exclusions: these values are dynamic/chronology-dependent in logs.
for (const key of ["tomorrow","newAccount","unformation","status"]) {
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(LAST_SHELTER_FRESH_INIT_ENVELOPE,key),
    false,
    key
  );
}

console.log("PASS: safe Last Shelter fresh init envelope defaults are preserved without dynamic session/tutorial fields.");
