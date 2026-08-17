"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  canonicalUnitIdAl,
  telimMuddetiniHesabla,
  qosunTelimOnBaxisiniHazirla,
  qosunTelimleriniYekunlasdir,
  qosunTeliminiBaslat,
  qosunTelimStatusunuHazirla
} = require("./qosun_telimi_sistemi");
const {
  qosunTelimiMutasiyasiniTetbiqEt
} = require("./qosun_telimi_handler");
const {
  gameplaySnapshotiTelebOlunur
} = require("./missiya_handler");

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
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
        trainingSpeedPct: 25,
        trainingCostReductionPct: 0
      }
    },
    buildings: [
      {
        instanceId: "fighter_camp_1",
        buildingId: "fighter_camp",
        level: 25,
        isCompleted: true
      },
      {
        instanceId: "shooter_camp_1",
        buildingId: "shooter_camp",
        level: 25,
        isCompleted: true
      },
      {
        instanceId: "vehicle_factory_1",
        buildingId: "vehicle_factory",
        level: 25,
        isCompleted: true
      }
    ],
    army: {
      troops: {
        warrior_t1: 10
      },
      trainingQueues: {}
    }
  };
}

(function legacyAliasTesti() {
  assert.strictEqual(canonicalUnitIdAl("fighter_lv1"), "warrior_t1");
  assert.strictEqual(canonicalUnitIdAl("shooter_lv10"), "shooter_t10");
})();

(function muddetTesti() {
  const state = stateHazirla();
  assert.strictEqual(
    telimMuddetiniHesabla(state, "warrior_t1", 5),
    20000,
    "25% training speed bonus 25 saniyəni 20 saniyəyə endirməlidir."
  );
})();

(function previewServerHesabiTesti() {
  const state = stateHazirla();
  const preview = qosunTelimOnBaxisiniHazirla(
    state,
    "fighter_camp_1",
    "warrior_t2",
    10
  );

  assert.strictEqual(preview.success, true);
  assert.deepStrictEqual(preview.costInfo.baseCost, [
    { type: "food", amount: 350 },
    { type: "wood", amount: 80 }
  ]);
  assert.strictEqual(preview.timeInfo.baseDurationMs, 60000);
  assert.strictEqual(preview.timeInfo.finalDurationMs, 48000);
})();

(function startResursCixirVeYekunlasirTesti() {
  const state = stateHazirla();
  const evvelFood = state.resources.food;

  const start = qosunTeliminiBaslat(
    state,
    "fighter_camp_1",
    "fighter_lv1",
    5,
    1000
  );

  assert.strictEqual(start.success, true);
  assert.strictEqual(start.deyisdi, true);
  assert.strictEqual(start.durationMs, 20000);
  assert.strictEqual(start.queue.unitId, "warrior_t1");
  assert.strictEqual(start.queue.count, 5);
  assert.strictEqual(start.queue.startTimeMs, 1000);
  assert.strictEqual(start.queue.finishTimeMs, 21000);
  assert.deepStrictEqual(start.queue.paidCost, [
    { type: "food", amount: 70 }
  ]);
  assert.strictEqual(state.resources.food, evvelFood - 70);

  const erkendir = qosunTelimleriniYekunlasdir(state, 20000);
  assert.strictEqual(erkendir.deyisdi, false);
  assert.strictEqual(state.army.troops.warrior_t1, 10);

  const bitdi = qosunTelimleriniYekunlasdir(state, 21000);
  assert.strictEqual(bitdi.success, true);
  assert.strictEqual(bitdi.deyisdi, true);
  assert.strictEqual(bitdi.tamamlananlar.length, 1);
  assert.strictEqual(bitdi.tamamlananlar[0].count, 5);
  assert.strictEqual(state.army.troops.warrior_t1, 15);
  assert.strictEqual(state.army.trainingQueues.fighter_camp_1, undefined);
})();

(function busyQueueResursCixmirTesti() {
  const state = stateHazirla();
  state.army.trainingQueues.fighter_camp_1 = {
    buildingInstanceId: "fighter_camp_1",
    unitId: "warrior_t1",
    count: 3,
    startTimeMs: 1000,
    finishTimeMs: 999999
  };

  const evvelki = kopyala(state);
  const netice = qosunTeliminiBaslat(
    state,
    "fighter_camp_1",
    "warrior_t1",
    2,
    2000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.reason, "training_queue_busy");
  assert.deepStrictEqual(state, evvelki);
})();

(function sehvBinaTesti() {
  const state = stateHazirla();
  const netice = qosunTeliminiBaslat(
    state,
    "shooter_camp_1",
    "warrior_t1",
    2,
    1000
  );
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.reason, "wrong_training_building");
})();

(function tier9TexnologiyaKilidiTesti() {
  const state = stateHazirla();
  let preview = qosunTelimOnBaxisiniHazirla(
    state,
    "fighter_camp_1",
    "warrior_t9",
    1
  );
  assert.strictEqual(preview.success, false);
  assert.strictEqual(preview.reason, "research_required");

  state.technology.levels.unlock_warrior_t9 = 1;
  preview = qosunTelimOnBaxisiniHazirla(
    state,
    "fighter_camp_1",
    "warrior_t9",
    1
  );
  assert.strictEqual(preview.success, true);
})();

(function resursCatismirTesti() {
  const state = stateHazirla();
  state.resources.food = 1;
  const evvel = kopyala(state);
  const netice = qosunTeliminiBaslat(
    state,
    "fighter_camp_1",
    "warrior_t1",
    10,
    1000
  );
  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.reason, "not_enough_resources");
  assert.deepStrictEqual(state, evvel);
})();

(function xercEndirimiTesti() {
  const state = stateHazirla();
  state.technology.stats.trainingSpeedPct = 0;
  state.technology.stats.trainingCostReductionPct = 10;

  const preview = qosunTelimOnBaxisiniHazirla(
    state,
    "fighter_camp_1",
    "warrior_t2",
    10
  );

  assert.strictEqual(preview.success, true);
  assert.deepStrictEqual(preview.costInfo.finalCost, [
    { type: "food", amount: 315 },
    { type: "wood", amount: 72 }
  ]);
})();

(function statusDueQueueYekunlasdirirTesti() {
  const state = stateHazirla();
  state.army.trainingQueues.fighter_camp_1 = {
    buildingInstanceId: "fighter_camp_1",
    unitId: "warrior_t1",
    count: 4,
    startTimeMs: 1000,
    finishTimeMs: 5000
  };

  const status = qosunTelimStatusunuHazirla(state, 6000);
  assert.strictEqual(status.success, true);
  assert.strictEqual(status.deyisdi, true);
  assert.strictEqual(state.army.troops.warrior_t1, 14);
  assert.strictEqual(status.activeQueues.length, 0);
})();

(function tamamlanmaVarStartUgursuzTesti() {
  const state = stateHazirla();
  state.army.trainingQueues.fighter_camp_1 = {
    buildingInstanceId: "fighter_camp_1",
    unitId: "warrior_t1",
    count: 4,
    startTimeMs: 1000,
    finishTimeMs: 5000
  };

  const netice = qosunTelimiMutasiyasiniTetbiqEt(
    state,
    {
      buildingInstanceId: "olmayan_bina",
      unitId: "warrior_t1",
      count: 1
    },
    6000,
    "train"
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, true);
  assert.strictEqual(netice.tamamlananlar.length, 1);
  assert.strictEqual(state.army.troops.warrior_t1, 14);
})();

(function namelumUnitTesti() {
  const state = stateHazirla();
  const evvelki = kopyala(state);
  const netice = qosunTeliminiBaslat(
    state,
    "fighter_camp_1",
    "saxta_unit_999",
    5,
    7000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.reason, "unknown_unit");
  assert.deepStrictEqual(state, evvelki);
})();

(function legacySnapshotYarisiQorumasiTesti() {
  assert.strictEqual(
    gameplaySnapshotiTelebOlunur("train_unit_request"),
    false,
    "PostgreSQL transaction-u olan training üçün legacy tam snapshot yazılmamalıdır."
  );
  assert.strictEqual(
    gameplaySnapshotiTelebOlunur("build_request"),
    true,
    "Legacy tikinti daimiliyi port olunana qədər snapshot observer saxlanmalıdır."
  );
})();

(function sourceInteqrasiyaTesti() {
  const handlerKod = fs.readFileSync(path.join(__dirname, "qosun_telimi_handler.js"), "utf8");
  const zencirKod = fs.readFileSync(path.join(__dirname, "server_missiya_genisletme_v2.js"), "utf8");

  assert.ok(handlerKod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"));
  assert.ok(handlerKod.includes("troop_catalog_request"));
  assert.ok(handlerKod.includes("troop_training_preview_request"));
  assert.ok(handlerKod.includes("troop_training_status_request"));
  assert.ok(zencirKod.includes("qosunTelimiMesajiniEmalEt"));
  assert.ok(zencirKod.includes("\"train_unit_request\""));
  assert.ok(zencirKod.includes("\"troop_training_status_request\""));
})();

console.log("[QOSUN_TELIMI_PG_MUTASIYA_TEST] OK");
