"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Public PostgreSQL catalogue API is exercised with snapshot rows, without a live DB.
const sandbox = {
  module: { exports: {} },
  require(name) {
    if (name === "./verilenler_bazasi") return { sorguEt() { throw new Error("Unexpected live DB call"); } };
    if (name === "./xerite_movqe_sistemi") return { XERITE: { centerX: 512, centerZ: 512, innerRadius: 100, middleRadius: 300 } };
    throw new Error("Unexpected dependency: " + name);
  }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "dovlet_baza_kataloqu_postgres.js"), "utf8"), sandbox);
const catalogue = sandbox.module.exports;

async function publicBase(level, completed, jobs) {
  const state = {
    worldPlacement: { stateId: 1, baseX: 265, baseZ: 844 },
    buildings: [{ instanceId: "hq-1", buildingId: "hq", level, isCompleted: completed }],
    builders: { jobs },
    oyuncuAdi: "Commander"
  };
  const before = JSON.stringify(state);
  const client = { async query() { return { rows: [{ oyuncu_id: "player-1", detallar: { state } }] }; } };
  const result = await catalogue.dovletBazalariniBirbasaPostgresdenAlClient(client, 1);
  assert.strictEqual(JSON.stringify(state), before, "Reading the catalogue must not modify gameplay state.");
  assert.strictEqual(result.bases.length, 1);
  assert.strictEqual(result.bases[0].baseX, 265);
  assert.strictEqual(result.bases[0].baseZ, 844);
  assert.strictEqual(result.bases[0].commanderName, "Commander");
  return result.bases[0];
}

async function run() {
  for (const level of [1, 5, 6, 16, 17, 30]) {
    const base = await publicBase(level, true, []);
    assert.strictEqual(base.hqLevel, level);
    assert.strictEqual(base.completedBuildingCount, 1);
  }
  for (const level of [5, 6, 16, 17]) {
    const base = await publicBase(level, false, [{ kind: "upgrade", buildingInstanceId: "hq-1", currentLevel: level, targetLevel: level + 1 }]);
    assert.strictEqual(base.hqLevel, level, "An upgrade must keep the existing appearance until completion.");
    assert.strictEqual(base.completedBuildingCount, 0, "Only the public HQ appearance field changes.");
  }
  assert.strictEqual((await publicBase(1, false, [{ kind: "build", buildingInstanceId: "hq-1", targetLevel: 1 }])).hqLevel, 0);
  assert.strictEqual((await publicBase(16, false, [{ kind: "upgrade", buildingInstanceId: "other-hq", targetLevel: 17 }])).hqLevel, 0);
  assert.strictEqual((await publicBase(16, false, null)).hqLevel, 0);
  assert.strictEqual((await publicBase(6, true, [])).hqLevel, 6);
  assert.strictEqual((await publicBase(17, true, [])).hqLevel, 17);
  console.log("HQ appearance: completed levels, 5/6 and 16/17 boundaries, active upgrades and incomplete construction passed.");
}

run().catch(error => { console.error(error); process.exitCode = 1; });
