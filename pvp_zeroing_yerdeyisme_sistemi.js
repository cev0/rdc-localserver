"use strict";

const { XERITE } = require("./xerite_movqe_sistemi");
const { dovletYerdeyismeKilidiniAlClient } = require("./baza_yerdeyisme_dovlet_kilidi_postgres");
const { zeroingTamamlandi } = require("./pvp_seher_davamliliq_sistemi");

const MIN_RADIUS = 330;
const MAX_RADIUS = 460;
const MIN_BASE_DISTANCE = 18;
const MAX_ATTEMPTS = 200;
const SNAPSHOT_HADISE_NOVU = "oyun_state_snapshot_v1";

function tamEded(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0; }
function metnAl(v, max = 128) { return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : ""; }
function hashSeed(text) { let h = 2166136261 >>> 0; for (const ch of String(text || "")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h || 1; }
function rngHazirla(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function mesafeKv(aX, aZ, bX, bZ) { const dx = Number(aX) - Number(bX); const dz = Number(aZ) - Number(bZ); return dx * dx + dz * dz; }

async function cariBazaMovqeleriniAl(client, stateId, excludePlayerId) {
  const netice = await client.query(`
    WITH son_snapshot AS (
      SELECT DISTINCT ON (oyuncu_id) oyuncu_id, detallar
      FROM hesab_audit_jurnali
      WHERE hadise_novu = $1
      ORDER BY oyuncu_id, id DESC
    )
    SELECT oyuncu_id, detallar FROM son_snapshot
  `, [SNAPSHOT_HADISE_NOVU]);
  const out = [];
  for (const row of netice.rows || []) {
    const pid = metnAl(row && row.oyuncu_id, 128);
    if (!pid || pid === excludePlayerId) continue;
    const state = row && row.detallar && row.detallar.state;
    const wp = state && state.worldPlacement;
    if (!wp || Math.max(1, tamEded(wp.stateId) || 1) !== stateId) continue;
    const x = Number(wp.baseX), z = Number(wp.baseZ);
    if (Number.isFinite(x) && Number.isFinite(z)) out.push({ playerId: pid, x, z });
  }
  return out;
}

function bosMovqeSec(stateId, playerId, zeroedAtMs, occupied) {
  const rng = rngHazirla(hashSeed(`${stateId}:${playerId}:${zeroedAtMs}`));
  const minSq = MIN_BASE_DISTANCE * MIN_BASE_DISTANCE;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = MIN_RADIUS + rng() * (MAX_RADIUS - MIN_RADIUS);
    const x = Math.max(0, Math.min(XERITE.width - 1, Math.round(XERITE.centerX + Math.cos(angle) * radius)));
    const z = Math.max(0, Math.min(XERITE.height - 1, Math.round(XERITE.centerZ + Math.sin(angle) * radius)));
    if (x === XERITE.centerX && z === XERITE.centerZ) continue;
    if ((occupied || []).some(p => mesafeKv(x, z, p.x, p.z) < minSq)) continue;
    return { x, z, zoneId: "outer" };
  }
  throw new Error("Zeroing üçün təhlükəsiz boş Dövlət xəritə mövqeyi tapılmadı.");
}

async function zeroingiTetbiqEt(defenderState, defenderPlayerId, client, nowMs = Date.now()) {
  if (!defenderState || !defenderState.pvpCity || defenderState.pvpCity.zeroingPending !== true) {
    return { success: true, changed: false, zeroed: false };
  }
  if (!client || typeof client.query !== "function") throw new Error("Zeroing üçün PostgreSQL transaction client tələb olunur.");
  const pid = metnAl(defenderPlayerId, 128);
  const wp = defenderState.worldPlacement;
  if (!pid || !wp) throw new Error("Zeroing üçün müdafiəçi worldPlacement tapılmadı.");
  const stateId = Math.max(1, tamEded(wp.stateId) || 1);
  await dovletYerdeyismeKilidiniAlClient(client, stateId);
  const occupied = await cariBazaMovqeleriniAl(client, stateId, pid);
  const oldX = Number(wp.baseX) || 0, oldZ = Number(wp.baseZ) || 0;
  const point = bosMovqeSec(stateId, pid, tamEded(defenderState.pvpCity.zeroedAtMs) || tamEded(nowMs), occupied);
  wp.baseX = point.x; wp.baseZ = point.z; wp.currentZone = point.zoneId; wp.lastTeleportAtMs = tamEded(nowMs) || Date.now();
  wp.lastTeleportReason = "pvp_zeroing";
  defenderState.pvpCity.lastZeroingRelocation = { fromX: oldX, fromZ: oldZ, toX: point.x, toZ: point.z, stateId, atMs: wp.lastTeleportAtMs };
  defenderState.pvpCity.convoyRecallPending = true;
  zeroingTamamlandi(defenderState);
  return { success: true, changed: true, zeroed: true, stateId, fromX: oldX, fromZ: oldZ, toX: point.x, toZ: point.z, convoyRecallPending: true };
}

module.exports = { MIN_RADIUS, MAX_RADIUS, MIN_BASE_DISTANCE, MAX_ATTEMPTS, bosMovqeSec, zeroingiTetbiqEt };
