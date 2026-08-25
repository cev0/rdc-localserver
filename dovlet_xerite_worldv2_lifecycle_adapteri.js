'use strict';

const { lifecycleInfo } = require('./dovlet_lifecycle_handler');
const {
  DOVLET_XERITESI_V2,
  DOVLET_KECID_STATUSU,
} = require('./dovlet_xerite_worldv2_qaydalari');
const {
  ikiDovletTestRejimiAktivdir,
  WORLDV2_IKI_DOVLET_TEST_AKTIV_STATE_ID,
} = require('./dovlet_xerite_worldv2_iki_dovlet_test_rejimi');

const GUN_MS = 24 * 60 * 60 * 1000;
const DOVLET_DOVR_GUN = 60;
const PREZIDENT_ACILMA_GUN = 30;
const DOVLET_DOVR_MS = DOVLET_DOVR_GUN * GUN_MS;
const PREZIDENT_ACILMA_MS = PREZIDENT_ACILMA_GUN * GUN_MS;

function musbetTamDovletIdAl(deyer) {
  const reqem = Number(deyer);
  if (!Number.isFinite(reqem)) return null;

  const tam = Math.trunc(reqem);
  return tam > 0 ? tam : null;
}

function dovletLifecycleMelumatiniAl(nowMs = Date.now()) {
  const now = Number(nowMs);
  if (!Number.isFinite(now) || now < 0) {
    throw new Error(`Etibarsız server vaxtı: ${nowMs}`);
  }

  const info = lifecycleInfo(Math.trunc(now));
  let aktivStateId = musbetTamDovletIdAl(info && info.calculatedActiveStateId) || 1;

  // MÜVƏQQƏTİ Koyeb/inteqrasiya testi:
  // server runtime prosesi iki Dövlət test rejimindədirsə Dövlət #2 açıq saxlanılır.
  // Unit-test runner-lərində ikiDovletTestRejimiAktivdir() false qaytarır.
  const ikiDovletTesti = ikiDovletTestRejimiAktivdir(process.env, process.argv);
  if (ikiDovletTesti) {
    aktivStateId = Math.max(
      aktivStateId,
      WORLDV2_IKI_DOVLET_TEST_AKTIV_STATE_ID,
    );
  }

  return {
    releaseConfigured: info && info.releaseConfigured === true,
    periodDays: Number(info && info.periodDays) || DOVLET_DOVR_GUN,
    activeStateId: aktivStateId,
    releaseAtMs: Math.max(0, Math.trunc(Number(info && info.releaseAtMs) || 0)),
    currentPeriodStartMs: Math.max(0, Math.trunc(Number(info && info.currentPeriodStartMs) || 0)),
    nextStateOpensAtMs: Math.max(0, Math.trunc(Number(info && info.nextStateOpensAtMs) || 0)),
    ikiDovletTesti,
  };
}

/**
 * Mövcud server lifecycle qaydasına əsasən Dövlət açıqdırmı?
 *
 * Qayda:
 * - Dövlət ID-ləri 1-dən başlayır.
 * - Cari aktiv Dövlət və ondan əvvəlkilər açıq sayılır.
 * - Gələcək State ID-ləri bağlıdır.
 * - Müvəqqəti iki Dövlət inteqrasiya testində State #2 açıq saxlanılır.
 */
function dovletAcilibmi(stateId, nowMs = Date.now()) {
  const id = musbetTamDovletIdAl(stateId);
  if (id === null) return false;

  const lifecycle = dovletLifecycleMelumatiniAl(nowMs);
  return id <= lifecycle.activeStateId;
}

function dovletPlanliVaxtlariniAl(stateId, nowMs = Date.now()) {
  const id = musbetTamDovletIdAl(stateId);
  if (id === null) {
    throw new Error(`Etibarsız Dövlət ID-si: ${stateId}`);
  }

  const lifecycle = dovletLifecycleMelumatiniAl(nowMs);
  const opened = id <= lifecycle.activeStateId;

  // Release tarixi olmadan planlı tarix uydurmuruq.
  // Test rejimində Dövlət #2 yalnız opened=true olur; schedule yenə saxtalaşdırılmır.
  if (!lifecycle.releaseConfigured || lifecycle.releaseAtMs <= 0) {
    return {
      stateId: id,
      opened,
      scheduleConfigured: false,
      stateOpensAtMs: null,
      presidentUnlockAtMs: null,
    };
  }

  const stateOpensAtMs = lifecycle.releaseAtMs + ((id - 1) * DOVLET_DOVR_MS);
  const presidentUnlockAtMs = stateOpensAtMs + PREZIDENT_ACILMA_MS;

  return {
    stateId: id,
    opened,
    scheduleConfigured: true,
    stateOpensAtMs,
    presidentUnlockAtMs,
  };
}

/**
 * Qonşu State ID-si caller/topologiya qatından gəlir.
 * Bu funksiya heç bir qonşuluq ID-si uydurmur; yalnız mövcud lifecycle əsasında
 * həmin qonşunun açıq/bağlı statusunu müəyyən edir.
 */
function qonsuDovletLifecycleStatusunuAl(stateId, nowMs = Date.now()) {
  if (stateId === null || stateId === undefined) {
    return {
      stateId: null,
      status: DOVLET_KECID_STATUSU.QONSU_YOXDUR,
      acilib: false,
      kecideIcazeVar: false,
      stateOpensAtMs: null,
      presidentUnlockAtMs: null,
    };
  }

  const vaxtlar = dovletPlanliVaxtlariniAl(stateId, nowMs);
  const status = vaxtlar.opened
    ? DOVLET_KECID_STATUSU.KECIDE_ACIQDIR
    : DOVLET_KECID_STATUSU.BAGLIDIR;

  return {
    stateId: vaxtlar.stateId,
    status,
    acilib: vaxtlar.opened,
    kecideIcazeVar: vaxtlar.opened,
    stateOpensAtMs: vaxtlar.stateOpensAtMs,
    presidentUnlockAtMs: vaxtlar.presidentUnlockAtMs,
  };
}

/**
 * Topologiya qatının verdiyi dörd qonşu ID-sini lifecycle statusları ilə doldurur.
 */
function qonsuTopologiyasiniLifecycleIleHazirla(topologiya, nowMs = Date.now()) {
  if (!topologiya || typeof topologiya !== 'object' || Array.isArray(topologiya)) {
    throw new Error('WorldV2 qonşu topologiyası tələb olunur.');
  }

  const netice = {};

  for (const istiqamet of DOVLET_XERITESI_V2.serhedIstiqametleri) {
    if (!Object.prototype.hasOwnProperty.call(topologiya, istiqamet)) {
      throw new Error(`Qonşu topologiyasında istiqamət yoxdur: ${istiqamet}`);
    }

    const qonsu = qonsuDovletLifecycleStatusunuAl(topologiya[istiqamet], nowMs);
    netice[istiqamet] = {
      stateId: qonsu.stateId,
      status: qonsu.status,
    };
  }

  return netice;
}

function acilmisDovletIdleriniAl(nowMs = Date.now()) {
  const lifecycle = dovletLifecycleMelumatiniAl(nowMs);
  return Array.from(
    { length: lifecycle.activeStateId },
    (_, indeks) => indeks + 1,
  );
}

module.exports = {
  GUN_MS,
  DOVLET_DOVR_GUN,
  PREZIDENT_ACILMA_GUN,
  DOVLET_DOVR_MS,
  PREZIDENT_ACILMA_MS,
  musbetTamDovletIdAl,
  dovletLifecycleMelumatiniAl,
  dovletAcilibmi,
  dovletPlanliVaxtlariniAl,
  qonsuDovletLifecycleStatusunuAl,
  qonsuTopologiyasiniLifecycleIleHazirla,
  acilmisDovletIdleriniAl,
};
