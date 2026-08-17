"use strict";

const assert = require("assert");
const {
  vaxtiBitmisTikintiIsleriniYekunlasdir,
  qosunTelimiMutasiyasiniTetbiqEt
} = require("./qosun_telimi_handler");

function stateHazirla() {
  return {
    playerId: "training_completion_test",
    serverTimeUnixMs: 0,
    resources: {
      food: 100000,
      wood: 100000,
      iron: 100000,
      fuel: 100000,
      water: 0,
      electricity: 0,
      money: 0,
      chips: 0
    },
    technology: {
      levels: {},
      stats: {
        trainingSpeedPct: 0,
        trainingCostReductionPct: 0
      }
    },
    buildings: [
      {
        instanceId: "shooter_camp_due_1",
        buildingId: "shooter_camp",
        level: 1,
        isCompleted: false,
        buildFinishTimeMs: 5000
      }
    ],
    builders: {
      jobs: [
        {
          jobId: "build_job_1",
          kind: "build",
          buildingInstanceId: "shooter_camp_due_1",
          buildingId: "shooter_camp",
          endsAtMs: 5000,
          isCompleted: false
        }
      ]
    },
    army: {
      troops: {},
      trainingQueues: {}
    }
  };
}

(function dueJobBirbasaYekunlasirTesti() {
  const state = stateHazirla();
  const changed = vaxtiBitmisTikintiIsleriniYekunlasdir(state, 6000);

  assert.strictEqual(changed, true);
  assert.strictEqual(state.buildings[0].isCompleted, true);
  assert.strictEqual(state.buildings[0].buildFinishTimeMs, 0);
  assert.strictEqual(state.builders.jobs.length, 0);
})();

(function trainingMutationDueBinaniEvvelceYekunlasdirirTesti() {
  const state = stateHazirla();

  const result = qosunTelimiMutasiyasiniTetbiqEt(
    state,
    {
      buildingInstanceId: "shooter_camp_due_1",
      unitId: "shooter_lv1",
      count: 2
    },
    6000,
    "train"
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.deyisdi, true);
  assert.strictEqual(state.buildings[0].isCompleted, true);
  assert.strictEqual(state.builders.jobs.length, 0);
  assert.ok(state.army.trainingQueues.shooter_camp_due_1);
  assert.strictEqual(state.army.trainingQueues.shooter_camp_due_1.count, 2);
})();

(function vaxtiCatmayanJobYekunlasmirTesti() {
  const state = stateHazirla();
  const changed = vaxtiBitmisTikintiIsleriniYekunlasdir(state, 4000);

  assert.strictEqual(changed, false);
  assert.strictEqual(state.buildings[0].isCompleted, false);
  assert.strictEqual(state.builders.jobs.length, 1);
})();

console.log("[QOSUN_TELIMI_TIKINTI_YEKUNLASMA_REGRESSIYA_TEST] OK");
