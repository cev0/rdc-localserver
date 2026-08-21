'use strict';

const {
  DOVLET_XERITESI_V2,
  DOVLET_KECID_STATUSU,
} = require('./dovlet_xerite_worldv2_qaydalari');

const {
  dovletTopologiyasiniAl,
} = require('./dovlet_xerite_worldv2_topologiya');

const {
  qonsuDovletLifecycleStatusunuAl,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const SERHED_KECID_SEBEBI = Object.freeze({
  ICAZE_VAR: 'ICAZE_VAR',
  QONSU_YOXDUR: 'QONSU_YOXDUR',
  QONSU_BAGLIDIR: 'QONSU_BAGLIDIR',
  QONSU_ACILIB_KECID_BAGLIDIR: 'QONSU_ACILIB_KECID_BAGLIDIR',
});

function istiqametiYoxla(istiqamet) {
  const deyer = typeof istiqamet === 'string'
    ? istiqamet.trim().toLowerCase()
    : '';

  if (!DOVLET_XERITESI_V2.serhedIstiqametleri.includes(deyer)) {
    throw new Error(`Etibarsız sərhəd istiqaməti: ${istiqamet}`);
  }

  return deyer;
}

function sebebiHesabla(status) {
  switch (status) {
    case DOVLET_KECID_STATUSU.KECIDE_ACIQDIR:
      return SERHED_KECID_SEBEBI.ICAZE_VAR;
    case DOVLET_KECID_STATUSU.QONSU_YOXDUR:
      return SERHED_KECID_SEBEBI.QONSU_YOXDUR;
    case DOVLET_KECID_STATUSU.ACILIB_KECID_BAGLIDIR:
      return SERHED_KECID_SEBEBI.QONSU_ACILIB_KECID_BAGLIDIR;
    case DOVLET_KECID_STATUSU.BAGLIDIR:
    default:
      return SERHED_KECID_SEBEBI.QONSU_BAGLIDIR;
  }
}

/**
 * WorldV2 sərhəd keçidinin authoritative yoxlaması.
 *
 * Bu funksiya:
 * 1) cari Dövlətin real qonşu ID-sini topologiyadan tapır;
 * 2) qonşunun açıq/bağlı statusunu mövcud lifecycle-dan hesablayır;
 * 3) client üçün keçid icazəsini qaytarır.
 *
 * Bu funksiya qonşu ID uydurmur və giriş koordinatı yaratmır.
 */
function serhedKecidiniYoxla({
  topologiyaXeritesi,
  currentStateId,
  istiqamet,
  nowMs = Date.now(),
}) {
  const istiqametId = istiqametiYoxla(istiqamet);
  const cari = Number(currentStateId);
  if (!Number.isInteger(cari) || cari <= 0) {
    throw new Error(`Etibarsız cari Dövlət ID-si: ${currentStateId}`);
  }

  const qonsular = dovletTopologiyasiniAl(topologiyaXeritesi, cari);
  const qonsuStateId = qonsular[istiqametId];
  const lifecycle = qonsuDovletLifecycleStatusunuAl(qonsuStateId, nowMs);

  return {
    version: 2,
    currentStateId: cari,
    direction: istiqametId,
    neighborStateId: lifecycle.stateId,
    neighborOpened: lifecycle.acilib === true,
    status: lifecycle.status,
    reason: sebebiHesabla(lifecycle.status),
    transitionAllowed: lifecycle.kecideIcazeVar === true,
    neighborOpensAtMs: lifecycle.stateOpensAtMs,
    neighborPresidentUnlockAtMs: lifecycle.presidentUnlockAtMs,
    // Dəqiq qarşı-sərhəd giriş koordinatı gameplay qaydası təsdiqlənənədək yoxdur.
    entryCoordinate: null,
  };
}

module.exports = {
  SERHED_KECID_SEBEBI,
  istiqametiYoxla,
  sebebiHesabla,
  serhedKecidiniYoxla,
};
