'use strict';

const {
  qlobalDovletlerPayloadHazirla,
} = require('./dovlet_xerite_worldv2_qlobal_payload');

const {
  qlobalDovletAxtar,
} = require('./dovlet_xerite_worldv2_qlobal_axtaris');

const WORLDV2_QLOBAL_SORGU = 'global_states_v2_request';
const WORLDV2_QLOBAL_CAVAB = 'global_states_v2_result';
const WORLDV2_QLOBAL_AXTARIS_SORGU = 'global_states_v2_search_request';
const WORLDV2_QLOBAL_AXTARIS_CAVAB = 'global_states_v2_search_result';

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function cavabGonder(kontekst, type, melumat) {
  if (!kontekst || typeof kontekst.send !== 'function') {
    throw new Error('WorldV2 Qlobal handler üçün send funksiyası tələb olunur.');
  }

  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function'
      ? kontekst.nowMs()
      : Date.now(),
  });
}

/**
 * Production üçün Qlobal Dövlət siyahısı və Dövlət kodu axtarışını emal edən
 * read-only handler.
 *
 * QAYDA:
 * - ayrıca WebSocket yaratmır;
 * - yalnız autentifikasiya olunmuş socket qəbul edir;
 * - açıq Dövlətlər 60 günlük authoritative lifecycle-dan gəlir;
 * - metadata real mənbə verilməyibsə boş saxlanılır, heç nə uydurulmur;
 * - topologiya veriləndə Near/Far/Global eyni authoritative qonşuluq mənbəyini
 *   paylaşa bilir; verilməyəndə payload builder köhnə layout fallback-ını saxlayır;
 * - axtarış yalnız açıq Dövlət payload-u daxilində dəqiq State ID tapır;
 * - player state və worldPlacement heç vaxt mutasiya edilmir.
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
    const axtarisdir = type === WORLDV2_QLOBAL_AXTARIS_SORGU;
    if (type !== WORLDV2_QLOBAL_SORGU && !axtarisdir) return false;

    const cavabType = axtarisdir
      ? WORLDV2_QLOBAL_AXTARIS_CAVAB
      : WORLDV2_QLOBAL_CAVAB;

    const playerId = metnAl(
      kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
      128,
    ).toLowerCase();

    if (!playerId) {
      cavabGonder(kontekst, cavabType, {
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
      const payload = payloadHazirla({ nowMs, metadata, topologiyaXeritesi });
      const info = axtarisdir
        ? qlobalDovletAxtar({
            payload,
            stateCode: kontekst && kontekst.msg && kontekst.msg.stateCode,
          })
        : payload;

      cavabGonder(kontekst, cavabType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info),
      });
    }
    catch (xeta) {
      console.error('[DÖVLƏT XƏRİTƏSİ WORLDV2 QLOBAL]', xeta);

      cavabGonder(kontekst, cavabType, {
        success: false,
        playerId,
        errorCode: axtarisdir
          ? 'WORLDV2_GLOBAL_SEARCH_INVALID'
          : 'WORLDV2_INTERNAL_ERROR',
        message: axtarisdir
          ? 'Dövlət kodu axtarışı tamamlanmadı.'
          : 'Qlobal Dövlət xəritəsi sorğusu serverdə tamamlanmadı.',
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
  WORLDV2_QLOBAL_AXTARIS_SORGU,
  WORLDV2_QLOBAL_AXTARIS_CAVAB,
  worldV2QlobalProductionHandleriYarat,
  dovletXeriteWorldV2QlobalProductionMesajiniEmalEt,
};
