"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  m015StatusunuAl,
  kesfiyyatMutasiyasiniTetbiqEt
} = require("./kesfiyyat_handler");
const {
  TUTORIAL_HEDEF_ID,
  TUTORIAL_MUDDET_MS
} = require("./kesfiyyat_sistemi");

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function aktivStateHazirla() {
  return {
    playerId: "oyuncu_a",
    missions: {
      version: 1,
      claimedRewardIds: ["m014"],
      eventCounters: {}
    }
  };
}

(function missionStatusReadOnlyTesti() {
  const state = aktivStateHazirla();
  const evvelki = kopyala(state);

  assert.strictEqual(m015StatusunuAl(state), "aktiv");
  assert.deepStrictEqual(
    state,
    evvelki,
    "M015 status yoxlaması authoritative mission state-i dəyişməməlidir."
  );
})();

(function lockedStartNoMutationTesti() {
  const state = {
    playerId: "oyuncu_a",
    missions: {
      claimedRewardIds: [],
      eventCounters: {}
    }
  };
  const evvelki = kopyala(state);

  const netice = kesfiyyatMutasiyasiniTetbiqEt(
    state,
    "scout_start_request",
    1000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(netice.missionStatus, "kilidli");
  assert.deepStrictEqual(state, evvelki);
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "kesfiyyat"),
    false
  );
})();

(function startCompleteSuccessTesti() {
  const state = aktivStateHazirla();

  const start = kesfiyyatMutasiyasiniTetbiqEt(
    state,
    "scout_start_request",
    1000
  );

  assert.strictEqual(start.success, true);
  assert.strictEqual(start.deyisdi, true);
  assert.strictEqual(start.missionStatus, "aktiv");
  assert.strictEqual(start.netice.alreadyStarted, false);
  assert.strictEqual(state.kesfiyyat.tutorial.status, "davam_edir");
  assert.strictEqual(state.kesfiyyat.tutorial.startedAtMs, 1000);
  assert.strictEqual(
    state.kesfiyyat.tutorial.completesAtMs,
    1000 + TUTORIAL_MUDDET_MS
  );

  const erkendir = kesfiyyatMutasiyasiniTetbiqEt(
    state,
    "scout_complete_request",
    1000 + TUTORIAL_MUDDET_MS - 1
  );

  assert.strictEqual(erkendir.success, false);
  assert.strictEqual(erkendir.deyisdi, false);
  assert.strictEqual(state.kesfiyyat.tutorial.status, "davam_edir");

  const complete = kesfiyyatMutasiyasiniTetbiqEt(
    state,
    "scout_complete_request",
    1000 + TUTORIAL_MUDDET_MS
  );

  assert.strictEqual(complete.success, true);
  assert.strictEqual(complete.deyisdi, true);
  assert.strictEqual(complete.missionHadisesiLazimdir, true);
  assert.strictEqual(state.kesfiyyat.tutorial.status, "tamamlandi");
  assert.strictEqual(
    state.kesfiyyat.tutorial.revealedTargetId,
    TUTORIAL_HEDEF_ID
  );
})();

(function completeBeforeStartExactRollbackTesti() {
  const state = aktivStateHazirla();
  const evvelki = kopyala(state);

  const netice = kesfiyyatMutasiyasiniTetbiqEt(
    state,
    "scout_complete_request",
    5000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.ok(netice.message.includes("başlatmaq"));
  assert.deepStrictEqual(
    state,
    evvelki,
    "Uğursuz complete default kesfiyyat state-i saxlamamalıdır."
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "kesfiyyat"),
    false
  );
})();

(function alreadyCompletedNoExtraMutationTesti() {
  const state = aktivStateHazirla();
  state.missions.eventCounters.kesfiyyat_tamamlandi = 1;
  state.kesfiyyat = {
    version: 1,
    tutorial: {
      operationId: "tutorial_kesfiyyat_001",
      status: "tamamlandi",
      startedAtMs: 1000,
      completesAtMs: 11000,
      completedAtMs: 11000,
      revealedTargetId: TUTORIAL_HEDEF_ID
    }
  };
  const evvelki = kopyala(state);

  const netice = kesfiyyatMutasiyasiniTetbiqEt(
    state,
    "scout_complete_request",
    20000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(netice.netice.alreadyCompleted, true);
  assert.strictEqual(netice.missionHadisesiLazimdir, false);
  assert.deepStrictEqual(state, evvelki);
})();

(function sourceInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "kesfiyyat_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Scout mutation-ları PostgreSQL player lock istifadə etməlidir."
  );
  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Scout handler köhnə full-state save yolunu istifadə etməməlidir."
  );
  assert.ok(
    kod.includes("kesfiyyatReadStateKopyasi(state)"),
    "Scout info read clone state istifadə etməlidir."
  );
  assert.ok(
    kod.includes("missiyaStatusunuAl(\n    kesfiyyatReadStateKopyasi(state)"),
    "M015 status yoxlaması da clone üzərində işləməlidir."
  );
  assert.ok(
    kod.includes("missiyaServerHadisesiniQeydEt"),
    "Scout complete mission-event bridge saxlanmalıdır."
  );
})();

console.log("[KESFIYYAT_PG_MUTASIYA_TEST] OK");
