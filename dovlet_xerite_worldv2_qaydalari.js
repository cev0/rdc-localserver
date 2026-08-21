'use strict';

/**
 * Dövlət Xəritəsi WorldV2 üçün ayrıca hazırlıq konfiqurasiyası.
 *
 * VACİB:
 * - Bu modul hələ production xəritə handler-lərinə qoşulmur.
 * - Legacy 1024x1024 sistemini dəyişmir.
 * - Server protokolunda koordinat (x, y) saxlanılır.
 * - Unity tərəfdə server y koordinatı Unity z oxuna çevriləcək.
 */

const DOVLET_XERITESI_V2 = Object.freeze({
  versiya: 2,

  minimumKoordinat: 0,
  maksimumKoordinat: 1200,

  en: 1200,
  hundurluk: 1200,

  merkezX: 600,
  merkezY: 600,

  prezidentMerkezi: Object.freeze({
    x: 600,
    y: 600,
    acilmaGunSayi: 30,
    mudafieTopSayi: 4,
    mudafieIstiqametleri: Object.freeze([
      'simal',
      'serq',
      'cenub',
      'qerb',
    ]),
  }),

  serhedIstiqametleri: Object.freeze([
    'simal',
    'serq',
    'cenub',
    'qerb',
  ]),
});

const DOVLET_KECID_STATUSU = Object.freeze({
  QONSU_YOXDUR: 'QONSU_YOXDUR',
  BAGLIDIR: 'BAGLIDIR',
  ACILIB_KECID_BAGLIDIR: 'ACILIB_KECID_BAGLIDIR',
  KECIDE_ACIQDIR: 'KECIDE_ACIQDIR',
});

function sonluReqemeCevir(deyer) {
  if (deyer === null || deyer === undefined || deyer === '') {
    return null;
  }

  const reqem = typeof deyer === 'number' ? deyer : Number(deyer);
  return Number.isFinite(reqem) ? reqem : null;
}

function koordinatEtibarlidir(x, y) {
  const xReqem = sonluReqemeCevir(x);
  const yReqem = sonluReqemeCevir(y);

  if (xReqem === null || yReqem === null) {
    return false;
  }

  return (
    xReqem >= DOVLET_XERITESI_V2.minimumKoordinat &&
    xReqem <= DOVLET_XERITESI_V2.maksimumKoordinat &&
    yReqem >= DOVLET_XERITESI_V2.minimumKoordinat &&
    yReqem <= DOVLET_XERITESI_V2.maksimumKoordinat
  );
}

function koordinatiSerheddeSaxla(x, y) {
  const xReqem = sonluReqemeCevir(x);
  const yReqem = sonluReqemeCevir(y);

  if (xReqem === null || yReqem === null) {
    return null;
  }

  const min = DOVLET_XERITESI_V2.minimumKoordinat;
  const max = DOVLET_XERITESI_V2.maksimumKoordinat;

  return {
    x: Math.min(max, Math.max(min, xReqem)),
    y: Math.min(max, Math.max(min, yReqem)),
  };
}

function merkezeMesafe(x, y) {
  const xReqem = sonluReqemeCevir(x);
  const yReqem = sonluReqemeCevir(y);

  if (xReqem === null || yReqem === null) {
    return null;
  }

  const ferqX = xReqem - DOVLET_XERITESI_V2.merkezX;
  const ferqY = yReqem - DOVLET_XERITESI_V2.merkezY;

  return Math.sqrt((ferqX * ferqX) + (ferqY * ferqY));
}

function serhedIstiqametiEtibarlidir(istiqamet) {
  return DOVLET_XERITESI_V2.serhedIstiqametleri.includes(istiqamet);
}

function kecidStatusuEtibarlidir(status) {
  return Object.values(DOVLET_KECID_STATUSU).includes(status);
}

/**
 * Qonşu Dövlət məlumatı üçün standart yığcam obyekt yaradır.
 * Konkret qonşu ID-si və statusu caller tərəfindən authoritative data ilə verilir.
 */
function qonsuDovletMelumatiYarat({ istiqamet, stateId = null, status }) {
  if (!serhedIstiqametiEtibarlidir(istiqamet)) {
    throw new Error(`Etibarsız sərhəd istiqaməti: ${istiqamet}`);
  }

  if (!kecidStatusuEtibarlidir(status)) {
    throw new Error(`Etibarsız Dövlət keçid statusu: ${status}`);
  }

  if (stateId !== null) {
    const stateReqem = sonluReqemeCevir(stateId);
    if (stateReqem === null || !Number.isInteger(stateReqem) || stateReqem <= 0) {
      throw new Error(`Etibarsız qonşu Dövlət ID-si: ${stateId}`);
    }
    stateId = stateReqem;
  }

  if (status === DOVLET_KECID_STATUSU.QONSU_YOXDUR && stateId !== null) {
    throw new Error('QONSU_YOXDUR statusunda stateId null olmalıdır.');
  }

  if (status !== DOVLET_KECID_STATUSU.QONSU_YOXDUR && stateId === null) {
    throw new Error(`${status} statusunda qonşu stateId tələb olunur.`);
  }

  return {
    istiqamet,
    stateId,
    status,
    kecideIcazeVar: status === DOVLET_KECID_STATUSU.KECIDE_ACIQDIR,
  };
}

function worldV2XeriteMelumatiYarat() {
  return {
    versiya: DOVLET_XERITESI_V2.versiya,
    koordinatSahesi: {
      minX: DOVLET_XERITESI_V2.minimumKoordinat,
      maxX: DOVLET_XERITESI_V2.maksimumKoordinat,
      minY: DOVLET_XERITESI_V2.minimumKoordinat,
      maxY: DOVLET_XERITESI_V2.maksimumKoordinat,
    },
    merkez: {
      x: DOVLET_XERITESI_V2.merkezX,
      y: DOVLET_XERITESI_V2.merkezY,
    },
    prezidentMerkezi: {
      x: DOVLET_XERITESI_V2.prezidentMerkezi.x,
      y: DOVLET_XERITESI_V2.prezidentMerkezi.y,
      acilmaGunSayi: DOVLET_XERITESI_V2.prezidentMerkezi.acilmaGunSayi,
      mudafieTopSayi: DOVLET_XERITESI_V2.prezidentMerkezi.mudafieTopSayi,
      mudafieIstiqametleri: [...DOVLET_XERITESI_V2.prezidentMerkezi.mudafieIstiqametleri],
      // Dəqiq top koordinatları istifadəçi tərəfindən hələ müəyyən edilməyib.
      mudafieKoordinatlari: null,
    },
  };
}

module.exports = {
  DOVLET_XERITESI_V2,
  DOVLET_KECID_STATUSU,
  sonluReqemeCevir,
  koordinatEtibarlidir,
  koordinatiSerheddeSaxla,
  merkezeMesafe,
  serhedIstiqametiEtibarlidir,
  kecidStatusuEtibarlidir,
  qonsuDovletMelumatiYarat,
  worldV2XeriteMelumatiYarat,
};
