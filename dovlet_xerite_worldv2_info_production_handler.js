'use strict';

const {
  DOVLET_XERITESI_V2,
  DOVLET_KECID_STATUSU,
} = require('./dovlet_xerite_worldv2_qaydalari');

const {
  worldV2BaslangicPayloadHazirla,
} = require('./dovlet_xerite_worldv2_payload');

const {
  dovletPlanliVaxtlariniAl,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const WORLDV2_INFO_SORGU = 'state_map_v2_info_request';
const WORLDV2_INFO_CAVAB = 'state_map_v2_info_result';

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function gonder(kontekst, melumat) {
  if (!kontekst || typeof kontekst.send !== 'function') {
    throw new Error('WorldV2 info production handler üçün send funksiyası tələb olunur.');
  }

  kontekst.send(kontekst.ws, {
    type: WORLDV2_INFO_CAVAB,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function'
      ? kontekst.nowMs()
      : Date.now(),
  });
}

function worldPlacementAl(state) {
  const placement = state && state.worldPlacement;
  const stateId = Number(placement && placement.stateId);
  const baseX = Number(placement && placement.baseX);
  const baseZ = Number(placement && placement.baseZ);

  if (!Number.isInteger(stateId) || stateId <= 0 ||
      !Number.isFinite(baseX) || !Number.isFinite(baseZ)) {
    return null;
  }

  return { stateId, baseX, baseZ };
}

function topologiyaHazirOlmayandaQonsulariHazirla() {
  const netice = {};

  for (const istiqamet of DOVLET_XERITESI_V2.serhedIstiqametleri) {
    netice[istiqamet] = {
      stateId: null,
      status: DOVLET_KECID_STATUSU.TOPOLOGIYA_MUEYYEN_DEYIL,
    };
  }

  return netice;
}

function prezidentStatusunuLifecycleIleHazirla(stateId, nowMs) {
  const plan = dovletPlanliVaxtlariniAl(stateId, nowMs);
  const unlockAt = Number.isFinite(Number(plan && plan.presidentUnlockAtMs))
    ? Math.max(0, Math.trunc(Number(plan.presidentUnlockAtMs)))
    : null;

  const acilib = unlockAt !== null && nowMs >= unlockAt;

  return {
    unlocked: acilib,
    active: acilib,
    presidentPlayerId: null,
    presidentAllianceId: null,
    unlockAtUnixMs: unlockAt,
  };
}

function standartStateBerpaOlunub(playerId) {
  const {
    oyuncuStateBerpaOlunub,
  } = require('./oyun_state_daimilik_korpu');

  return oyuncuStateBerpaOlunub(playerId);
}

async function standartStateBerpaEt(kontekst, playerId) {
  const {
    oyunStateIniBerpaEt,
  } = require('./oyun_state_daimilik_korpu');

  return await oyunStateIniBerpaEt(kontekst, playerId);
}

function worldV2InfoProductionHandleriYarat({
  stateBerpaOlunub = standartStateBerpaOlunub,
  stateBerpaEt = standartStateBerpaEt,
} = {}) {
  return async function dovletXeriteWorldV2InfoProductionMesajiniEmalEt(kontekst) {
    const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
    if (type !== WORLDV2_INFO_SORGU) return false;

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
      const placement = worldPlacementAl(state);

      if (placement == null) {
        gonder(kontekst, {
          success: false,
          playerId,
          errorCode: 'WORLDV2_PLACEMENT_MISSING',
          message: 'Oyunçunun Dövlət xəritəsi yerləşməsi tapılmadı.',
        });
        return true;
      }

      const nowMs = typeof kontekst.nowMs === 'function'
        ? Math.max(0, Math.trunc(Number(kontekst.nowMs()) || 0))
        : Date.now();

      // Real local-State qonşuluq ID-ləri hələ gameplay qaydası kimi
      // müəyyən edilməyib. Onları uydurmaq əvəzinə bütün istiqamətlərdə
      // explicit fail-closed status göndəririk. Bu status xəritə info-sunun
      // digər authoritative hissələrinin (playerBase, Prezident, müdafiə)
      // işləməsinə mane olmur və heç bir sərhəd keçidinə icazə vermir.
      const qonsular = topologiyaHazirOlmayandaQonsulariHazirla();
      const prezident = prezidentStatusunuLifecycleIleHazirla(
        placement.stateId,
        nowMs,
      );

      const info = worldV2BaslangicPayloadHazirla({
        stateId: placement.stateId,
        playerId,
        baseX: placement.baseX,
        baseZ: placement.baseZ,
        qonsular,
        prezident,
        serverTimeUnixMs: nowMs,
      });

      gonder(kontekst, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info),
      });
    }
    catch (xeta) {
      console.error('[DÖVLƏT XƏRİTƏSİ WORLDV2 INFO PRODUCTION]', xeta);

      gonder(kontekst, {
        success: false,
        playerId,
        errorCode: 'WORLDV2_INFO_READ_FAILED',
        message: 'WorldV2 Dövlət xəritəsi məlumatı serverdən alına bilmədi.',
      });
    }

    return true;
  };
}

const dovletXeriteWorldV2InfoProductionMesajiniEmalEt =
  worldV2InfoProductionHandleriYarat();

module.exports = {
  WORLDV2_INFO_SORGU,
  WORLDV2_INFO_CAVAB,
  metnAl,
  worldPlacementAl,
  topologiyaHazirOlmayandaQonsulariHazirla,
  prezidentStatusunuLifecycleIleHazirla,
  standartStateBerpaOlunub,
  standartStateBerpaEt,
  worldV2InfoProductionHandleriYarat,
  dovletXeriteWorldV2InfoProductionMesajiniEmalEt,
};
