"use strict";

const assert = require("assert");
const { konvoyMesguldur } = require("./konvoy_mesgul_sistemi");

const now = 100000;

assert.strictEqual(
  konvoyMesguldur({}, "konvoy_1", now).mesguldur,
  false
);

const gatheringState = {
  xeriteToplama: {
    activeByConvoy: {
      konvoy_1: {
        convoyId: "konvoy_1",
        nodeId: "state_1_resource_1",
        endsAtMs: now + 60000
      }
    }
  }
};

const gatherLock = konvoyMesguldur(gatheringState, "konvoy_1", now);
assert.strictEqual(gatherLock.mesguldur, true);
assert.strictEqual(gatherLock.sebeb, "resource_gathering");

assert.strictEqual(
  konvoyMesguldur(gatheringState, "konvoy_1", now + 60001).mesguldur,
  false
);

const battleState = {
  doyus: {
    tutorial: {
      convoyId: "konvoy_1",
      status: "active"
    }
  }
};

const battleLock = konvoyMesguldur(battleState, "konvoy_1", now);
assert.strictEqual(battleLock.mesguldur, true);
assert.strictEqual(battleLock.sebeb, "battle");

console.log("konvoy_mesgul_sistemi_testi: OK");
