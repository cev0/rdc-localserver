'use strict';

const WORLDV2_GORUNUS_SEVIYYESI = Object.freeze({
  YAXIN_3D: 'YAXIN_3D',
  ORTA_LOD: 'ORTA_LOD',
  UZAQ_STRATEJI: 'UZAQ_STRATEJI',
  DOVLET_OVERVIEW: 'DOVLET_OVERVIEW',
});

const WORLDV2_OBYEKT_GORUNURLUYU = Object.freeze({
  [WORLDV2_GORUNUS_SEVIYYESI.YAXIN_3D]: Object.freeze({
    bases: true,
    resources: true,
    enemies: true,
    camps: true,
    convoys: true,
    presidentCenter: true,
  }),
  [WORLDV2_GORUNUS_SEVIYYESI.ORTA_LOD]: Object.freeze({
    bases: true,
    resources: true,
    enemies: true,
    camps: true,
    convoys: true,
    presidentCenter: true,
  }),
  [WORLDV2_GORUNUS_SEVIYYESI.UZAQ_STRATEJI]: Object.freeze({
    bases: true,
    resources: false,
    enemies: false,
    camps: false,
    convoys: false,
    presidentCenter: true,
  }),
  [WORLDV2_GORUNUS_SEVIYYESI.DOVLET_OVERVIEW]: Object.freeze({
    // Overview ayrıca strateji təqdimatdır; local 3D obyekt stream-i burada
    // birbaşa render edilməməlidir.
    bases: false,
    resources: false,
    enemies: false,
    camps: false,
    convoys: false,
    presidentCenter: true,
  }),
});

function acarMetnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : '';
}

function gorunusQaydasiniAl(seviyye) {
  const acar = typeof seviyye === 'string' ? seviyye.trim() : '';
  const qayda = WORLDV2_OBYEKT_GORUNURLUYU[acar];
  if (!qayda) {
    throw new Error(`Etibarsız WorldV2 görünüş səviyyəsi: ${seviyye}`);
  }
  return qayda;
}

/**
 * Uzaq strateji zoom-da bir bazanın görünməli olub-olmadığını müəyyən edir.
 *
 * Qayda:
 * - öz baza həmişə görünür;
 * - başqa baza yalnız hər iki tərəfdə stabil allianceId varsa və eynidirsə görünür;
 * - allianceName heç vaxt identifikasiya üçün istifadə edilmir.
 *
 * Bu funksiya hazır legacy baza kataloquna hələ qoşulmur, çünki onda
 * allianceId sahəsi yoxdur.
 */
function uzaqGorunusdeBazaGorunurmu({
  viewerPlayerId,
  viewerAllianceId = null,
  base,
}) {
  const baxanPlayerId = acarMetnAl(viewerPlayerId, 128);
  if (!baxanPlayerId) {
    throw new Error('Uzaq WorldV2 baza filtri üçün viewerPlayerId tələb olunur.');
  }

  if (!base || typeof base !== 'object' || Array.isArray(base)) {
    return false;
  }

  const bazaPlayerId = acarMetnAl(base.playerId, 128);
  if (!bazaPlayerId) return false;

  if (bazaPlayerId === baxanPlayerId) {
    return true;
  }

  const baxanAllianceId = acarMetnAl(viewerAllianceId, 128);
  const bazaAllianceId = acarMetnAl(base.allianceId, 128);

  // Fail-closed: stabil ID-lərdən biri yoxdursa allianceName ilə fallback yoxdur.
  if (!baxanAllianceId || !bazaAllianceId) {
    return false;
  }

  return baxanAllianceId === bazaAllianceId;
}

function uzaqGorunusBazaMarkerleriniSec({
  viewerPlayerId,
  viewerAllianceId = null,
  bases,
}) {
  const siyahi = Array.isArray(bases) ? bases : [];

  return siyahi.filter((base) => uzaqGorunusdeBazaGorunurmu({
    viewerPlayerId,
    viewerAllianceId,
    base,
  }));
}

module.exports = {
  WORLDV2_GORUNUS_SEVIYYESI,
  WORLDV2_OBYEKT_GORUNURLUYU,
  gorunusQaydasiniAl,
  uzaqGorunusdeBazaGorunurmu,
  uzaqGorunusBazaMarkerleriniSec,
};
