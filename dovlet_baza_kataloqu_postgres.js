"use strict";

const { sorguEt } = require("./verilenler_bazasi");
const { XERITE } = require("./xerite_movqe_sistemi");

const SNAPSHOT_HADISE_NOVU = "oyun_state_snapshot_v1";

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

function zonaAl(x, z) {
  const dx = Number(x) - Number(XERITE.centerX);
  const dz = Number(z) - Number(XERITE.centerZ);
  const mesafe = Math.sqrt((dx * dx) + (dz * dz));

  if (mesafe <= Number(XERITE.innerRadius)) return "inner_green";
  if (mesafe <= Number(XERITE.middleRadius)) return "middle";
  return "outer";
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
    distanceToCenter
  };
}

async function dovletBazalariniAl(stateId) {
  const sid = Math.max(1, tamEded(stateId) || 1);

  const netice = await sorguEt(
    `
      WITH son_snapshot AS (
        SELECT DISTINCT ON (oyuncu_id)
          oyuncu_id,
          detallar
        FROM hesab_audit_jurnali
        WHERE hadise_novu = $1
        ORDER BY oyuncu_id, id DESC
      )
      SELECT oyuncu_id, detallar
      FROM son_snapshot
      WHERE detallar #>> '{state,worldPlacement,stateId}' = $2
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
    version: 1,
    stateId: sid,
    count: bases.length,
    bases
  };
}

module.exports = {
  dovletBazalariniAl
};
