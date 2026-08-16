"use strict";

const SEHER_DAVAMLILIQ_VERSIYA = 1;
const DEFAULT_MAX_DURABILITY = 10000;
const DEFAULT_VICTORY_DAMAGE = 1300;
const DEFAULT_FIRE_DURATION_MS = 20 * 60 * 1000;

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function teminEt(state) {
  if (!state || typeof state !== "object") throw new Error("Şəhər davamlılığı üçün state tələb olunur.");
  if (!state.pvpCity || typeof state.pvpCity !== "object") state.pvpCity = {};
  const city = state.pvpCity;
  city.version = SEHER_DAVAMLILIQ_VERSIYA;
  city.maxDurability = tamEded(city.maxDurability) || DEFAULT_MAX_DURABILITY;
  if (!Number.isFinite(Number(city.durability))) city.durability = city.maxDurability;
  city.durability = Math.min(city.maxDurability, tamEded(city.durability));
  city.fireEndsAtMs = tamEded(city.fireEndsAtMs);
  city.lastDamageAtMs = tamEded(city.lastDamageAtMs);
  city.zeroedAtMs = tamEded(city.zeroedAtMs);
  city.zeroingPending = city.zeroingPending === true;
  return city;
}

function veziyyetiAl(state, nowMs = Date.now()) {
  const city = teminEt(state);
  const now = tamEded(nowMs) || Date.now();
  if (city.fireEndsAtMs > 0 && city.fireEndsAtMs <= now) city.fireEndsAtMs = 0;
  return {
    version: city.version,
    durability: city.durability,
    maxDurability: city.maxDurability,
    burning: city.fireEndsAtMs > now,
    fireEndsAtMs: city.fireEndsAtMs,
    zeroingPending: city.zeroingPending,
    zeroedAtMs: city.zeroedAtMs
  };
}

function qalibPvpHucumunuTetbiqEt(defenderState, nowMs = Date.now(), secimler = null) {
  const city = teminEt(defenderState);
  const now = tamEded(nowMs) || Date.now();
  const damage = tamEded(secimler && secimler.damage) || DEFAULT_VICTORY_DAMAGE;
  const fireDurationMs = tamEded(secimler && secimler.fireDurationMs) || DEFAULT_FIRE_DURATION_MS;
  const before = city.durability;
  const appliedDamage = Math.min(before, damage);
  city.durability = Math.max(0, before - appliedDamage);
  city.lastDamageAtMs = now;
  city.fireEndsAtMs = Math.max(city.fireEndsAtMs, now + fireDurationMs);
  if (city.durability === 0) {
    city.zeroingPending = true;
    city.zeroedAtMs = now;
  }
  return {
    success: true,
    damage: appliedDamage,
    durabilityBefore: before,
    durabilityAfter: city.durability,
    maxDurability: city.maxDurability,
    burning: city.fireEndsAtMs > now,
    fireEndsAtMs: city.fireEndsAtMs,
    zeroed: city.durability === 0,
    zeroingPending: city.zeroingPending
  };
}

function zeroingTamamlandi(state, newDurability = null) {
  const city = teminEt(state);
  city.zeroingPending = false;
  const requested = tamEded(newDurability);
  city.durability = requested > 0 ? Math.min(city.maxDurability, requested) : city.maxDurability;
  return { success: true, durability: city.durability, maxDurability: city.maxDurability };
}

module.exports = {
  SEHER_DAVAMLILIQ_VERSIYA,
  DEFAULT_MAX_DURABILITY,
  DEFAULT_VICTORY_DAMAGE,
  DEFAULT_FIRE_DURATION_MS,
  teminEt,
  veziyyetiAl,
  qalibPvpHucumunuTetbiqEt,
  zeroingTamamlandi
};
