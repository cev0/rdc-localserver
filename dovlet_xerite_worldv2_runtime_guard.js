'use strict';

const WORLDV2_RUNTIME_GUARD_XETALARI = Object.freeze({
  RUNTIME_OBYEKT_DEYIL: 'WORLDV2_RUNTIME_INVALID',
  RUNTIME_STATE_ID_UYGUN_DEYIL: 'WORLDV2_RUNTIME_STATE_MISMATCH',
});

function musbetStateIdAl(deyer) {
  const reqem = Number(deyer);
  if (!Number.isFinite(reqem) || !Number.isInteger(reqem) || reqem <= 0) {
    return null;
  }
  return reqem;
}

function kodluXetaYarat(code, message) {
  const xeta = new Error(message);
  xeta.code = code;
  return xeta;
}

/**
 * Dependency tərəfindən qaytarılan State runtime-ın soruşulan Dövlətə aid
 * olduğunu fail-closed qaydada yoxlayır.
 *
 * Məqsəd: stateRuntimeAl(1) səhvən State #2 runtime-ı qaytardıqda Prezident
 * və digər authoritative metadata-nın başqa Dövlət payload-ına sızmasının
 * qarşısını almaq.
 *
 * null/undefined runtime qəbul edilir, çünki handler həmin halda lifecycle
 * əsasında təhlükəsiz fallback yarada bilər. Runtime obyekt kimi verilibsə,
 * stateId mütləq mövcud və gözlənilən ID ilə eyni olmalıdır.
 */
function stateRuntimeUyğunluğunuYoxla(stateRuntime, expectedStateId) {
  const gozlenilen = musbetStateIdAl(expectedStateId);
  if (gozlenilen === null) {
    throw kodluXetaYarat(
      WORLDV2_RUNTIME_GUARD_XETALARI.RUNTIME_STATE_ID_UYGUN_DEYIL,
      `Etibarsız gözlənilən State ID-si: ${expectedStateId}`,
    );
  }

  if (stateRuntime === null || stateRuntime === undefined) {
    return null;
  }

  if (!stateRuntime || typeof stateRuntime !== 'object' || Array.isArray(stateRuntime)) {
    throw kodluXetaYarat(
      WORLDV2_RUNTIME_GUARD_XETALARI.RUNTIME_OBYEKT_DEYIL,
      'WorldV2 State runtime obyekt olmalıdır.',
    );
  }

  const runtimeStateId = musbetStateIdAl(stateRuntime.stateId);
  if (runtimeStateId === null || runtimeStateId !== gozlenilen) {
    throw kodluXetaYarat(
      WORLDV2_RUNTIME_GUARD_XETALARI.RUNTIME_STATE_ID_UYGUN_DEYIL,
      `WorldV2 State runtime uyğun deyil: gözlənilən=${gozlenilen}, gələn=${stateRuntime.stateId}`,
    );
  }

  return stateRuntime;
}

module.exports = {
  WORLDV2_RUNTIME_GUARD_XETALARI,
  musbetStateIdAl,
  kodluXetaYarat,
  stateRuntimeUyğunluğunuYoxla,
};
