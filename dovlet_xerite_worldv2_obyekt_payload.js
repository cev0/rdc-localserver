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

  // VACİB:
  // ittifaq adı stable ID deyil. allianceId yalnız authoritative state-də
  // ayrıca, sabit identifikator həqiqətən mövcuddursa ötürülür.
  const allianceId = metnAl(xamBaza.allianceId, 128) || null;
  const allianceName = metnAl(xamBaza.allianceName, 80) || null;
  const commanderName = metnAl(xamBaza.commanderName, 64) || null;

  return {
    playerId,
    x,
    y,
    isSelf: playerId === requestingPlayerId,
    allianceId,
    allianceName,
    commanderName,
    publicPower: nullableMenfiOlmayanTamEdedAl(xamBaza.publicPower),
    hqLevel: menfiOlmayanTamEdedAl(xamBaza.hqLevel, 0),
    completedBuildingCount: menfiOlmayanTamEdedAl(
      xamBaza.completedBuildingCount,
      0,
    ),
    pvpShieldUntilMs: menfiOlmayanTamEdedAl(xamBaza.pvpShieldUntilMs, 0),
  };
}

function worldV2ObyektPayloadHazirla({
  stateId,
  requestingPlayerId,
  bases = [],
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

  const hazirBazalar = [];
  const playerIdSeti = new Set();

  for (const xamBaza of bases) {
    const baza = bazaGirisiniHazirla(xamBaza, requester);

    // Eyni player bir payload-da iki dəfə render edilməməlidir.
    if (playerIdSeti.has(baza.playerId)) {
      continue;
    }

    playerIdSeti.add(baza.playerId);
    hazirBazalar.push(baza);
  }

  const now = Number(serverTimeUnixMs);

  return {
    version: 2,
    stateId: sid,
    serverTimeUnixMs: Number.isFinite(now)
      ? Math.max(0, Math.trunc(now))
      : Date.now(),
    bases: hazirBazalar,
    resources: [],
    enemies: [],
    camps: [],
    convoys: [],
    layerStatus: {
      basesConnected: true,
      resourcesConnected: false,
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
  worldV2ObyektPayloadHazirla,
};
