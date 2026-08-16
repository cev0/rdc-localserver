"use strict";

const assert = require("assert");
const { pvpDoyusuHesabla } = require("./pvp_doyus_resolver");

function snap(side, troops, formation) {
  return {
    version: 1,
    side,
    troops,
    formation: formation || [],
    heroIds: [],
    locked: true
  };
}

(function hucumcuQelebesiVeIkiTerefItkisi() {
  const attacker = snap("attacker", { warrior_t5: 100 }, [
    { siraId: "sira_1", unitId: "warrior_t5", count: 100 }
  ]);
  const defender = snap("defender", { shooter_t1: 50 });
  const r = pvpDoyusuHesabla(attacker, defender, 1000);
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.winnerSide, "attacker");
  assert.ok(r.attackerPower > r.defenderPower);
  assert.ok(r.attackerCasualtyPlan.totalLoss >= 0);
  assert.ok(r.defenderCasualtyPlan.totalLoss > 0);
})();

(function mudafieciQelebesi() {
  const attacker = snap("attacker", { warrior_t1: 10 }, [
    { siraId: "sira_1", unitId: "warrior_t1", count: 10 }
  ]);
  const defender = snap("defender", { vehicle_t8: 100 });
  const r = pvpDoyusuHesabla(attacker, defender, 2000);
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.winnerSide, "defender");
  assert.strictEqual(r.attackerVictory, false);
})();

(function mudafieButunUnitTipleriniItkiPlanindaSaxlayir() {
  const attacker = snap("attacker", { warrior_t10: 300 }, [
    { siraId: "sira_1", unitId: "warrior_t10", count: 300 }
  ]);
  const defenderTroops = {
    warrior_t1: 30,
    warrior_t2: 30,
    shooter_t1: 30,
    shooter_t2: 30,
    vehicle_t1: 30
  };
  const r = pvpDoyusuHesabla(attacker, snap("defender", defenderTroops), 3000);
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.defenderCasualtyPlan.siralar.length, 5);
  const total = r.defenderCasualtyPlan.siralar.reduce((c, x) => c + x.itki, 0);
  assert.strictEqual(total, r.defenderCasualtyPlan.totalLoss);
  for (const row of r.defenderCasualtyPlan.siralar) {
    assert.strictEqual(row.itki, row.agirYaraliNamized + row.yungulYarali + row.birbasaOlu);
  }
})();

(function clientSaxtaPowerGondereBilmir() {
  const attacker = snap("attacker", { warrior_t1: 10 }, [
    { siraId: "sira_1", unitId: "warrior_t1", count: 10 }
  ]);
  attacker.troopPower = 999999999;
  const defender = snap("defender", { vehicle_t8: 100 });
  defender.troopPower = 1;
  const r = pvpDoyusuHesabla(attacker, defender, 4000);
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.winnerSide, "defender");
})();

(function namelumUnitBloklanir() {
  const r = pvpDoyusuHesabla(
    snap("attacker", { hacker_t99: 100 }, [{ siraId: "sira_1", unitId: "hacker_t99", count: 100 }]),
    snap("defender", { warrior_t1: 1 }),
    5000
  );
  assert.strictEqual(r.success, false);
  assert.ok(Array.isArray(r.unknownUnitIds));
})();

console.log("PvP iki tərəf server resolver testləri: OK");
