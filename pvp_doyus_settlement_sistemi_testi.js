"use strict";

const assert = require("assert");
const {
  pvpDoyusunuIkiStateUzerindeTetbiqEt,
  pvpDoyusSettlementiniPostgresIleIcraEt
} = require("./pvp_doyus_settlement_sistemi");

function kopyala(v) { return v == null ? null : JSON.parse(JSON.stringify(v)); }

function attackerStateHazirla() {
  return {
    playerId: "oyuncu_a",
    army: { troops: { fighter_lv1: 100 } },
    konvoylar: { items: [{
      konvoyId: "konvoy_1", aciqdir: true, defenseEnabled: true,
      qosunlar: { fighter_lv1: 100 }, qehremanIdleri: [],
      formasiya: { siralar: [{ siraId: "sira_1", unitId: "fighter_lv1", count: 100 }] }
    }] },
    konvoyEmeliyyatlari: {
      version: 3, history: [], activeByConvoy: {
        konvoy_1: {
          version: 1, operationId: "pvp:oyuncu_a:konvoy_1:1000", playerId: "oyuncu_a",
          convoyId: "konvoy_1", targetType: "player_base", targetId: "oyuncu_b", targetPlayerId: "oyuncu_b",
          stateId: 1, fromX: 0, fromZ: 0, targetX: 5, targetZ: 5,
          attackerCombatSnapshot: {
            version: 1, side: "attacker", convoyId: "konvoy_1",
            troops: { fighter_lv1: 100 },
            formation: [{ siraId: "sira_1", unitId: "fighter_lv1", count: 100 }],
            heroIds: [], troopCount: 100, troopPower: 999999999,
            heroPowerApplied: false, snapshottedAtMs: 1000, locked: true
          },
          startedAtMs: 1000, arrivalAtMs: 5000, travelDurationMs: 4000,
          status: "ready_for_pvp_battle", battleAllowed: true, battleResolved: false,
          result: null, lightWoundedFormation: []
        }
      }
    }
  };
}

function defenderStateHazirla(duplicateRows = false) {
  return {
    playerId: "oyuncu_b",
    technology: { levels: { ikinci_konvoy: 1 } },
    army: { troops: { fighter_lv1: 60, shooter_lv1: 30 } },
    konvoylar: { items: [
      {
        konvoyId: "konvoy_1", aciqdir: true, defenseEnabled: true,
        qosunlar: { fighter_lv1: 30 }, qehremanIdleri: [],
        formasiya: { siralar: duplicateRows
          ? [
              { siraId: "sira_1", unitId: "fighter_lv1", count: 15 },
              { siraId: "sira_1", unitId: "fighter_lv1", count: 15 }
            ]
          : [{ siraId: "sira_1", unitId: "fighter_lv1", count: 30 }]
        }
      },
      {
        konvoyId: "konvoy_2", aciqdir: true, defenseEnabled: true,
        qosunlar: { fighter_lv1: 30 }, qehremanIdleri: [],
        formasiya: { siralar: [{ siraId: "sira_1", unitId: "fighter_lv1", count: 30 }] }
      },
      {
        konvoyId: "konvoy_3", aciqdir: true, defenseEnabled: false,
        qosunlar: { shooter_lv1: 30 }, qehremanIdleri: [],
        formasiya: { siralar: [{ siraId: "sira_1", unitId: "shooter_lv1", count: 30 }] }
      }
    ] },
    konvoyEmeliyyatlari: { version: 3, history: [], activeByConvoy: {} }
  };
}

function fakeHovuzHazirla(snapshotByPlayerId) {
  const sorqular = [];
  const yazilan = {};
  const client = {
    async query(sql, parametrler = []) {
      const q = String(sql || "").replace(/\s+/g, " ").trim();
      sorqular.push({ sql: q, parametrler: kopyala(parametrler) });
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(q)) return { rows: [] };
      if (q.startsWith("SELECT pg_advisory_xact_lock")) return { rows: [{}] };
      if (q.startsWith("SELECT detallar")) {
        const playerId = String(parametrler[0] || "").trim().toLowerCase();
        const state = snapshotByPlayerId[playerId];
        return state ? { rows: [{ detallar: { version: 1, state: kopyala(state) } }] } : { rows: [] };
      }
      if (q.startsWith("INSERT INTO hesab_audit_jurnali")) {
        const playerId = String(parametrler[0] || "").trim().toLowerCase();
        yazilan[playerId] = JSON.parse(parametrler[2]).state;
        return { rowCount: 1, rows: [] };
      }
      if (q.startsWith("DELETE FROM hesab_audit_jurnali")) return { rowCount: 0, rows: [] };
      throw new Error(`Gözlənilməyən SQL: ${q}`);
    },
    release() {}
  };
  return { hovuz: { async connect() { return client; } }, sorqular, yazilan };
}

(async function testleriIcraEt() {
  {
    const attacker = attackerStateHazirla();
    const defender = defenderStateHazirla();
    const disabledBefore = kopyala(defender.konvoylar.items[2]);
    const result = pvpDoyusunuIkiStateUzerindeTetbiqEt(
      attacker, defender, "konvoy_1", "pvp:oyuncu_a:konvoy_1:1000", 6000
    );
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deyisdi, true);
    assert.strictEqual(result.operation.battleResolved, true);
    assert.strictEqual(result.operation.status, "returning");
    assert.strictEqual(result.operation.returnStartedAtMs, 6000);
    assert.strictEqual(result.operation.returnEndsAtMs, 10000);
    assert.deepStrictEqual(result.operation.result.defenderConvoyIds, ["konvoy_1", "konvoy_2"]);
    assert.notStrictEqual(result.combat.attackerPower, 999999999);
    assert.deepStrictEqual(defender.konvoylar.items[2], disabledBefore);
    assert.strictEqual(defender.army.troops.shooter_lv1, 30);
    assert.ok(defender.army.troops.fighter_lv1 <= 60);
    assert.ok(attacker.army.troops.fighter_lv1 <= 100);

    const once = kopyala({ attacker, defender });
    const replay = pvpDoyusunuIkiStateUzerindeTetbiqEt(attacker, defender, "konvoy_1", "pvp:oyuncu_a:konvoy_1:1000", 7000);
    assert.strictEqual(replay.success, true);
    assert.strictEqual(replay.alreadyResolved, true);
    assert.deepStrictEqual({ attacker, defender }, once);
  }

  {
    const liveAttacker = attackerStateHazirla();
    const liveDefender = defenderStateHazirla(true);
    const beforeAttacker = kopyala(liveAttacker);
    const beforeDefender = kopyala(liveDefender);
    const fake = fakeHovuzHazirla({ oyuncu_a: liveAttacker, oyuncu_b: liveDefender });
    let error = null;
    try {
      await pvpDoyusSettlementiniPostgresIleIcraEt(
        { playerId: "oyuncu_a", cariState: liveAttacker },
        { playerId: "oyuncu_b", cariState: liveDefender },
        "konvoy_1", "pvp:oyuncu_a:konvoy_1:1000", 6000,
        { runnerSecimleri: { hovuz: fake.hovuz } }
      );
    }
    catch (err) { error = err; }
    assert.ok(error, "Etibarsız defender formasiya settlement-i uğursuz olmalıdır.");
    assert.ok(fake.sorqular.some(x => x.sql === "ROLLBACK"));
    assert.ok(!fake.sorqular.some(x => x.sql === "COMMIT"));
    assert.deepStrictEqual(fake.yazilan, {});
    assert.deepStrictEqual(liveAttacker, beforeAttacker);
    assert.deepStrictEqual(liveDefender, beforeDefender);
  }

  console.log("[PVP_DOYUS_SETTLEMENT_TEST] OK");
})().catch(err => {
  console.error("[PVP_DOYUS_SETTLEMENT_TEST] XETA", err);
  process.exitCode = 1;
});
