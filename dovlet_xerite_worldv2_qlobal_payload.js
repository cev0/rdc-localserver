'use strict';

const {
  acilmisDovletIdleriniAl,
  dovletPlanliVaxtlariniAl,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function metadataXeritesiHazirla(metadata) {
  if (metadata === null || metadata === undefined) {
    return new Map();
  }

  if (!Array.isArray(metadata)) {
    throw new Error('Qlobal Dövlət metadata-sı massiv olmalıdır.');
  }

  const xerite = new Map();

  for (const xam of metadata) {
    if (!xam || typeof xam !== 'object' || Array.isArray(xam)) {
      throw new Error('Qlobal Dövlət metadata elementi obyekt olmalıdır.');
    }

    const stateId = Number(xam.stateId);
    if (!Number.isInteger(stateId) || stateId <= 0) {
      throw new Error(`Etibarsız qlobal Dövlət ID-si: ${xam.stateId}`);
    }

    if (xerite.has(stateId)) {
      throw new Error(`Təkrarlanan qlobal Dövlət metadata-sı: ${stateId}`);
    }

    xerite.set(stateId, xam);
  }

  return xerite;
}

function qlobalNodeHazirla(xamNode) {
  if (xamNode === null || xamNode === undefined) {
    return null;
  }

  if (!xamNode || typeof xamNode !== 'object' || Array.isArray(xamNode)) {
    throw new Error('Qlobal xəritə node-u obyekt olmalıdır.');
  }

  // Qlobal xəritənin konkret koordinat sistemi hələ final deyil.
  // Buna görə yalnız serverdə əvvəlcədən müəyyən edilmiş stabil node/slot ID-si
  // qəbul edilir; client üçün x/y rəqəmləri uydurulmur.
  const nodeId = metnAl(xamNode.nodeId, 128);
  if (!nodeId) {
    throw new Error('Qlobal xəritə node-u üçün nodeId tələb olunur.');
  }

  return { nodeId };
}

function dovletMetadataHazirla(xam) {
  const metadata = xam && typeof xam === 'object' ? xam : {};

  const displayName = metnAl(metadata.displayName, 100) || null;
  const presidentPlayerId = metnAl(metadata.presidentPlayerId, 128) || null;
  const presidentAllianceId = metnAl(metadata.presidentAllianceId, 128) || null;
  const flagId = metnAl(metadata.flagId, 128) || null;
  const presidentUnlocked = typeof metadata.presidentUnlocked === 'boolean'
    ? metadata.presidentUnlocked
    : null;
  const presidentOccupiedAtMs = Number.isFinite(Number(metadata.presidentOccupiedAtMs))
    ? Math.max(0, Math.trunc(Number(metadata.presidentOccupiedAtMs)))
    : null;

  return {
    displayName,
    presidentPlayerId,
    presidentAllianceId,
    presidentUnlocked,
    presidentOccupiedAtMs,
    flagId,
    globalNode: qlobalNodeHazirla(metadata.globalNode),
  };
}

/**
 * Qlobus düyməsi üçün açılmış Dövlətlərin yığcam siyahısını yaradır.
 *
 * Authoritative açıq/bağlı status mövcud 60 günlük lifecycle-dan gəlir.
 * Metadata yalnız caller tərəfindən real server datası ilə verildikdə əlavə olunur.
 * Metadata verilməyən sahələr null qalır; builder heç nə uydurmur.
 */
function qlobalDovletlerPayloadHazirla({
  nowMs = Date.now(),
  metadata = [],
} = {}) {
  const vaxt = Number(nowMs);
  if (!Number.isFinite(vaxt) || vaxt < 0) {
    throw new Error(`Etibarsız server vaxtı: ${nowMs}`);
  }

  const metadataMap = metadataXeritesiHazirla(metadata);
  const acilmisIdler = acilmisDovletIdleriniAl(Math.trunc(vaxt));

  const states = acilmisIdler.map((stateId) => {
    const plan = dovletPlanliVaxtlariniAl(stateId, Math.trunc(vaxt));
    const elave = dovletMetadataHazirla(metadataMap.get(stateId));

    return {
      stateId,
      opened: true,
      stateOpenedAtMs: plan.stateOpensAtMs,
      presidentUnlockAtMs: plan.presidentUnlockAtMs,
      ...elave,
    };
  });

  return {
    version: 2,
    serverTimeUnixMs: Math.trunc(vaxt),
    onlyOpenedStates: true,
    states,
  };
}

module.exports = {
  metadataXeritesiHazirla,
  qlobalNodeHazirla,
  dovletMetadataHazirla,
  qlobalDovletlerPayloadHazirla,
};
