'use strict';

const {
  koordinatEtibarlidir,
} = require('./dovlet_xerite_worldv2_qaydalari');

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function menfiOlmayanTamEdedAl(deyer, fallback = 0) {
  const reqem = Number(deyer);
  if (!Number.isFinite(reqem) || reqem < 0) {
    return fallback;
  }

  return Math.trunc(reqem);
}

function nullableMenfiOlmayanTamEdedAl(deyer) {
  if (deyer == null || deyer === '') {
    return null;
  }

  const reqem = Number(deyer);
  if (!Number.isFinite(reqem) || reqem < 0) {
    return null;
  }

  return Math.trunc(reqem);
}

function dovletIdYoxla(stateId) {
  const reqem = Number(stateId);
  if (!Number.isInteger(reqem) || reqem <= 0) {
    throw new Error(`Etibarsız Dövlət ID-si: ${stateId}`);
  }

  return reqem;
}

function bazaGirisiniHazirla(xamBaza, requestingPlayerId) {
  if (!xamBaza || typeof xamBaza !== 'object' || Array.isArray(xamBaza)) {
    throw new Error('WorldV2 baza girişi obyekt olmalıdır.');
  }

  const playerId = metnAl(xamBaza.playerId, 128);
  if (!playerId) {
    throw new Error('WorldV2 baza girişi üçün playerId tələb olunur.');
  }

  const x = Number(
    xamBaza.x != null
      ? xamBaza.x
      : xamBaza.baseX,
  );

  const y = Number(
    xamBaza.y != null
      ? xamBaza.y
      : xamBaza.baseZ,
  );

  if (!koordinatEtibarlidir(x, y)) {
    throw new Error(
      `WorldV2 baza koordinatı sərhəddən kənardır: ${x}:${y}`,
    );
  }

  const allianceId = metnAl(xamBaza.allianceId, 128) || null;
  const allianceName = metnAl(xamBaza.allianceName, 80) || null;
  const commanderName = metnAl(xamBaza.commanderName, 64) || null;
  const publicPower = nullableMenfiOlmayanTamEdedAl(xamBaza.publicPower);

  return {
    playerId,
    x,
    y,
    isSelf: playerId === requestingPlayerId,
    allianceId,
    allianceName,
    commanderName,
    publicPower: publicPower == null ? 0 : publicPower,
    publicPowerKnown: publicPower != null,
    hqLevel: menfiOlmayanTamEdedAl(xamBaza.hqLevel, 0),
    completedBuildingCount: menfiOlmayanTamEdedAl(
      xamBaza.completedBuildingCount,
      0,
    ),
    pvpShieldUntilMs: menfiOlmayanTamEdedAl(xamBaza.pvpShieldUntilMs, 0),
  };
}

function resursGirisiniHazirla(xamResurs, stateId) {
  if (!xamResurs || typeof xamResurs !== 'object' || Array.isArray(xamResurs)) {
    throw new Error('WorldV2 resurs girişi obyekt olmalıdır.');
  }

  const nodeId = metnAl(xamResurs.nodeId, 160);
  const targetId = metnAl(xamResurs.targetId, 200);
  const resourceId = metnAl(xamResurs.resourceId, 64).toLowerCase();
  const zoneId = metnAl(xamResurs.zoneId, 64).toLowerCase();
  const targetType = metnAl(xamResurs.targetType, 32).toLowerCase() || 'resource';

  if (!nodeId || !targetId || !resourceId || !zoneId || targetType !== 'resource') {
    throw new Error('WorldV2 resurs girişi üçün nodeId/targetId/resourceId/zoneId tələb olunur.');
  }

  const resursStateId = Number(xamResurs.stateId);
  if (!Number.isInteger(resursStateId) || resursStateId !== stateId) {
    throw new Error(`WorldV2 resurs State uyğunsuzluğu: ${resursStateId} != ${stateId}`);
  }

  const x = Number(xamResurs.x);
  const y = Number(
    xamResurs.y != null
      ? xamResurs.y
      : xamResurs.z,
  );

  if (!koordinatEtibarlidir(x, y)) {
    throw new Error(`WorldV2 resurs koordinatı sərhəddən kənardır: ${x}:${y}`);
  }

  const level = menfiOlmayanTamEdedAl(xamResurs.level, 0);
  const fullAmount = menfiOlmayanTamEdedAl(xamResurs.fullAmount, 0);
  const remainingAmount = menfiOlmayanTamEdedAl(xamResurs.remainingAmount, 0);

  if (level <= 0 || fullAmount <= 0 || remainingAmount > fullAmount) {
    throw new Error(`WorldV2 resurs balansı etibarsızdır: ${targetId}`);
  }

  return {
    targetType: 'resource',
    targetId,
    nodeId,
    stateId,
    index: menfiOlmayanTamEdedAl(xamResurs.index, 0),
    zoneId,
    resourceId,
    level,
    x,
    y,
    fullAmount,
    remainingAmount,
    gatherSeconds: menfiOlmayanTamEdedAl(xamResurs.gatherSeconds, 0),
    available: xamResurs.available === true && remainingAmount > 0,
    occupiedByPlayerId: metnAl(xamResurs.occupiedByPlayerId, 128),
    occupiedByConvoyId: metnAl(xamResurs.occupiedByConvoyId, 128),
    occupiedUntilMs: menfiOlmayanTamEdedAl(xamResurs.occupiedUntilMs, 0),
    respawnAtMs: menfiOlmayanTamEdedAl(xamResurs.respawnAtMs, 0),
    presidentCenter: xamResurs.presidentCenter === true,
    spawnSerial: Math.max(1, menfiOlmayanTamEdedAl(xamResurs.spawnSerial, 1)),
  };
}

function worldV2ObyektPayloadHazirla({
  stateId,
  requestingPlayerId,
  bases = [],
  resources = null,
  serverTimeUnixMs = Date.now(),
}) {
  const sid = dovletIdYoxla(stateId);
  const requester = metnAl(requestingPlayerId, 128);

  if (!requester) {
    throw new Error('WorldV2 obyekt payload-u üçün requestingPlayerId tələb olunur.');
  }

  if (!Array.isArray(bases)) {
    throw new Error('WorldV2 bases massivi tələb olunur.');
  }

  if (resources != null && !Array.isArray(resources)) {
    throw new Error('WorldV2 resources massivi və ya null tələb olunur.');
  }

  const hazirBazalar = [];
  const playerIdSeti = new Set();

  for (const xamBaza of bases) {
    const baza = bazaGirisiniHazirla(xamBaza, requester);

    if (playerIdSeti.has(baza.playerId)) {
      continue;
    }

    playerIdSeti.add(baza.playerId);
    hazirBazalar.push(baza);
  }

  const resourcesConnected = Array.isArray(resources);
  const hazirResurslar = [];
  const resursTargetSeti = new Set();
  const resursNodeSeti = new Set();

  if (resourcesConnected) {
    for (const xamResurs of resources) {
      const resurs = resursGirisiniHazirla(xamResurs, sid);

      if (resursTargetSeti.has(resurs.targetId) || resursNodeSeti.has(resurs.nodeId)) {
        continue;
      }

      resursTargetSeti.add(resurs.targetId);
      resursNodeSeti.add(resurs.nodeId);
      hazirResurslar.push(resurs);
    }
  }

  const now = Number(serverTimeUnixMs);

  return {
    version: 2,
    stateId: sid,
    serverTimeUnixMs: Number.isFinite(now)
      ? Math.max(0, Math.trunc(now))
      : Date.now(),
    bases: hazirBazalar,
    resources: hazirResurslar,
    enemies: [],
    camps: [],
    convoys: [],
    layerStatus: {
      basesConnected: true,
      resourcesConnected,
      enemiesConnected: false,
      campsConnected: false,
      convoysConnected: false,
    },
  };
}

module.exports = {
  metnAl,
  menfiOlmayanTamEdedAl,
  nullableMenfiOlmayanTamEdedAl,
  dovletIdYoxla,
  bazaGirisiniHazirla,
  resursGirisiniHazirla,
  worldV2ObyektPayloadHazirla,
};
