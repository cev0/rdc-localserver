"use strict";
const assert = require("assert");
const { bosMovqeSec, MIN_BASE_DISTANCE, zeroingiTetbiqEt } = require("./pvp_zeroing_yerdeyisme_sistemi");

const occupied = [{ x: 512, z: 850 }, { x: 700, z: 800 }];
const a = bosMovqeSec(1, "player_a", 12345, occupied);
const b = bosMovqeSec(1, "player_a", 12345, occupied);
assert.deepStrictEqual(a, b);
for (const p of occupied) {
  const dx = a.x - p.x, dz = a.z - p.z;
  assert.ok((dx * dx + dz * dz) >= MIN_BASE_DISTANCE * MIN_BASE_DISTANCE);
}

const queries = [];
const fakeClient = {
  async query(sql, params) {
    queries.push({ sql, params });
    if (String(sql).includes("pg_advisory_xact_lock")) return { rows: [] };
    return {
      rows: [{
        oyuncu_id: "other",
        detallar: { state: { worldPlacement: { stateId: 1, baseX: 512, baseZ: 850 } } }
      }]
    };
  }
};
const state = {
  worldPlacement: { stateId: 1, baseX: 600, baseZ: 800 },
  pvpCity: { version: 1, maxDurability: 10000, durability: 0, zeroingPending: true, zeroedAtMs: 12345 }
};

(async () => {
  const r = await zeroingiTetbiqEt(state, "player_a", fakeClient, 20000);
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.zeroed, true);
  assert.strictEqual(state.pvpCity.zeroingPending, false);
  assert.strictEqual(state.pvpCity.durability, 10000);
  assert.strictEqual(state.pvpCity.convoyRecallPending, true);
  assert.strictEqual(state.worldPlacement.lastTeleportReason, "pvp_zeroing");
  assert.notStrictEqual(`${state.worldPlacement.baseX}:${state.worldPlacement.baseZ}`, "600:800");
  assert.ok(queries.some(x => String(x.sql).includes("pg_advisory_xact_lock")));
  console.log("pvp_zeroing_yerdeyisme_sistemi_testi: OK");
})().catch(err => { console.error(err); process.exit(1); });
