"use strict";

const assert = require("assert");
const {
  pvpZeroingKonvoyRecalliniPostCommitIcraEt
} = require("./pvp_zeroing_konvoy_recall_postcommit");

function hovuzHazirla(log) {
  return {
    async connect() {
      return {
        async query(sql) { log.push(String(sql)); return { rows: [] }; },
        release() { log.push("RELEASE"); }
      };
    }
  };
}

(async () => {
  const log = [];
  let yazilan = null;
  const snapshot = {
    playerId: "defender",
    pvpCity: { convoyRecallPending: true },
    konvoyEmeliyyatlari: { activeByConvoy: { konvoy_1: { status: "marching" } }, history: [] }
  };

  const ok = await pvpZeroingKonvoyRecalliniPostCommitIcraEt(
    "defender",
    123456,
    {
      hovuz: hovuzHazirla(log),
      lockFn: async () => log.push("LOCK"),
      snapshotAl: async () => JSON.parse(JSON.stringify(snapshot)),
      recallFn: async state => {
        state.konvoyEmeliyyatlari.activeByConvoy = {};
        return { success: true, recalledCount: 1 };
      },
      snapshotYaz: async (_client, _pid, state) => { yazilan = JSON.parse(JSON.stringify(state)); }
    }
  );

  assert.strictEqual(ok.success, true);
  assert.strictEqual(ok.recalledCount, 1);
  assert.strictEqual(yazilan.pvpCity.convoyRecallPending, false);
  assert.strictEqual(yazilan.pvpCity.lastConvoyRecallAtMs, 123456);
  assert.ok(log.includes("COMMIT"));
  assert.ok(log.includes("LOCK"));

  const alreadyLog = [];
  const already = await pvpZeroingKonvoyRecalliniPostCommitIcraEt(
    "defender",
    123457,
    {
      hovuz: hovuzHazirla(alreadyLog),
      lockFn: async () => {},
      snapshotAl: async () => ({ playerId: "defender", pvpCity: { convoyRecallPending: false } }),
      recallFn: async () => { throw new Error("çağırılmamalıdır"); },
      snapshotYaz: async () => { throw new Error("yazılmamalıdır"); }
    }
  );
  assert.strictEqual(already.alreadyCompleted, true);
  assert.ok(alreadyLog.includes("COMMIT"));

  const failLog = [];
  let failWrite = false;
  await assert.rejects(async () => {
    await pvpZeroingKonvoyRecalliniPostCommitIcraEt(
      "defender",
      123458,
      {
        hovuz: hovuzHazirla(failLog),
        lockFn: async () => {},
        snapshotAl: async () => ({ playerId: "defender", pvpCity: { convoyRecallPending: true } }),
        recallFn: async () => { throw new Error("runtime sync fail"); },
        snapshotYaz: async () => { failWrite = true; }
      }
    );
  }, /runtime sync fail/);
  assert.strictEqual(failWrite, false);
  assert.ok(failLog.includes("ROLLBACK"));

  console.log("pvp_zeroing_konvoy_recall_postcommit_testi: OK");
})().catch(err => { console.error(err); process.exit(1); });
