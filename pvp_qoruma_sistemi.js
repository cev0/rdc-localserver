"use strict";

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function envMs(ad) {
  return tamEded(process.env[ad]);
}

function pvpQorumaStateTeminEt(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("PvP qoruma state-i üçün oyunçu state-i tələb olunur.");
  }
  if (!state.pvpProtection || typeof state.pvpProtection !== "object" || Array.isArray(state.pvpProtection)) {
    state.pvpProtection = {};
  }
  const p = state.pvpProtection;
  p.version = 1;
  p.shieldUntilMs = tamEded(p.shieldUntilMs);
  p.lastShieldStartedAtMs = tamEded(p.lastShieldStartedAtMs);
  p.lastShieldEndedAtMs = tamEded(p.lastShieldEndedAtMs);
  if (!p.lastAttackByTarget || typeof p.lastAttackByTarget !== "object" || Array.isArray(p.lastAttackByTarget)) {
    p.lastAttackByTarget = {};
  }
  return p;
}

function pvpQorumaMelumatiniAl(state, nowMs = Date.now()) {
  const p = pvpQorumaStateTeminEt(state);
  const now = tamEded(nowMs) || Date.now();
  const shieldActive = p.shieldUntilMs > now;
  return {
    version: 1,
    shieldActive,
    shieldUntilMs: shieldActive ? p.shieldUntilMs : 0,
    shieldRemainingMs: shieldActive ? Math.max(0, p.shieldUntilMs - now) : 0,
    activationEndpointEnabled: false,
    repeatAttackCooldownMs: envMs("PVP_REPEAT_ATTACK_COOLDOWN_MS"),
    repeatAttackCooldownConfigured: envMs("PVP_REPEAT_ATTACK_COOLDOWN_MS") > 0
  };
}

function pvpHedefQorunurmuPublicBaza(baza, nowMs = Date.now()) {
  const now = tamEded(nowMs) || Date.now();
  const until = tamEded(baza && baza.pvpShieldUntilMs);
  return {
    protected: until > now,
    shieldUntilMs: until > now ? until : 0,
    remainingMs: until > now ? until - now : 0
  };
}

function tekrarHucumBloklayicisiniAl(attackerState, targetPlayerId, nowMs = Date.now()) {
  const target = metnAl(targetPlayerId, 128);
  const cooldownMs = envMs("PVP_REPEAT_ATTACK_COOLDOWN_MS");
  if (!target || cooldownMs <= 0) return null;
  const p = pvpQorumaStateTeminEt(attackerState);
  const lastAtMs = tamEded(p.lastAttackByTarget[target]);
  const now = tamEded(nowMs) || Date.now();
  if (lastAtMs <= 0 || now >= lastAtMs + cooldownMs) return null;
  return {
    code: "repeat_attack_cooldown",
    message: "Eyni oyunçuya təkrar PvP hücumu üçün server cooldown-u hələ bitməyib.",
    retryAtMs: lastAtMs + cooldownMs,
    remainingMs: Math.max(0, lastAtMs + cooldownMs - now)
  };
}

function ugurluHucumuQeydEt(attackerState, targetPlayerId, nowMs = Date.now()) {
  const target = metnAl(targetPlayerId, 128);
  if (!target) return false;
  const p = pvpQorumaStateTeminEt(attackerState);
  p.lastAttackByTarget[target] = tamEded(nowMs) || Date.now();
  return true;
}

module.exports = {
  pvpQorumaStateTeminEt,
  pvpQorumaMelumatiniAl,
  pvpHedefQorunurmuPublicBaza,
  tekrarHucumBloklayicisiniAl,
  ugurluHucumuQeydEt
};
