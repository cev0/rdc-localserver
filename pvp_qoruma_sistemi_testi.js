"use strict";

const assert = require("assert");
const {
  pvpQorumaMelumatiniAl,
  pvpHedefQorunurmuPublicBaza,
  tekrarHucumBloklayicisiniAl,
  ugurluHucumuQeydEt
} = require("./pvp_qoruma_sistemi");
const {
  pvpBazaHucumStartMutasiyasiniIcraEt
} = require("./pvp_baza_hucum_start_xidmeti");

(async () => {
  const now = 1_900_000_000_000;
  const state = {
    playerId: "attacker",
    worldPlacement: { stateId: 1, baseX: 10, baseZ: 10 },
    pvpProtection: { shieldUntilMs: now + 5000, lastShieldItemId: "peace_shield_8h" }
  };
  const info = pvpQorumaMelumatiniAl(state, now);
  assert.strictEqual(info.shieldActive, true);
  assert.strictEqual(info.shieldRemainingMs, 5000);
  assert.strictEqual(info.activationEndpointEnabled, true);
  assert.strictEqual(info.outgoingPvpBlockedWhileShielded, true);

  const publicProtection = pvpHedefQorunurmuPublicBaza({ pvpShieldUntilMs: now + 9000 }, now);
  assert.strictEqual(publicProtection.protected, true);
  assert.strictEqual(publicProtection.remainingMs, 9000);

  const old = process.env.PVP_REPEAT_ATTACK_COOLDOWN_MS;
  process.env.PVP_REPEAT_ATTACK_COOLDOWN_MS = "60000";
  const repeatState = {};
  assert.strictEqual(tekrarHucumBloklayicisiniAl(repeatState, "defender", now), null);
  ugurluHucumuQeydEt(repeatState, "defender", now);
  const blocked = tekrarHucumBloklayicisiniAl(repeatState, "defender", now + 1000);
  assert.ok(blocked);
  assert.strictEqual(blocked.code, "repeat_attack_cooldown");
  assert.strictEqual(blocked.remainingMs, 59000);
  assert.strictEqual(tekrarHucumBloklayicisiniAl(repeatState, "defender", now + 60000), null);
  if (old == null) delete process.env.PVP_REPEAT_ATTACK_COOLDOWN_MS;
  else process.env.PVP_REPEAT_ATTACK_COOLDOWN_MS = old;

  const fakeClient = { query: async () => ({ rows: [] }) };
  const ownShieldAttack = await pvpBazaHucumStartMutasiyasiniIcraEt(
    state,
    "attacker",
    { requestId: "req-own-shield", convoyId: "konvoy_1", targetPlayerId: "defender" },
    fakeClient,
    now,
    { hedefBazaAl: async () => null }
  );
  assert.strictEqual(ownShieldAttack.success, false);
  assert.strictEqual(ownShieldAttack.blocker, "attacker_pvp_shield_active");

  const attackState = {
    playerId: "attacker",
    worldPlacement: { stateId: 1, baseX: 10, baseZ: 10 }
  };
  const result = await pvpBazaHucumStartMutasiyasiniIcraEt(
    attackState,
    "attacker",
    { requestId: "req-shield-1", convoyId: "konvoy_1", targetPlayerId: "defender" },
    fakeClient,
    now,
    {
      hedefBazaAl: async () => ({
        playerId: "defender",
        stateId: 1,
        x: 20,
        z: 20,
        hqLevel: 10,
        pvpShieldUntilMs: now + 120000
      })
    }
  );
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.blocker, "target_pvp_shield_active");
  assert.strictEqual(result.remainingMs, 120000);

  console.log("pvp_qoruma_sistemi_testi: OK");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
