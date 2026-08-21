'use strict';

const {
  prezidentMelumatiniHazirla,
} = require('./dovlet_xerite_worldv2_prezident_adapteri');

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function stateIdAl(deyer) {
  const reqem = Number(deyer);
  if (!Number.isFinite(reqem) || !Number.isInteger(reqem) || reqem <= 0) {
    return null;
  }
  return reqem;
}

/**
 * Bir legacy State runtime-ını Qlobal WorldV2 metadata formatına çevirir.
 * Qlobal node/flag sistemi hələ authoritative mənbəyə bağlanmadığı üçün
 * burada yaradılmır.
 */
function runtimeDovletMetadatasiniHazirla(stateRuntime, nowMs = Date.now()) {
  if (!stateRuntime || typeof stateRuntime !== 'object' || Array.isArray(stateRuntime)) {
    throw new Error('State runtime metadata üçün obyekt tələb olunur.');
  }

  const stateId = stateIdAl(stateRuntime.stateId);
  if (stateId === null) {
    throw new Error(`Etibarsız State runtime ID-si: ${stateRuntime.stateId}`);
  }

  const prezident = prezidentMelumatiniHazirla(stateRuntime, nowMs);

  return {
    stateId,
    displayName: metnAl(stateRuntime.displayName, 100) || null,
    presidentPlayerId: prezident.presidentPlayerId,
    presidentAllianceId: prezident.presidentAllianceId,
    presidentUnlocked: prezident.acilib,
    presidentOccupiedAtMs: prezident.occupiedAtMs,
    flagId: null,
    globalNode: null,
  };
}

function runtimeDovletMetadataSiyahisiniHazirla(stateRuntimes, nowMs = Date.now()) {
  if (!Array.isArray(stateRuntimes)) {
    throw new Error('State runtime metadata siyahısı massiv olmalıdır.');
  }

  const gorulen = new Set();
  const netice = [];

  for (const runtime of stateRuntimes) {
    const metadata = runtimeDovletMetadatasiniHazirla(runtime, nowMs);
    if (gorulen.has(metadata.stateId)) {
      throw new Error(`Təkrarlanan State runtime ID-si: ${metadata.stateId}`);
    }
    gorulen.add(metadata.stateId);
    netice.push(metadata);
  }

  netice.sort((a, b) => a.stateId - b.stateId);
  return netice;
}

module.exports = {
  stateIdAl,
  runtimeDovletMetadatasiniHazirla,
  runtimeDovletMetadataSiyahisiniHazirla,
};
