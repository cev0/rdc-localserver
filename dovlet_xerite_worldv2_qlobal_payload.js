'use strict';

const {
  acilmisDovletIdleriniAl,
  dovletPlanliVaxtlariniAl,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const {
  dovletUcunQlobalNodeAl,
  acilmisDovletElageleriniHazirla,
  qlobalLayoutMelumatiniHazirla,
} = require('./dovlet_xerite_worldv2_qlobal_layout');

const {
  topologiyadanQlobalElaqeleriHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');

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

function normalizedKoordinatAl(deyer, ad) {
  const reqem = Number(deyer);
  if (!Number.isFinite(reqem) || reqem < 0 || reqem > 1) {
    throw new Error(`${ad} 0..1 aralığında olmalıdır: ${deyer}`);
  }
  return Number(reqem.toFixed(6));
}

function qlobalNodeHazirla(xamNode) {
  if (xamNode === null || xamNode === undefined) {
    return null;
  }

  if (!xamNode || typeof xamNode !== 'object' || Array.isArray(xamNode)) {
    throw new Error('Qlobal xəritə node-u obyekt olmalıdır.');
  }

  const nodeId = metnAl(xamNode.nodeId, 128);
  if (!nodeId) {
    throw new Error('Qlobal xəritə node-u üçün nodeId tələb olunur.');
  }

  const xVar = xamNode.normalizedX !== undefined && xamNode.normalizedX !== null;
  const yVar = xamNode.normalizedY !== undefined && xamNode.normalizedY !== null;

  if (xVar !== yVar) {
    throw new Error('Qlobal node normalizedX və normalizedY-ni birlikdə verməlidir.');
  }

  if (!xVar) {
    return { nodeId };
  }

  return {
    nodeId,
    normalizedX: normalizedKoordinatAl(xamNode.normalizedX, 'normalizedX'),
    normalizedY: normalizedKoordinatAl(xamNode.normalizedY, 'normalizedY'),
  };
}

function dovletMetadataHazirla(xam) {
  const metadata = xam && typeof xam === 'object' ? xam : {};

  const displayName = metnAl(metadata.displayName, 100) || null;
  const presidentPlayerId = metnAl(metadata.presidentPlayerId, 128) || null;
  const presidentDisplayName = metnAl(metadata.presidentDisplayName, 100) || null;
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
    presidentDisplayName,
    presidentAllianceId,
    presidentUnlocked,
    presidentOccupiedAtMs,
    flagId,
    globalNode: qlobalNodeHazirla(metadata.globalNode),
  };
}

function qlobalElaqeleriHazirla(acilmisIdler, topologiyaXeritesi) {
  if (topologiyaXeritesi instanceof Map) {
    return topologiyadanQlobalElaqeleriHazirla(topologiyaXeritesi, acilmisIdler);
  }

  // Backward compatibility: production wiring authoritative topologiyanı verənədək
  // köhnə layout əlaqələri saxlanılır. Yeni wiring Map verdikdə avtomatik eyni
  // topologiya Near/Far/Global üçün istifadə olunur.
  return acilmisDovletElageleriniHazirla(acilmisIdler);
}

/**
 * Qlobus düyməsi üçün açılmış Dövlətlərin server-authoritative siyahısını yaradır.
 */
function qlobalDovletlerPayloadHazirla({
  nowMs = Date.now(),
  metadata = [],
  topologiyaXeritesi = null,
} = {}) {
  const vaxt = Number(nowMs);
  if (!Number.isFinite(vaxt) || vaxt < 0) {
    throw new Error(`Etibarsız server vaxtı: ${nowMs}`);
  }

  const tamVaxt = Math.trunc(vaxt);
  const metadataMap = metadataXeritesiHazirla(metadata);
  const acilmisIdler = acilmisDovletIdleriniAl(tamVaxt);

  const states = acilmisIdler.map((stateId) => {
    const plan = dovletPlanliVaxtlariniAl(stateId, tamVaxt);
    const elave = dovletMetadataHazirla(metadataMap.get(stateId));
    const layoutNode = qlobalNodeHazirla(dovletUcunQlobalNodeAl(stateId));

    return {
      stateId,
      opened: true,
      stateOpenedAtMs: plan.stateOpensAtMs,
      presidentUnlockAtMs: plan.presidentUnlockAtMs,
      ...elave,
      // Explicit metadata node-u server operatorunun/persistence qatının stabil
      // vizual yerləşmə qərarıdır. Verilməyibsə əvvəlki built-in layout fallback qalır.
      globalNode: elave.globalNode || layoutNode,
    };
  });

  return {
    version: 2,
    serverTimeUnixMs: tamVaxt,
    onlyOpenedStates: true,
    layout: qlobalLayoutMelumatiniHazirla(),
    states,
    connections: qlobalElaqeleriHazirla(acilmisIdler, topologiyaXeritesi),
  };
}

module.exports = {
  metadataXeritesiHazirla,
  qlobalNodeHazirla,
  dovletMetadataHazirla,
  qlobalElaqeleriHazirla,
  qlobalDovletlerPayloadHazirla,
};
