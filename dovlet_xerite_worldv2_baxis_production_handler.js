'use strict';

const {
  WORLDV2_BAXIS_REJIMI,
  evMovqeyiniHazirla,
  oxunanBaxisHazirla,
  prezidentMerkezineBaxisHazirla,
} = require('./dovlet_xerite_worldv2_baxis_naviqasiyasi');
const {
  dovletAcilibmi,
  qonsuDovletLifecycleStatusunuAl,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');
const {
  DOVLET_XERITESI_V2,
} = require('./dovlet_xerite_worldv2_qaydalari');
const {
  dovletTopologiyasiniAl,
} = require('./dovlet_xerite_worldv2_topologiya');
const {
  worldV2SerhedProductionHandleriYarat,
} = require('./dovlet_xerite_worldv2_serhed_production_handler');

const WORLDV2_BAXIS_SORGU = 'state_map_v2_view_request';
const WORLDV2_BAXIS_CAVAB = 'state_map_v2_view_result';
const WORLDV2_PREZIDENT_FOKUS_SORGU = 'state_map_v2_president_focus_request';
const WORLDV2_PREZIDENT_FOKUS_CAVAB = 'state_map_v2_president_focus_result';
const WORLDV2_EVE_QAYIT_SORGU = 'state_map_v2_home_request';
const WORLDV2_EVE_QAYIT_CAVAB = 'state_map_v2_home_result';

const STATE_BAXIS_REJIMLERI = new Set([
  WORLDV2_BAXIS_REJIMI.YAXIN,
  WORLDV2_BAXIS_REJIMI.ORTA,
  WORLDV2_BAXIS_REJIMI.UZAQ,
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string' ? deyer.trim().slice(0, maksimum) : '';
}

function cavabGonder(kontekst, type, melumat) {
  if (!kontekst || typeof kontekst.send !== 'function') {
    throw new Error('WorldV2 baxış handler üçün send funksiyası tələb olunur.');
  }

  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function' ? kontekst.nowMs() : Date.now(),
  });
}

function cavabNovunuAl(type) {
  if (type === WORLDV2_PREZIDENT_FOKUS_SORGU) return WORLDV2_PREZIDENT_FOKUS_CAVAB;
  if (type === WORLDV2_EVE_QAYIT_SORGU) return WORLDV2_EVE_QAYIT_CAVAB;
  return WORLDV2_BAXIS_CAVAB;
}

function playerStateAl(kontekst, playerId) {
  if (!kontekst || typeof kontekst.getOrCreatePlayerState !== 'function') {
    throw new Error('WorldV2 baxış handler üçün getOrCreatePlayerState tələb olunur.');
  }

  const state = kontekst.getOrCreatePlayerState(playerId);
  if (!state || typeof state !== 'object') {
    const xeta = new Error('Oyunçu state-i tapılmadı.');
    xeta.code = 'WORLDV2_STATE_MISSING';
    throw xeta;
  }
  return state;
}

function qonsulariHazirla(topologiyaXeritesi, stateId, nowMs) {
  if (!(topologiyaXeritesi instanceof Map)) return null;

  const topologiya = dovletTopologiyasiniAl(topologiyaXeritesi, stateId);
  const netice = {};
  for (const istiqamet of DOVLET_XERITESI_V2.serhedIstiqametleri) {
    const status = qonsuDovletLifecycleStatusunuAl(topologiya[istiqamet], nowMs);
    netice[istiqamet] = {
      stateId: status.stateId,
      status: status.status,
      opened: status.acilib,
    };
  }
  return netice;
}

function worldV2BaxisProductionHandleriYarat({
  dovletAcilibmiFn = dovletAcilibmi,
  topologiyaXeritesi = null,
} = {}) {
  if (typeof dovletAcilibmiFn !== 'function') {
    throw new Error('WorldV2 baxış dovletAcilibmiFn funksiya olmalıdır.');
  }
  if (topologiyaXeritesi !== null && !(topologiyaXeritesi instanceof Map)) {
    throw new Error('WorldV2 baxış topologiyaXeritesi null və ya Map olmalıdır.');
  }

  // Sərhəd keçidi də eyni authoritative topologiyanı və lifecycle qaydasını
  // istifadə edir. Handler read-only eligibility + giriş koordinatı qaytarır.
  const serhedProductionHandler = worldV2SerhedProductionHandleriYarat({
    topologiyaXeritesi,
    dovletAcilibmiFn,
  });

  return async function dovletXeriteWorldV2BaxisProductionMesajiniEmalEt(kontekst) {
    if (await serhedProductionHandler(kontekst)) return true;

    const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
    const emalOlunur = type === WORLDV2_BAXIS_SORGU ||
      type === WORLDV2_PREZIDENT_FOKUS_SORGU ||
      type === WORLDV2_EVE_QAYIT_SORGU;
    if (!emalOlunur) return false;

    const cavabType = cavabNovunuAl(type);
    const playerId = metnAl(kontekst && kontekst.ws && kontekst.ws._authedPlayerId, 128).toLowerCase();
    if (!playerId) {
      cavabGonder(kontekst, cavabType, {
        success: false,
        errorCode: 'WORLDV2_AUTH_REQUIRED',
        message: 'Dövlət xəritəsi baxışı üçün autentifikasiya tələb olunur.',
      });
      return true;
    }

    try {
      const nowMs = typeof kontekst.nowMs === 'function' ? kontekst.nowMs() : Date.now();
      const state = playerStateAl(kontekst, playerId);
      const worldPlacement = state.worldPlacement;
      const ev = evMovqeyiniHazirla(worldPlacement);
      const msg = kontekst && kontekst.msg && typeof kontekst.msg === 'object' ? kontekst.msg : {};

      let info;
      if (type === WORLDV2_EVE_QAYIT_SORGU) {
        info = oxunanBaxisHazirla({
          worldPlacement,
          viewedStateId: ev.homeStateId,
          viewX: ev.homeBase.x,
          viewY: ev.homeBase.y,
          mode: WORLDV2_BAXIS_REJIMI.YAXIN,
        });
      }
      else {
        const viewedStateId = Number(msg.viewedStateId);
        if (!Number.isInteger(viewedStateId) || viewedStateId <= 0) {
          const xeta = new Error(`Etibarsız viewedStateId: ${msg.viewedStateId}`);
          xeta.code = 'WORLDV2_VIEW_INVALID';
          throw xeta;
        }

        if (viewedStateId !== ev.homeStateId && !dovletAcilibmiFn(viewedStateId, nowMs)) {
          const xeta = new Error(`State #${viewedStateId} hələ açılmayıb.`);
          xeta.code = 'WORLDV2_VIEW_STATE_LOCKED';
          throw xeta;
        }

        if (type === WORLDV2_PREZIDENT_FOKUS_SORGU) {
          info = prezidentMerkezineBaxisHazirla({ worldPlacement, viewedStateId });
        }
        else {
          const mode = metnAl(msg.mode, 16).toLowerCase() || WORLDV2_BAXIS_REJIMI.YAXIN;
          if (!STATE_BAXIS_REJIMLERI.has(mode)) {
            const xeta = new Error(`Etibarsız WorldV2 State baxış rejimi: ${mode}`);
            xeta.code = 'WORLDV2_VIEW_INVALID';
            throw xeta;
          }

          const koordinatVerilib = msg.x != null || msg.y != null;
          if ((msg.x == null) !== (msg.y == null)) {
            const xeta = new Error('x və y birlikdə verilməlidir.');
            xeta.code = 'WORLDV2_VIEW_INVALID';
            throw xeta;
          }

          const foreignDefault = viewedStateId !== ev.homeStateId && !koordinatVerilib;
          info = oxunanBaxisHazirla({
            worldPlacement,
            viewedStateId,
            viewX: foreignDefault ? DOVLET_XERITESI_V2.prezidentMerkezi.x : msg.x,
            viewY: foreignDefault ? DOVLET_XERITESI_V2.prezidentMerkezi.y : msg.y,
            mode,
          });
        }
      }

      const neighbors = qonsulariHazirla(topologiyaXeritesi, info.viewedStateId, nowMs);
      if (neighbors) info = { ...info, neighbors };

      cavabGonder(kontekst, cavabType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info),
      });
    }
    catch (xeta) {
      const knownCode = xeta && typeof xeta.code === 'string' ? xeta.code : null;
      cavabGonder(kontekst, cavabType, {
        success: false,
        playerId,
        errorCode: knownCode || 'WORLDV2_VIEW_INVALID',
        message: knownCode === 'WORLDV2_VIEW_STATE_LOCKED'
          ? 'Seçilmiş Dövlət hələ açılmayıb.'
          : 'Dövlət xəritəsi baxış sorğusu tamamlanmadı.',
      });
    }

    return true;
  };
}

const dovletXeriteWorldV2BaxisProductionMesajiniEmalEt = worldV2BaxisProductionHandleriYarat();

module.exports = {
  WORLDV2_BAXIS_SORGU,
  WORLDV2_BAXIS_CAVAB,
  WORLDV2_PREZIDENT_FOKUS_SORGU,
  WORLDV2_PREZIDENT_FOKUS_CAVAB,
  WORLDV2_EVE_QAYIT_SORGU,
  WORLDV2_EVE_QAYIT_CAVAB,
  worldV2BaxisProductionHandleriYarat,
  dovletXeriteWorldV2BaxisProductionMesajiniEmalEt,
};
