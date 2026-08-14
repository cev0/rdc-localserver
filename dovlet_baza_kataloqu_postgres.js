"use strict";

const { sorguEt } = require("./verilenler_bazasi");
const { XERITE } = require("./xerite_movqe_sistemi");

const SNAPSHOT_HADISE_NOVU = "oyun_state_snapshot_v1";
const BAZA_KESHI_MS = 3000;
const bazaKeshi = new Map();
const aktivSorqular = new Map();

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function zonaAl(x, z) {
  const dx = Number(x) - Number(XERITE.centerX);
  const dz = Number(z) - Number(XERITE.centerZ);
  const mesafe = Math.sqrt((dx * dx) + (dz * dz));

  if (mesafe <= Number(XERITE.innerRadius)) return "inner_green";
  if (mesafe <= Number(XERITE.middleRadius)) return "middle";
  return "outer";
}

function binaIdAl(bina) {
  return metnAl(bina && bina.buildingId, 128).toLowerCase();
}

function binaLeveliniAl(state, buildingId) {
  const axtarilan = metnAl(buildingId, 128).toLowerCase();
  let maksimum = 0;

  for (const bina of Array.isArray(state && state.buildings) ? state.buildings : []) {
    if (!bina || binaIdAl(bina) !== axtarilan) continue;
    if (bina.isCompleted === false) continue;

    maksimum = Math.max(
      maksimum,
      Math.max(1, tamEded(bina.level) || 1)
    );
  }

  return maksimum;
}

function tamamlanmisBinaSayiniAl(state) {
  let say = 0;
  for (const bina of Array.isArray(state && state.buildings) ? state.buildings : []) {
    if (!bina || bina.isCompleted === false) continue;
    if (binaIdAl(bina) === "road") continue;
    say++;
  }
  return say;
}

function publicGucuAl(state) {
  const namizedler = [
    state && state.totalPower,
    state && state.power,
    state && state.stats && state.stats.totalPower,
    state && state.stats && state.stats.power
  ];

  for (const deyer of namizedler) {
    if (deyer == null || typeof deyer === "object") continue;
    const say = Number(deyer);
    if (Number.isFinite(say) && say >= 0) {
      return Math.trunc(say);
    }
  }

  return null;
}

function bazaElementiniHazirla(playerId, state, stateId) {
  if (!state || typeof state !== "object") return null;
  const wp = state.worldPlacement;
  if (!wp || typeof wp !== "object") return null;

  const sid = Math.max(1, tamEded(wp.stateId) || 1);
  if (sid !== stateId) return null;

  const baseX = reqemAl(wp.baseX);
  const baseZ = reqemAl(wp.baseZ);
  if (baseX === null || baseZ === null) return null;

  const dx = baseX - Number(XERITE.centerX);
  const dz = baseZ - Number(XERITE.centerZ);
  const distanceToCenter = Math.round(Math.sqrt((dx * dx) + (dz * dz)));

  return {
    playerId: metnAl(playerId, 128),
    stateId: sid,
    baseX,
    baseZ,
    x: baseX,
    z: baseZ,
    zoneId: zonaAl(baseX, baseZ),
    distanceToCenter,
    hqLevel: binaLeveliniAl(state, "hq"),
    completedBuildingCount: tamamlanmisBinaSayiniAl(state),
    publicPower: publicGucuAl(state)
  };
}

async function bazalariPostgresdenAl(sid) {
  const netice = await sorguEt(
    `
      WITH son_snapshot AS (
        SELECT DISTINCT ON (oyuncu_id)
          oyuncu_id,
          detallar
        FROM hesab_audit_jurnali
        WHERE hadise_novu = $1
          AND detallar #>> '{state,worldPlacement,stateId}' = $2
        ORDER BY oyuncu_id, id DESC
      )
      SELECT oyuncu_id, detallar
      FROM son_snapshot
      ORDER BY oyuncu_id ASC
    `,
    [SNAPSHOT_HADISE_NOVU, String(sid)]
  );

  const bases = [];
  for (const row of (netice.rows || [])) {
    const detallar = row && row.detallar;
    const state = detallar && typeof detallar === "object" ? detallar.state : null;
    const item = bazaElementiniHazirla(row && row.oyuncu_id, state, sid);
    if (item && item.playerId) bases.push(item);
  }

  return {
    version: 3,
    stateId: sid,
    count: bases.length,
    bases
  };
}

async function dovletBazalariniAl(stateId, nowMs = Date.now()) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const now = tamEded(nowMs) || Date.now();
  const cached = bazaKeshi.get(sid);

  if (cached && cached.expiresAtMs > now && cached.value) {
    return kopyala(cached.value);
  }

  const movcudSorqu = aktivSorqular.get(sid);
  if (movcudSorqu) {
    return kopyala(await movcudSorqu);
  }

  const promise = (async () => {
    const value = await bazalariPostgresdenAl(sid);
    bazaKeshi.set(sid, {
      expiresAtMs: Date.now() + BAZA_KESHI_MS,
      value: kopyala(value)
    });
    return value;
  })();

  aktivSorqular.set(sid, promise);

  try {
    return kopyala(await promise);
  }
  finally {
    if (aktivSorqular.get(sid) === promise) {
      aktivSorqular.delete(sid);
    }
  }
}

async function dovletBazasiniAl(stateId, targetPlayerId, nowMs = Date.now()) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const target = metnAl(targetPlayerId, 128).toLowerCase();
  if (!target) return null;

  const netice = await dovletBazalariniAl(sid, nowMs);
  return (netice.bases || []).find(item =>
    item && metnAl(item.playerId, 128).toLowerCase() === target
  ) || null;
}

function dovletBazaKeshiniTemizle(stateId = null) {
  if (stateId == null) {
    bazaKeshi.clear();
    return;
  }
  bazaKeshi.delete(Math.max(1, tamEded(stateId) || 1));
}

module.exports = {
  BAZA_KESHI_MS,
  dovletBazalariniAl,
  dovletBazasiniAl,
  dovletBazaKeshiniTemizle
};
