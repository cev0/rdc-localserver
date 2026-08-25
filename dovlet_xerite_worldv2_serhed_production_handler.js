'use strict';

const {
  DOVLET_XERITESI_V2,
  koordinatEtibarlidir,
} = require('./dovlet_xerite_worldv2_qaydalari');
const {
  serhedKecidiniYoxla,
} = require('./dovlet_xerite_worldv2_serhed_xidmeti');
const {
  dovletAcilibmi,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const WORLDV2_SERHED_KECIDI_SORGU = 'state_map_v2_border_transition_request';
const WORLDV2_SERHED_KECIDI_CAVAB = 'state_map_v2_border_transition_result';
const SERHED_GIRIS_MESAFESI = 24;

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function gonder(kontekst, melumat) {
  if (!kontekst || typeof kontekst.send !== 'function') {
    throw new Error('WorldV2 sərhəd production handler üçün send tələb olunur.');
  }

  kontekst.send(kontekst.ws, {
    type: WORLDV2_SERHED_KECIDI_CAVAB,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function'
      ? kontekst.nowMs()
      : Date.now(),
  });
}

function evDovletIdAl(kontekst, playerId) {
  if (!kontekst || typeof kontekst.getOrCreatePlayerState !== 'function') {
    throw new Error('WorldV2 sərhəd handler üçün getOrCreatePlayerState tələb olunur.');
  }

  const state = kontekst.getOrCreatePlayerState(playerId);
  const id = Number(state && state.worldPlacement && state.worldPlacement.stateId);

  if (!Number.isInteger(id) || id <= 0) {
    const xeta = new Error('Oyunçunun Ev Dövlət yerləşməsi tapılmadı.');
    xeta.code = 'WORLDV2_PLACEMENT_MISSING';
    throw xeta;
  }

  return id;
}

function serhedGirisKoordinatiniHazirla(direction, x, y) {
  const max = DOVLET_XERITESI_V2.maksimumKoordinat;
  const inset = Math.min(SERHED_GIRIS_MESAFESI, Math.floor(max / 4));
  const sx = Math.max(0, Math.min(max, Number(x)));
  const sy = Math.max(0, Math.min(max, Number(y)));

  switch (direction) {
    case 'simal':
      return { x: sx, y: max - inset };
    case 'cenub':
      return { x: sx, y: inset };
    case 'serq':
      return { x: inset, y: sy };
    case 'qerb':
      return { x: max - inset, y: sy };
    default:
      return null;
  }
}

function worldV2SerhedProductionHandleriYarat({
  topologiyaXeritesi = null,
  dovletAcilibmiFn = dovletAcilibmi,
} = {}) {
  if (topologiyaXeritesi !== null && !(topologiyaXeritesi instanceof Map)) {
    throw new Error('WorldV2 sərhəd topologiyaXeritesi null və ya Map olmalıdır.');
  }
  if (typeof dovletAcilibmiFn !== 'function') {
    throw new Error('WorldV2 sərhəd dovletAcilibmiFn funksiya olmalıdır.');
  }

  return async function dovletXeriteWorldV2SerhedProductionMesajiniEmalEt(kontekst) {
    const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
    if (type !== WORLDV2_SERHED_KECIDI_SORGU) return false;

    const playerId = metnAl(
      kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
      128,
    ).toLowerCase();

    if (!playerId) {
      gonder(kontekst, {
        success: false,
        errorCode: 'WORLDV2_AUTH_REQUIRED',
        message: 'Dövlət sərhəd keçidi üçün autentifikasiya tələb olunur.',
      });
      return true;
    }

    try {
      if (!(topologiyaXeritesi instanceof Map)) {
        const xeta = new Error('WorldV2 Dövlət topologiyası hazır deyil.');
        xeta.code = 'WORLDV2_TOPOLOGY_MISSING';
        throw xeta;
      }

      const nowMs = typeof kontekst.nowMs === 'function'
        ? kontekst.nowMs()
        : Date.now();
      const msg = kontekst && kontekst.msg && typeof kontekst.msg === 'object'
        ? kontekst.msg
        : {};

      const homeStateId = evDovletIdAl(kontekst, playerId);
      const requestedViewedStateId = Number(msg.viewedStateId);
      const viewedStateId = Number.isInteger(requestedViewedStateId) && requestedViewedStateId > 0
        ? requestedViewedStateId
        : homeStateId;

      if (viewedStateId !== homeStateId && !dovletAcilibmiFn(viewedStateId, nowMs)) {
        const xeta = new Error(`Dövlət #${viewedStateId} açıq deyil.`);
        xeta.code = 'WORLDV2_VIEW_STATE_LOCKED';
        throw xeta;
      }

      const direction = metnAl(msg.direction, 32).toLowerCase();
      const x = Number(msg.x);
      const y = Number(msg.y);

      if (!koordinatEtibarlidir(x, y)) {
        const xeta = new Error(`Etibarsız sərhəd koordinatı: ${msg.x}:${msg.y}`);
        xeta.code = 'WORLDV2_VIEW_INVALID';
        throw xeta;
      }

      const kecid = serhedKecidiniYoxla({
        topologiyaXeritesi,
        currentStateId: viewedStateId,
        istiqamet: direction,
        nowMs,
      });

      const entryCoordinate = kecid.transitionAllowed
        ? serhedGirisKoordinatiniHazirla(direction, x, y)
        : null;

      const info = {
        ...kecid,
        homeStateId,
        viewedStateId,
        readOnlyView: true,
        persistentPlacementMutated: false,
        entryCoordinate,
      };

      gonder(kontekst, {
        success: true,
        playerId,
        checkedOnly: true,
        mutatedPlayerState: false,
        info,
        payloadJson: JSON.stringify(info),
      });
    }
    catch (xeta) {
      const code = xeta && typeof xeta.code === 'string'
        ? xeta.code
        : 'WORLDV2_BORDER_TRANSITION_FAILED';

      gonder(kontekst, {
        success: false,
        playerId,
        checkedOnly: true,
        mutatedPlayerState: false,
        errorCode: code,
        message: 'Dövlət sərhəd keçidi yoxlaması tamamlanmadı.',
      });
    }

    return true;
  };
}

module.exports = {
  WORLDV2_SERHED_KECIDI_SORGU,
  WORLDV2_SERHED_KECIDI_CAVAB,
  SERHED_GIRIS_MESAFESI,
  serhedGirisKoordinatiniHazirla,
  worldV2SerhedProductionHandleriYarat,
};
