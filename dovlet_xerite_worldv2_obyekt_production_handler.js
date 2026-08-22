'use strict';

const {
  worldV2ObyektPayloadHazirla,
} = require('./dovlet_xerite_worldv2_obyekt_payload');

const {
  dovletBazalariniAl: dovletBazalariniPostgresdenAl,
} = require('./dovlet_baza_kataloqu_postgres');

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub,
} = require('./oyun_state_daimilik_korpu');

const WORLDV2_OBYEKT_SORGU = 'state_map_v2_objects_request';
const WORLDV2_OBYEKT_CAVAB = 'state_map_v2_objects_result';

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function gonder(kontekst, melumat) {
  if (!kontekst || typeof kontekst.send !== 'function') {
    throw new Error('WorldV2 production handler üçün send funksiyası tələb olunur.');
  }

  kontekst.send(kontekst.ws, {
    type: WORLDV2_OBYEKT_CAVAB,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function'
      ? kontekst.nowMs()
      : Date.now(),
  });
}

function stateIdAl(state) {
  const reqem = Number(
    state && state.worldPlacement && state.worldPlacement.stateId,
  );

  return Number.isInteger(reqem) && reqem > 0
    ? reqem
    : 0;
}

function worldV2ProductionObyektHandleriYarat({
  dovletBazalariniAl = dovletBazalariniPostgresdenAl,
  stateBerpaOlunub = oyuncuStateBerpaOlunub,
  stateBerpaEt = oyunStateIniBerpaEt,
} = {}) {
  if (typeof dovletBazalariniAl !== 'function') {
    throw new Error('WorldV2 production handler üçün dovletBazalariniAl tələb olunur.');
  }

  return async function dovletXeriteWorldV2ObyektProductionMesajiniEmalEt(kontekst) {
    const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
    if (type !== WORLDV2_OBYEKT_SORGU) return false;

    const playerId = metnAl(
      kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
      128,
    );

    if (!playerId) {
      gonder(kontekst, {
        success: false,
        errorCode: 'WORLDV2_AUTH_REQUIRED',
        message: 'WorldV2 Dövlət xəritəsi üçün autentifikasiya tələb olunur.',
      });
      return true;
    }

    try {
      if (typeof kontekst.getOrCreatePlayerState !== 'function') {
        throw new Error('getOrCreatePlayerState kontekstdə yoxdur.');
      }

      if (typeof stateBerpaOlunub === 'function' &&
          !stateBerpaOlunub(playerId) &&
          typeof stateBerpaEt === 'function') {
        await stateBerpaEt(kontekst, playerId);
      }

      const state = kontekst.getOrCreatePlayerState(playerId);
      const stateId = stateIdAl(state);

      if (stateId <= 0) {
        gonder(kontekst, {
          success: false,
          playerId,
          errorCode: 'WORLDV2_PLACEMENT_MISSING',
          message: 'Oyunçunun Dövlət xəritəsi yerləşməsi tapılmadı.',
        });
        return true;
      }

      const nowMs = typeof kontekst.nowMs === 'function'
        ? kontekst.nowMs()
        : Date.now();

      const kataloqNeticesi = await dovletBazalariniAl(stateId, nowMs);
      const bazalar = kataloqNeticesi && Array.isArray(kataloqNeticesi.bases)
        ? kataloqNeticesi.bases
        : [];

      const info = worldV2ObyektPayloadHazirla({
        stateId,
        requestingPlayerId: playerId,
        bases: bazalar,
        serverTimeUnixMs: nowMs,
      });

      gonder(kontekst, {
        success: true,
        playerId,
        stateId,
        info,
        payloadJson: JSON.stringify(info),
      });
    }
    catch (xeta) {
      console.error('[DÖVLƏT XƏRİTƏSİ WORLDV2 PRODUCTION]', xeta);

      gonder(kontekst, {
        success: false,
        playerId,
        errorCode: 'WORLDV2_OBJECTS_READ_FAILED',
        message: 'WorldV2 baza layer-i serverdən alına bilmədi.',
      });
    }

    return true;
  };
}

const dovletXeriteWorldV2ObyektProductionMesajiniEmalEt =
  worldV2ProductionObyektHandleriYarat();

module.exports = {
  WORLDV2_OBYEKT_SORGU,
  WORLDV2_OBYEKT_CAVAB,
  metnAl,
  stateIdAl,
  worldV2ProductionObyektHandleriYarat,
  dovletXeriteWorldV2ObyektProductionMesajiniEmalEt,
};
