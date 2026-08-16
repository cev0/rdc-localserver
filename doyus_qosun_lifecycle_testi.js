"use strict";

const assert = require("assert");
const {
  serverItkiPlaniniTetbiqEt,
  yungulYaralilariBerpaEt
} = require("./doyus_xestexana_korpu");
const { yaralilariSagalt } = require("./xestexana_sistemi");

function stateHazirla(hospitalCapacity) {
  process.env.XESTEXANA_BINASI_IDLERI = "hospital";
  process.env.XESTEXANA_TUTUM_CEDVELI = JSON.stringify([hospitalCapacity]);
  process.env.XESTEXANA_SAGALTMA_XERC_BIR_ESGER = JSON.stringify({ food: 2, money: 1 });

  return {
    playerId: "oyuncu_a",
    buildings: [
      {
        buildingId: "hospital",
        instanceId: "hospital_1",
        level: 1,
        isCompleted: true
      }
    ],
    resources: {
      food: 10000,
      money: 10000
    },
    army: {
      troops: {
        warrior_t1: 100
      }
    },
    konvoylar: {
      version: 1,
      items: [
        {
          konvoyId: "konvoy_1",
          qehremanIdleri: [],
          qosunlar: { warrior_t1: 100 },
          formasiya: {
            version: 1,
            siralar: [
              { siraId: "sira_1", unitId: "warrior_t1", count: 100 },
              { siraId: "sira_2", unitId: "", count: 0 },
              { siraId: "sira_3", unitId: "", count: 0 }
            ]
          }
        }
      ]
    }
  };
}

function planHazirla() {
  return {
    version: 3,
    siralar: [
      {
        siraId: "sira_1",
        unitId: "warrior_t1",
        itki: 30,
        agirYaraliNamized: 18,
        yungulYarali: 6,
        birbasaOlu: 6
      }
    ]
  };
}

function convoyRowCount(state) {
  const convoy = state.konvoylar.items.find(x => x.konvoyId === "konvoy_1");
  return convoy.formasiya.siralar.find(x => x.siraId === "sira_1").count;
}

(function normalDoyusTamLifecycleMuhafizeQanunu() {
  const state = stateHazirla(1000);
  const report = {};
  const sent = [{ siraId: "sira_1", unitId: "warrior_t1", count: 100 }];

  const casualty = serverItkiPlaniniTetbiqEt(
    state,
    "konvoy_1",
    sent,
    planHazirla(),
    report
  );

  assert.strictEqual(casualty.success, true);
  assert.strictEqual(casualty.totalLoss, 30);
  assert.strictEqual(state.army.troops.warrior_t1, 70);
  assert.strictEqual(convoyRowCount(state), 70);
  assert.strictEqual(state.xestexana.yaralilar.warrior_t1, 18);
  assert.strictEqual(casualty.heavyWoundedFormation[0].count, 18);
  assert.strictEqual(casualty.lightWoundedFormation[0].count, 6);
  assert.strictEqual(casualty.directDeadFormation[0].count, 6);
  assert.strictEqual(casualty.hospitalOverflowDeadFormation.length, 0);
  assert.strictEqual(report.lightWoundedRecoveryPending, true);

  const recovery = yungulYaralilariBerpaEt(
    state,
    "konvoy_1",
    casualty.lightWoundedFormation,
    report,
    2000
  );

  assert.strictEqual(recovery.success, true);
  assert.strictEqual(recovery.recoveredCount, 6);
  assert.strictEqual(state.army.troops.warrior_t1, 76);
  assert.strictEqual(convoyRowCount(state), 76);
  assert.strictEqual(report.lightWoundedRecoveryPending, false);

  const heal = yaralilariSagalt(
    state,
    [{ unitId: "warrior_t1", count: 18 }],
    3000
  );

  assert.strictEqual(heal.success, true);
  assert.strictEqual(heal.healedCount, 18);
  assert.strictEqual(state.army.troops.warrior_t1, 94);
  assert.strictEqual(state.xestexana.yaralilar.warrior_t1 || 0, 0);
  assert.strictEqual(state.resources.food, 9964);
  assert.strictEqual(state.resources.money, 9982);

  const permanentDead = casualty.deadFormation.reduce((c, x) => c + x.count, 0);
  assert.strictEqual(permanentDead, 6);
  assert.strictEqual(state.army.troops.warrior_t1 + permanentDead, 100);
})();

(function hospitalOverflowOlumleriBirdefelikSilinir() {
  const state = stateHazirla(5);
  const report = {};
  const sent = [{ siraId: "sira_1", unitId: "warrior_t1", count: 100 }];

  const casualty = serverItkiPlaniniTetbiqEt(
    state,
    "konvoy_1",
    sent,
    planHazirla(),
    report
  );

  assert.strictEqual(casualty.success, true);
  assert.strictEqual(state.army.troops.warrior_t1, 70);
  assert.strictEqual(state.xestexana.yaralilar.warrior_t1, 5);
  assert.strictEqual(casualty.heavyWoundedFormation[0].count, 5);
  assert.strictEqual(casualty.hospitalOverflowDeadFormation[0].count, 13);
  assert.strictEqual(casualty.deadFormation[0].count, 19);

  yungulYaralilariBerpaEt(
    state,
    "konvoy_1",
    casualty.lightWoundedFormation,
    report,
    4000
  );
  assert.strictEqual(state.army.troops.warrior_t1, 76);
  assert.strictEqual(convoyRowCount(state), 76);

  const heal = yaralilariSagalt(
    state,
    [{ unitId: "warrior_t1", count: 5 }],
    5000
  );
  assert.strictEqual(heal.success, true);
  assert.strictEqual(state.army.troops.warrior_t1, 81);

  const permanentDead = casualty.deadFormation.reduce((c, x) => c + x.count, 0);
  assert.strictEqual(permanentDead, 19);
  assert.strictEqual(state.army.troops.warrior_t1 + permanentDead, 100);
})();

(function formasiyaVeArmyDovusdanSonraEyniAktivSaydaQalir() {
  const state = stateHazirla(1000);
  const sent = [{ siraId: "sira_1", unitId: "warrior_t1", count: 100 }];
  const casualty = serverItkiPlaniniTetbiqEt(state, "konvoy_1", sent, planHazirla());

  assert.strictEqual(casualty.success, true);
  assert.strictEqual(state.army.troops.warrior_t1, convoyRowCount(state));

  yungulYaralilariBerpaEt(state, "konvoy_1", casualty.lightWoundedFormation, null, 6000);
  assert.strictEqual(state.army.troops.warrior_t1, convoyRowCount(state));
  assert.strictEqual(state.xestexana.yaralilar.warrior_t1, 18);
  assert.strictEqual(
    state.army.troops.warrior_t1,
    76,
    "Ağır yaralılar orduda aktiv sayılmamalı, yalnız Hospital state-də qalmalıdır."
  );
})();

delete process.env.XESTEXANA_BINASI_IDLERI;
delete process.env.XESTEXANA_TUTUM_CEDVELI;
delete process.env.XESTEXANA_SAGALTMA_XERC_BIR_ESGER;

console.log("Doyus qosun lifecycle accounting testleri: OK");
