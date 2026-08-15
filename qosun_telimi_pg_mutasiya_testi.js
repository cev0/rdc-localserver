"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  telimMuddetiniHesabla,
  qosunTelimleriniYekunlasdir,
  qosunTeliminiBaslat
} = require("./qosun_telimi_sistemi");
const {
  qosunTelimiMutasiyasiniTetbiqEt
} = require("./qosun_telimi_handler");

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    serverTimeUnixMs: 0,
    technology: {
      stats: {
        trainingSpeedPct: 25
      }
    },
    buildings: [
      {
        instanceId: "fighter_camp_1",
        buildingId: "fighter_camp",
        isCompleted: true
      }
    ],
    army: {
      troops: {
        fighter_lv1: 10
      },
      trainingQueues: {}
    }
  };
}

(function muddetTesti() {
  const state = stateHazirla();
  assert.strictEqual(
    telimMuddetiniHesabla(state, 5),
    20000,
    "25% training speed bonus 25 saniyəni 20 saniyəyə endirməlidir."
  );
})();

(function startVeYekunlasmaTesti() {
  const state = stateHazirla();

  const start = qosunTeliminiBaslat(
    state,
    "fighter_camp_1",
    "FIGHTER_LV1",
    5,
    1000
  );

  assert.strictEqual(start.success, true);
  assert.strictEqual(start.deyisdi, true);
  assert.strictEqual(start.durationMs, 20000);
  assert.strictEqual(start.queue.unitId, "fighter_lv1");
  assert.strictEqual(start.queue.count, 5);
  assert.strictEqual(start.queue.startTimeMs, 1000);
  assert.strictEqual(start.queue.finishTimeMs, 21000);
  assert.deepStrictEqual(
    state.army.trainingQueues.fighter_camp_1,
    start.queue
  );

  const erkendir = qosunTelimleriniYekunlasdir(state, 20000);
  assert.strictEqual(erkendir.success, true);
  assert.strictEqual(erkendir.deyisdi, false);
  assert.strictEqual(state.army.troops.fighter_lv1, 10);
  assert.ok(state.army.trainingQueues.fighter_camp_1);

  const bitdi = qosunTelimleriniYekunlasdir(state, 21000);
  assert.strictEqual(bitdi.success, true);
  assert.strictEqual(bitdi.deyisdi, true);
  assert.strictEqual(bitdi.tamamlananlar.length, 1);
  assert.strictEqual(bitdi.tamamlananlar[0].count, 5);
  assert.strictEqual(state.army.troops.fighter_lv1, 15);
  assert.strictEqual(state.army.trainingQueues.fighter_camp_1, undefined);
})();

(function busyQueueTesti() {
  const state = stateHazirla();
  state.army.trainingQueues.fighter_camp_1 = {
    buildingInstanceId: "fighter_camp_1",
    unitId: "fighter_lv1",
    count: 3,
    startTimeMs: 1000,
    finishTimeMs: 999999
  };

  const evvelki = kopyala(state);
  const netice = qosunTeliminiBaslat(
    state,
    "fighter_camp_1",
    "fighter_lv1",
    2,
    2000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(netice.message, "Training queue already busy");
  assert.deepStrictEqual(state, evvelki);
})();

(function tamamlanmaVarStartUgursuzTesti() {
  const state = stateHazirla();
  state.army.trainingQueues.fighter_camp_1 = {
    buildingInstanceId: "fighter_camp_1",
    unitId: "fighter_lv1",
    count: 4,
    startTimeMs: 1000,
    finishTimeMs: 5000
  };

  const netice = qosunTelimiMutasiyasiniTetbiqEt(
    state,
    {
      buildingInstanceId: "olmayan_bina",
      unitId: "fighter_lv1",
      count: 1
    },
    6000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, true);
  assert.strictEqual(netice.tamamlananlar.length, 1);
  assert.strictEqual(state.army.troops.fighter_lv1, 14);
  assert.strictEqual(state.army.trainingQueues.fighter_camp_1, undefined);
})();

(function invalidStartMutasiyaEtmirTesti() {
  const state = stateHazirla();
  const evvelki = kopyala(state);

  const netice = qosunTelimiMutasiyasiniTetbiqEt(
    state,
    {
      buildingInstanceId: "fighter_camp_1",
      unitId: "",
      count: 5
    },
    7000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.deepStrictEqual(state, evvelki);
})();

(function sourceInteqrasiyaTesti() {
  const handlerKod = fs.readFileSync(
    path.join(__dirname, "qosun_telimi_handler.js"),
    "utf8"
  );
  const zencirKod = fs.readFileSync(
    path.join(__dirname, "server_missiya_genisletme_v2.js"),
    "utf8"
  );

  assert.ok(
    handlerKod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Training handler PostgreSQL player mutation helper istifadə etməlidir."
  );
  assert.ok(
    handlerKod.includes("qosunTelimleriniYekunlasdir"),
    "Yeni start-dan əvvəl due training completion işləməlidir."
  );
  assert.ok(
    zencirKod.includes("qosunTelimiMesajiniEmalEt"),
    "Training handler gameplay chain-ə qoşulmalıdır."
  );
  assert.ok(
    zencirKod.includes("\"train_unit_request\""),
    "train_unit_request local mutation sıra kilidində qalmalıdır."
  );
})();

console.log("[QOSUN_TELIMI_PG_MUTASIYA_TEST] OK");
