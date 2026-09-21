"use strict";

/*
 * Verified Last Shelter v1.250.102 SetTutorial behavior observed on the
 * reference server.
 *
 * The same account accepted repeated and non-monotonic tutorial ids and the
 * post-request profile snapshot contained tutorialId equal to the most recent
 * submitted id. Therefore tutorial ids are opaque strings here: no guessed
 * numeric ordering or allow-list is imposed.
 */

const OBSERVED_TUTORIAL_IDS = Object.freeze([
  "6",
  "1010",
  "1020",
  "1051",
  "1053",
  "1054",
  "1027",
  "1090",
  "1095",
  "20002100",
  "20002101",
  "20002110"
]);

function tutorialIdNormalizeEt(value) {
  if (value == null) return "";
  return String(value).trim();
}

function tutorialRuntimeDefaultHazirla() {
  return {
    tutorialId:""
  };
}

function tutorialRuntimeTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterTutorialRuntime ||
    typeof state.lastShelterTutorialRuntime !== "object" ||
    Array.isArray(state.lastShelterTutorialRuntime)
  ) {
    state.lastShelterTutorialRuntime =
      tutorialRuntimeDefaultHazirla();
  }

  state.lastShelterTutorialRuntime.tutorialId =
    tutorialIdNormalizeEt(
      state.lastShelterTutorialRuntime.tutorialId
    );

  return state.lastShelterTutorialRuntime;
}

function setTutorialIcraEt(state, rawId) {
  const runtime=tutorialRuntimeTeminEt(state);
  if (!runtime) {
    return {success:false,code:"STATE_MISSING"};
  }

  const tutorialId=tutorialIdNormalizeEt(rawId);
  if (!tutorialId) {
    return {success:false,code:"INVALID_OPT"};
  }

  runtime.tutorialId=tutorialId;

  return {
    success:true,
    tutorialId
  };
}

module.exports = {
  OBSERVED_TUTORIAL_IDS,
  tutorialIdNormalizeEt,
  tutorialRuntimeDefaultHazirla,
  tutorialRuntimeTeminEt,
  setTutorialIcraEt
};
