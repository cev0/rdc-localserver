'use strict';

const {
  dovletAcilibmi,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const {
  worldV2ResursHedefiniAl,
} = require('./dovlet_xerite_worldv2_resurs_emeliyyat_sistemi');

const WORLDV2_RESURS_DETAIL_SORGU = 'state_map_v2_resource_detail_request';
const WORLDV2_RESURS_DETAIL_CAVAB = 'state_map_v2_resource_detail_result';

function metnAl(deyer, maksimum = 220) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : '';
}

function tamEdedAl(deyer, fallback = 0) {
  const reqem = Number(deyer);
  return Number.isFinite(reqem)
    ? Math.trunc(reqem)
    : fallback;
}

function homeStateIdAl(state) {
  return Math.max(
    0,
    tamEdedAl(state && state.worldPlacement && state.worldPlacement.stateId),
  );
}

function gonder(kontekst, melumat) {
  kontekst.send(kontekst.ws, {
    type: WORLDV2_RESURS_DETAIL_CAVAB,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function'
      ? kontekst.nowMs()
      : Date.now(),
  });
}

async function dovletXeriteWorldV2ResursMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (type !== WORLDV2_RESURS_DETAIL_SORGU) return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128,
  );

  if (!playerId) {
    gonder(kontekst, {
      success: false,
      errorCode: 'WORLDV2_AUTH_REQUIRED',
      message: 'Resurs məlumatı üçün autentifikasiya tələb olunur.',
    });
    return true;
  }

  try {
    if (!kontekst || typeof kontekst.getOrCreatePlayerState !== 'function') {
      throw new Error('WorldV2 resurs handler üçün player state provider yoxdur.');
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const homeStateId = homeStateIdAl(state);
    const stateId = Math.max(0, tamEdedAl(kontekst && kontekst.msg && kontekst.msg.stateId));
    const targetId = metnAl(kontekst && kontekst.msg && kontekst.msg.targetId, 220);
    const nowMs = typeof kontekst.nowMs === 'function' ? kontekst.nowMs() : Date.now();

    if (homeStateId <= 0) {
      gonder(kontekst, {
        success: false,
        playerId,
        errorCode: 'WORLDV2_PLACEMENT_MISSING',
        message: 'Oyunçunun Ev Dövləti tapılmadı.',
      });
      return true;
    }

    if (stateId <= 0 || !targetId) {
      gonder(kontekst, {
        success: false,
        playerId,
        homeStateId,
        errorCode: 'WORLDV2_RESOURCE_DETAIL_INVALID',
        message: 'Resurs State ID və targetId tələb olunur.',
      });
      return true;
    }

    if (stateId !== homeStateId && !dovletAcilibmi(stateId, nowMs)) {
      gonder(kontekst, {
        success: false,
        playerId,
        homeStateId,
        stateId,
        errorCode: 'WORLDV2_VIEW_STATE_LOCKED',
        message: `Dövlət #${stateId} hələ açılmayıb.`,
        readOnlyView: true,
        persistentPlacementMutated: false,
      });
      return true;
    }

    const netice = await worldV2ResursHedefiniAl(stateId, targetId, nowMs);
    if (!netice || netice.success !== true || !netice.hedef) {
      gonder(kontekst, {
        success: false,
        playerId,
        homeStateId,
        stateId,
        targetId,
        errorCode: netice && netice.errorCode
          ? netice.errorCode
          : 'WORLDV2_RESOURCE_NOT_FOUND',
        message: netice && netice.message
          ? netice.message
          : 'Resurs tapılmadı.',
        readOnlyView: stateId !== homeStateId,
        persistentPlacementMutated: false,
      });
      return true;
    }

    const info = {
      version: 2,
      homeStateId,
      stateId,
      readOnlyView: stateId !== homeStateId,
      persistentPlacementMutated: false,
      resource: netice.hedef,
    };

    gonder(kontekst, {
      success: true,
      playerId,
      homeStateId,
      stateId,
      targetId,
      info,
      payloadJson: JSON.stringify(info),
    });
  }
  catch (xeta) {
    console.error('[DÖVLƏT XƏRİTƏSİ WORLDV2 RESURS DETAIL]', xeta);
    gonder(kontekst, {
      success: false,
      playerId,
      errorCode: 'WORLDV2_RESOURCE_DETAIL_FAILED',
      message: 'Resurs məlumatı serverdən alına bilmədi.',
    });
  }

  return true;
}

module.exports = {
  WORLDV2_RESURS_DETAIL_SORGU,
  WORLDV2_RESURS_DETAIL_CAVAB,
  dovletXeriteWorldV2ResursMesajiniEmalEt,
};
