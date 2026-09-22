"use strict";

const assert=require("assert");
const {
  OBSERVED_TUTORIAL_IDS,
  tutorialIdNormalizeEt,
  tutorialRuntimeDefaultHazirla,
  tutorialRuntimeTeminEt,
  setTutorialIcraEt
}=require("./last_shelter_tutorial_reference");

assert.deepStrictEqual(
  OBSERVED_TUTORIAL_IDS,
  ["6","1010","1020","1051","1053","1054","1027","1090","1095","20002100","20002101","20002110"]
);
assert.deepStrictEqual(tutorialRuntimeDefaultHazirla(),{tutorialId:""});
assert.strictEqual(tutorialIdNormalizeEt(1053),"1053");
assert.strictEqual(tutorialIdNormalizeEt(" 20002110 "),"20002110");

const state={};
assert.strictEqual(tutorialRuntimeTeminEt(state).tutorialId,"");

for (const id of ["6","1010","1020","1051","1053","1054"]) {
  const result=setTutorialIcraEt(state,id);
  assert.deepStrictEqual(result,{success:true,tutorialId:id});
  assert.strictEqual(state.lastShelterTutorialRuntime.tutorialId,id);
}

// Source logs prove non-monotonic/repeated updates are accepted.
assert.deepStrictEqual(
  setTutorialIcraEt(state,"1053"),
  {success:true,tutorialId:"1053"}
);
assert.deepStrictEqual(
  setTutorialIcraEt(state,"1027"),
  {success:true,tutorialId:"1027"}
);
assert.strictEqual(state.lastShelterTutorialRuntime.tutorialId,"1027");

// Unknown ids remain opaque instead of being guessed/rejected by a fake list.
assert.deepStrictEqual(
  setTutorialIcraEt(state,"future-source-id"),
  {success:true,tutorialId:"future-source-id"}
);
assert.strictEqual(setTutorialIcraEt(state,"").success,false);

console.log("PASS: Last Shelter SetTutorial opaque replacement semantics are preserved.");
