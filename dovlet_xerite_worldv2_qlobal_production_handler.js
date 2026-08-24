'use strict';

const {
  qlobalDovletlerPayloadHazirla,
} = require('./dovlet_xerite_worldv2_qlobal_payload');

const WORLDV2_QLOBAL_SORGU = 'global_states_v2_request';
const WORLDV2_QLOBAL_CAVAB = 'global_states_v2_result';

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function cavabGonder(kontekst, melumat) {
  if (!kontekst || typeof kontekst.send !== 'function') {
    throw new Error('WorldV2 Qlobal handler üçün send funksiyası tələb olunur.');
  }

  kontekst.send(kontekst.ws, {
    type: WORLDV2_QLOBAL_CAVAB,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function'
      ? kontekst.nowMs()
      : Date.now(),
  });
}

/**
 * Production üçün yalnız Qlobal Dövlət siyahısını emal edən read-only handler.
 *
 * QAYDA:
 * - ayrıca WebSocket yaratmır;
 * - yalnız autentifikasiya olunmuş socket qəbul edir;
 * - açıq Dövlətlər 60 günlük authoritative lifecycle-dan gəlir;
 * - metadata real mənbə verilməyibsə boş saxlanılır, heç nə uydurulmur;
 * - topologiya veriləndə Near/Far/Global eyni authoritative qonşuluq mənbəyini
 *   paylaşa bilir; verilməyəndə payload builder köhnə layout fallback-ını saxlayır;
 * - player state mutasiya edilmir.
 */
function worldV2QlobalProductionHandleriYarat({
  payloadHazirla = qlobalDovletlerPayloadHazirla,
  metadataAl = async () => [],
  topologiyaXeritesi = null,
} = {}) {
  if (typeof payloadHazirla !== 'function') {
    throw new Error('WorldV2 Qlobal payloadHazirla funksiya olmalıdır.');
  }

  if (typeof metadataAl !== 'function') {
    throw new Error('WorldV2 Qlobal metadataAl funksiya olmalıdır.');
  }

  if (topologiyaXeritesi !== null && !(topologiyaXeritesi instanceof Map)) {
    throw new Error('WorldV2 Qlobal topologiyaXeritesi null və ya Map olmalıdır.');
  }

  return async function dovletXeriteWorldV2QlobalProductionMesajiniEmalEt(kontekst) {
    const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
    if (type !== WORLDV2_QLOBAL_SORGU) return false;

    const playerId = metnAl(
      kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
      128,
    ).toLowerCase();

    if (!playerId) {
      cavabGonder(kontekst, {
        success: false,
        errorCode: 'WORLDV2_AUTH_REQUIRED',
        message: 'Qlobal Dövlət xəritəsi üçün autentifikasiya tələb olunur.',
      });
      return true;
    }

    try {
      const nowMs = typeof kontekst.nowMs === 'function'
        ? kontekst.nowMs()
        : Date.now();

      const metadata = await metadataAl(nowMs, kontekst);
      const info = payloadHazirla({ nowMs, metadata, topologiyaXeritesi });

      cavabGonder(kontekst, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info),
      });
    }
    catch (xeta) {
      console.error('[DÖVLƏT XƏRİTƏSİ WORLDV2 QLOBAL]', xeta);

      cavabGonder(kontekst, {
        success: false,
        playerId,
        errorCode: 'WORLDV2_INTERNAL_ERROR',
        message: 'Qlobal Dövlət xəritəsi sorğusu serverdə tamamlanmadı.',
      });
    }

    return true;
  };
}

const dovletXeriteWorldV2QlobalProductionMesajiniEmalEt =
  worldV2QlobalProductionHandleriYarat();

module.exports = {
  WORLDV2_QLOBAL_SORGU,
  WORLDV2_QLOBAL_CAVAB,
  worldV2QlobalProductionHandleriYarat,
  dovletXeriteWorldV2QlobalProductionMesajiniEmalEt,
};
