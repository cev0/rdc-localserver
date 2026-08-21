'use strict';

const { lifecycleInfo } = require('./dovlet_lifecycle_handler');
const { DOVLET_KECID_STATUSU } = require('./dovlet_xerite_worldv2_qaydalari');

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
  const aktivStateId = musbetTamDovletIdAl(info && info.calculatedActiveStateId) || 1;

  return {
    releaseConfigured: info && info.releaseConfigured === true,
    periodDays: Number(info && info.periodDays) || DOVLET_DOVR_GUN,
    activeStateId: aktivStateId,
    releaseAtMs: Math.max(0, Math.trunc(Number(info && info.releaseAtMs) || 0)),
    currentPeriodStartMs: Math.max(0, Math.trunc(Number(info && info.currentPeriodStartMs) || 0)),
    nextStateOpensAtMs: Math.max(0, Math.trunc(Number(info && info.nextStateOpensAtMs) || 0)),
  };
}

/**
 * Mövcud server lifecycle qaydasına əsasən Dövlət açıqdırmı?
 *
 * Qayda:
 * - Dövlət ID-ləri 1-dən başlayır.
 * - Cari aktiv Dövlət və ondan əvvəlkilər açıq sayılır.
 * - Gələcək State ID-ləri bağlıdır.
 * - Release tarixi konfiqurasiya edilməyibsə mövcud legacy lifecycle State #1-i
 *   aktiv hesab edir; adapter də həmin davranışı dəyişmir.
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

  // Mövcud lifecycle release tarixi olmadan yalnız State #1-i fallback kimi aktiv
  // hesab edir. Belə halda planlı tarix uydurmuruq.
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
  acilmisDovletIdleriniAl,
};
