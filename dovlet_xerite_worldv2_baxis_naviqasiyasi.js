'use strict';

const {
  koordinatEtibarlidir,
} = require('./dovlet_xerite_worldv2_qaydalari');

const WORLDV2_BAXIS_REJIMI = Object.freeze({
  YAXIN: 'near',
  ORTA: 'mid',
  UZAQ: 'far',
  QLOBAL: 'global',
});

function musbetTamEdedAl(deyer, ad) {
  const reqem = Number(deyer);
  if (!Number.isInteger(reqem) || reqem <= 0) {
    throw new Error(`${ad} müsbət tam ədəd olmalıdır: ${deyer}`);
  }
  return reqem;
}

function koordinatHazirla(x, y, ad = 'Baxış koordinatı') {
  const xx = Number(x);
  const yy = Number(y);
  if (!koordinatEtibarlidir(xx, yy)) {
    throw new Error(`${ad} WorldV2 sərhədindən kənardır: ${x}:${y}`);
  }
  return { x: xx, y: yy };
}

function baxisRejiminiYoxla(rejim) {
  if (!Object.values(WORLDV2_BAXIS_REJIMI).includes(rejim)) {
    throw new Error(`Etibarsız WorldV2 baxış rejimi: ${rejim}`);
  }
  return rejim;
}

function evMovqeyiniHazirla(worldPlacement) {
  const wp = worldPlacement && typeof worldPlacement === 'object'
    ? worldPlacement
    : {};

  const homeStateId = musbetTamEdedAl(wp.stateId, 'homeStateId');
  const homeCoordinate = koordinatHazirla(wp.baseX, wp.baseZ, 'Ev baza koordinatı');

  return {
    homeStateId,
    homeBase: homeCoordinate,
  };
}

/**
 * Read-only xəritə baxışı üçün transient contract.
 *
 * Bu funksiya worldPlacement obyektini heç vaxt dəyişmir. Ev Dövlət/baza
 * persistent authoritative mənbə olaraq qalır; viewedStateId/viewCoordinate
 * yalnız client naviqasiyasını təsvir edir.
 */
function oxunanBaxisHazirla({
  worldPlacement,
  viewedStateId = null,
  viewX = null,
  viewY = null,
  mode = WORLDV2_BAXIS_REJIMI.YAXIN,
} = {}) {
  const ev = evMovqeyiniHazirla(worldPlacement);
  const rejim = baxisRejiminiYoxla(mode);
  const stateId = viewedStateId == null
    ? ev.homeStateId
    : musbetTamEdedAl(viewedStateId, 'viewedStateId');

  if ((viewX == null) !== (viewY == null)) {
    throw new Error('viewX və viewY birlikdə verilməlidir.');
  }

  const coordinate = viewX == null && viewY == null
    ? { ...ev.homeBase }
    : koordinatHazirla(viewX, viewY);

  return {
    version: 2,
    mode: rejim,
    readOnlyView: true,
    homeStateId: ev.homeStateId,
    homeBase: { ...ev.homeBase },
    viewedStateId: stateId,
    viewCoordinate: coordinate,
    viewingHomeState: stateId === ev.homeStateId,
    persistentPlacementMutated: false,
  };
}

function prezidentMerkezineBaxisHazirla({
  worldPlacement,
  viewedStateId,
  centerX = 600,
  centerY = 600,
} = {}) {
  return oxunanBaxisHazirla({
    worldPlacement,
    viewedStateId,
    viewX: centerX,
    viewY: centerY,
    mode: WORLDV2_BAXIS_REJIMI.YAXIN,
  });
}

module.exports = {
  WORLDV2_BAXIS_REJIMI,
  evMovqeyiniHazirla,
  oxunanBaxisHazirla,
  prezidentMerkezineBaxisHazirla,
};
