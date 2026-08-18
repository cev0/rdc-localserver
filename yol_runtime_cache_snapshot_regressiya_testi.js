"use strict";

const assert = require("assert");
const {
  snapshotUcunKopyala,
  snapshotiCariStateIleBirlesdir
} = require("./oyun_state_snapshot_postgres");

function testSnapshotSetCacheYazmir() {
  const state = {
    playerId: "player_test",
    buildings: [],
    cachedBlockedCells: new Set(["1,1", "2,2"])
  };

  const snapshot = snapshotUcunKopyala(state);

  assert.ok(snapshot, "Snapshot yaranmalıdır.");
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(snapshot, "cachedBlockedCells"),
    false,
    "Runtime yol cache-i snapshot-a yazılmamalıdır."
  );
}

function testKohneXarabCacheRestoreOlunmur() {
  const cariState = {
    playerId: "player_test",
    cachedBlockedCells: new Set(["0,0"])
  };

  const kohneSnapshot = {
    playerId: "player_test",
    buildings: [
      { instanceId: "hq_1", buildingId: "hq", x: 1, z: 1 }
    ],
    // Set JSON-a çevriləndə köhnə snapshot-larda məhz belə {} qalırdı.
    cachedBlockedCells: {}
  };

  const netice = snapshotiCariStateIleBirlesdir(cariState, kohneSnapshot);

  assert.strictEqual(netice, true, "Snapshot restore uğurlu olmalıdır.");
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(cariState, "cachedBlockedCells"),
    false,
    "Köhnə xarab runtime cache restore zamanı silinməlidir."
  );
  assert.strictEqual(cariState.playerId, "player_test");
  assert.strictEqual(cariState.buildings.length, 1);
}

function run() {
  testSnapshotSetCacheYazmir();
  testKohneXarabCacheRestoreOlunmur();
  console.log("[OK] Yol runtime cache snapshot regressiya testləri keçdi.");
}

run();