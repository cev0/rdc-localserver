'use strict';

const {
  DOVLET_XERITESI_V2,
} = require('./dovlet_xerite_worldv2_qaydalari');

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function tamEded(deyer, ehtiyat = 0) {
  const reqem = Number(deyer);
  return Number.isFinite(reqem) ? Math.trunc(reqem) : ehtiyat;
}

function musbetTamEded(deyer, ehtiyat = 0) {
  return Math.max(0, tamEded(deyer, ehtiyat));
}

function koordinatiSaxla(deyer, ehtiyat) {
  const reqem = Number(deyer);
  if (!Number.isFinite(reqem)) return ehtiyat;
  return Math.max(
    DOVLET_XERITESI_V2.minimumKoordinat,
    Math.min(DOVLET_XERITESI_V2.maksimumKoordinat, reqem),
  );
}

/**
 * Legacy Dövlət runtime-dakı Prezident/centerBuilding məlumatını WorldV2
 * client müqaviləsinə çevirir.
 *
 * Bu adapter capture qaydası yaratmır və Prezident təyin etmir.
 * Yalnız serverdə artıq mövcud authoritative state-i oxuyur.
 */
function prezidentMelumatiniHazirla(stateRuntime, nowMs = Date.now()) {
  const runtime = stateRuntime && typeof stateRuntime === 'object'
    ? stateRuntime
    : {};
  const merkez = runtime.centerBuilding && typeof runtime.centerBuilding === 'object'
    ? runtime.centerBuilding
    : {};

  const now = Number(nowMs);
  if (!Number.isFinite(now) || now < 0) {
    throw new Error(`Etibarsız server vaxtı: ${nowMs}`);
  }

  const unlockAtMs = musbetTamEded(
    merkez.unlockAtMs,
    musbetTamEded(runtime.centerUnlockAtMs, 0),
  );

  // Legacy runtime isUnlocked sahəsi stale qala bilər. WorldV2 cavabında
  // server vaxtı + unlockAtMs əsas götürülür. Vaxt konfiqurasiya edilməyibsə
  // yalnız mövcud authoritative boolean istifadə olunur.
  const vaxtlaAcilib = unlockAtMs > 0
    ? now >= unlockAtMs
    : merkez.isUnlocked === true;

  const occupiedByPlayerId = metnAl(merkez.occupiedByPlayerId, 128)
    || metnAl(runtime.presidentPlayerId, 128)
    || null;

  const occupiedByAllianceId = metnAl(merkez.occupiedByAllianceId, 128)
    || metnAl(runtime.presidentAllianceId, 128)
    || null;

  const occupiedAtMs = musbetTamEded(merkez.occupiedAtMs, 0);
  const tutulub = Boolean(occupiedByPlayerId || occupiedByAllianceId);

  return {
    stateId: Math.max(1, musbetTamEded(runtime.stateId, 1) || 1),
    merkez: {
      x: koordinatiSaxla(merkez.x, DOVLET_XERITESI_V2.merkezX),
      y: koordinatiSaxla(merkez.z, DOVLET_XERITESI_V2.merkezY),
    },
    unlockAtMs,
    acilib: vaxtlaAcilib,
    tutulub,
    presidentPlayerId: occupiedByPlayerId,
    presidentAllianceId: occupiedByAllianceId,
    occupiedAtMs,
    captureMelumatiVar: tutulub,
  };
}

function prezidentMerkeziKecidlidir(stateRuntime, nowMs = Date.now()) {
  return prezidentMelumatiniHazirla(stateRuntime, nowMs).acilib === true;
}

module.exports = {
  prezidentMelumatiniHazirla,
  prezidentMerkeziKecidlidir,
};
