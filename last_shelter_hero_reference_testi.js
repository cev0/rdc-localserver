"use strict";

const assert = require("assert");
const {
  LAST_SHELTER_HERO_TEMPLATES,
  LAST_SHELTER_HERO_DATA_CONFIG,
  LAST_SHELTER_STARTER_GENERAL,
  heroTemplateAl,
  heroTemplateIdsAl,
  heroTemplateProjectionHazirla,
  lastShelterHeroBasePoweriniHesabla,
  starterGeneralHazirla,
  lastShelterHeroRuntimeTeminEt
} = require("./last_shelter_hero_reference");

assert.strictEqual(LAST_SHELTER_HERO_TEMPLATES.length, 21);
assert.deepStrictEqual(
  heroTemplateIdsAl(),
  [
  "240030",
  "240031",
  "240032",
  "240033",
  "240034",
  "240035",
  "240036",
  "240037",
  "240038",
  "240039",
  "240040",
  "240041",
  "240042",
  "240043",
  "240044",
  "240045",
  "240046",
  "240047",
  "240048",
  "240049",
  "240050"
]
);

assert.deepStrictEqual(
  LAST_SHELTER_HERO_DATA_CONFIG,
  {
  "hero": {
    "k1": "10",
    "k2": "20",
    "k3": "40",
    "k4": "80",
    "k5": "200"
  },
  "heroUp": {
    "k1": "8",
    "k2": "8",
    "k3": "20"
  },
  "heroSkillPoint": {
    "k1": "3",
    "k2": "3",
    "k3": "3",
    "k4": "3",
    "k5": "3",
    "k6": "3"
  },
  "heroNumber": {
    "k1": "16",
    "k2": "3",
    "k3": "3",
    "k4": "2000|4000|6000"
  },
  "flags": {
    "newHeroSwitch": 1,
    "heroRestSwitch": 1,
    "heroSkillLvup": 1,
    "heroInformation": 1,
    "heroCd": 1,
    "emptySkillSlot": 1
  },
  "onlineDurationRecruitHero": "240041"
}
);

assert.deepStrictEqual(
  LAST_SHELTER_STARTER_GENERAL,
  {
    generalId: "240020",
    level: 1,
    att: 0,
    defence: 0,
    status: 1,
    skill: [],
    ability: []
  }
);

const hero31 = heroTemplateProjectionHazirla("240031");
assert.deepStrictEqual(hero31.skillIds, ["680001","690002"]);
assert.deepStrictEqual(hero31.newSkillIds, ["670101","670201","680001","670401","690002"]);
assert.deepStrictEqual(hero31.newSkillNums, [300,500,1000,1800,2800]);
assert.strictEqual(hero31.composeItemId, "206001");
assert.strictEqual(hero31.composeCount, 6000);
assert.strictEqual(hero31.power, 1500);
assert.strictEqual(hero31.levelMin, 15);

const hero49 = heroTemplateProjectionHazirla("240049");
assert.strictEqual(hero49.power, 4000);
assert.deepStrictEqual(hero49.skillIds, ["690035","690016"]);
assert.strictEqual(hero49.unlockPara, "17");

const hero50 = heroTemplateProjectionHazirla("240050");
assert.strictEqual(hero50.rate, 0);
assert.strictEqual(hero50.power, 3000);

const copy = heroTemplateAl("240031");
copy.power = "999999";
assert.strictEqual(heroTemplateAl("240031").power, "1500");

const starter = starterGeneralHazirla(() => "00112233445566778899aabbccddeeff");
assert.deepStrictEqual(starter, {
  ...LAST_SHELTER_STARTER_GENERAL,
  skill: [],
  ability: [],
  uuid: "00112233445566778899aabbccddeeff"
});

const state = {};
const runtime = lastShelterHeroRuntimeTeminEt(
  state,
  () => "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
);
assert.strictEqual(runtime.generals.length, 1);
assert.strictEqual(runtime.generals[0].generalId, "240020");
assert.strictEqual(runtime.generals[0].level, 1);
assert.strictEqual(runtime.generals[0].uuid, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

const same = lastShelterHeroRuntimeTeminEt(state);
assert.strictEqual(same.generals.length, 1);
assert.strictEqual(same.generals[0].uuid, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

assert.strictEqual(heroTemplateAl("999999"), null);

assert.strictEqual(
  lastShelterHeroBasePoweriniHesabla({
    lastShelterHeroRuntime: {
      generals: [
        { generalId: "240031" },
        { generalId: "240049" },
        { generalId: "240020" },
        { generalId: "999999" }
      ]
    }
  }),
  5500
);

assert.strictEqual(
  lastShelterHeroBasePoweriniHesabla({}),
  0
);

console.log("PASS: verified Last Shelter hero templates, tuning flags, and starter-general runtime are preserved.");
