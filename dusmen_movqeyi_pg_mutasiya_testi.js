"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  dusmenMovqeyiMutasiyasiniTetbiqEt
} = require("./dusmen_movqeyi_handler");
const {
  TUTORIAL_HEDEF_ID
} = require("./kesfiyyat_sistemi");

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function aktivStateHazirla() {
  return {
    playerId: "oyuncu_a",
    kesfiyyat: {
      version: 1,
      tutorial: {
        operationId: "tutorial_kesfiyyat_001",
        status: "tamamlandi",
        startedAtMs: 1000,
        completesAtMs: 11000,
        completedAtMs: 11000,
        revealedTargetId: TUTORIAL_HEDEF_ID
      }
    }
  };
}

(function inspectSuccessTesti() {
  const state = aktivStateHazirla();

  const netice = dusmenMovqeyiMutasiyasiniTetbiqEt(
    state,
    12000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, true);
  assert.strictEqual(netice.netice.alreadyDiscovered, false);
  assert.strictEqual(state.dusmenMovqeleri.tutorial.status, "askarlandi");
  assert.strictEqual(state.dusmenMovqeleri.tutorial.targetId, TUTORIAL_HEDEF_ID);
  assert.strictEqual(state.dusmenMovqeleri.tutorial.discoveredAtMs, 12000);
  assert.strictEqual(state.dusmenMovqeleri.tutorial.threatLevel, 1);
})();

(function targetUnavailableExactRollbackTesti() {
  const state = aktivStateHazirla();
  state.kesfiyyat.tutorial.status = "davam_edir";
  state.kesfiyyat.tutorial.revealedTargetId = "";
  const evvelki = kopyala(state);

  const netice = dusmenMovqeyiMutasiyasiniTetbiqEt(
    state,
    12000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.ok(netice.message.includes("kəşfiyyat"));
  assert.deepStrictEqual(
    state,
    evvelki,
    "Target unavailable failure default dusmenMovqeleri state-i saxlamamalıdır."
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(state, "dusmenMovqeleri"),
    false
  );
})();

(function alreadyDiscoveredNoExtraMutationTesti() {
  const state = aktivStateHazirla();
  state.dusmenMovqeleri = {
    version: 1,
    tutorial: {
      targetId: TUTORIAL_HEDEF_ID,
      status: "askarlandi",
      discoveredAtMs: 12000,
      threatLevel: 1
    }
  };
  const evvelki = kopyala(state);

  const netice = dusmenMovqeyiMutasiyasiniTetbiqEt(
    state,
    13000
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(netice.netice.alreadyDiscovered, true);
  assert.deepStrictEqual(state, evvelki);
})();

(function sourceInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "dusmen_movqeyi_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Enemy-position mutation PostgreSQL player lock istifadə etməlidir."
  );
  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Enemy-position handler köhnə full-state save yolunu istifadə etməməlidir."
  );
  assert.ok(
    kod.includes("dusmenMovqeyiReadStateKopyasi(state)"),
    "Enemy-position info read clone state istifadə etməlidir."
  );
  assert.ok(
    !kod.includes("missiyaStatusunuAl"),
    "Synthetic M016 mission gate enemy-position handler-dan ayrılmış qalmalıdır."
  );
  assert.ok(
    !kod.includes("missiyaServerHadisesiniQeydEt"),
    "Synthetic mission-event bridge enemy-position handler-dan ayrılmış qalmalıdır."
  );
})();

console.log("[DUSMEN_MOVQEYI_PG_MUTASIYA_TEST] OK");
