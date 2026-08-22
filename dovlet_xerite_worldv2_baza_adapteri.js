'use strict';

const {
  koordinatEtibarlidir,
} = require('./dovlet_xerite_worldv2_qaydalari');

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

/**
 * Mövcud authoritative players Map-dən yalnız tələb olunan Dövlətə aid
 * baza mövqelərini çıxarır.
 *
 * QAYDALAR:
 * - persistent baseX/baseZ rename edilmir;
 * - yalnız WorldV2 0..1200 koordinatına uyğun bazalar buraxılır;
 * - ittifaq adı stable ID kimi istifadə olunmur;
 * - allianceId yalnız state-də ayrıca real sahə varsa ötürülür.
 */
function worldV2BazalariniPlayersMapDanAl(players, stateId) {
  const sid = Number(stateId);
  if (!(players instanceof Map)) {
    throw new Error('WorldV2 baza adapteri üçün players Map tələb olunur.');
  }

  if (!Number.isInteger(sid) || sid <= 0) {
    throw new Error(`Etibarsız Dövlət ID-si: ${stateId}`);
  }

  const netice = [];

  for (const [mapPlayerId, state] of players.entries()) {
    if (!state || typeof state !== 'object') continue;

    const wp = state.worldPlacement;
    if (!wp || typeof wp !== 'object') continue;

    const playerStateId = Number(wp.stateId);
    const baseX = Number(wp.baseX);
    const baseZ = Number(wp.baseZ);

    if (playerStateId !== sid) continue;
    if (!koordinatEtibarlidir(baseX, baseZ)) continue;

    const playerId = metnAl(state.playerId, 128)
      || metnAl(mapPlayerId, 128);

    if (!playerId) continue;

    // Stable allianceId üçün yalnız ayrıca identifikator sahələrini qəbul edirik.
    // ittifaqAdi/allianceName burada ID-yə çevrilmir.
    const allianceId = metnAl(state.allianceId, 128)
      || metnAl(state.ittifaqId, 128)
      || null;

    const allianceName = metnAl(state.ittifaqAdi, 128)
      || metnAl(state.allianceName, 128)
      || null;

    netice.push({
      playerId,
      baseX,
      baseZ,
      allianceId,
      allianceName,
    });
  }

  return netice;
}

module.exports = {
  worldV2BazalariniPlayersMapDanAl,
};
