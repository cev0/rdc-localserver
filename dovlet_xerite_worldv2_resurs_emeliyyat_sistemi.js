'use strict';

const legacy = require('./dovlet_xerite_worldv2_resurs_emeliyyat_legacy');
const sqlNative = require('./dovlet_xerite_worldv2_resurs_sql_native');
const {
  worldV2ResursShadowSyncAktivdir,
  worldV2ResursShadowSyncEtClient,
} = require('./dovlet_xerite_worldv2_resurs_shadow_sync');

async function sqlIstifadeEtClient(client, stateId) {
  return await sqlNative.worldV2SqlNativeIstifadeEtClient(client, stateId);
}

async function shadowSyncEt(client, stateId, targetIds, netice) {
  if (!worldV2ResursShadowSyncAktivdir()) return netice;
  if (!netice || netice.deyisdi !== true) return netice;
  const sync = await worldV2ResursShadowSyncEtClient(client, stateId, targetIds);
  if (netice && typeof netice === 'object') {
    Object.defineProperty(netice, 'sqlShadowSync', {
      value: sync,
      enumerable: false,
      configurable: true,
    });
  }
  return netice;
}

async function runtimeEmeliyyatiClient(client, stateId, emeliyyat) {
  if (await sqlIstifadeEtClient(client, stateId)) {
    throw new Error('SQL authoritative rejimdə generic legacy WorldV2 runtime mutasiyası qadağandır.');
  }
  return await legacy.runtimeEmeliyyatiClient(client, stateId, emeliyyat);
}

async function worldV2ResursHedefiniAlClient(client, stateId, targetId, nowMs = Date.now()) {
  if (await sqlIstifadeEtClient(client, stateId)) {
    return await sqlNative.worldV2ResursHedefiniSqlAlClient(client, stateId, targetId, nowMs, false);
  }
  return await legacy.worldV2ResursHedefiniAlClient(client, stateId, targetId, nowMs);
}

async function worldV2ResursHedefiniAl(stateId, targetId, nowMs = Date.now()) {
  if (await sqlNative.worldV2SqlNativeIstifadeEt(stateId)) {
    return await sqlNative.worldV2ResursHedefiniSqlAl(stateId, targetId, nowMs);
  }
  return await legacy.worldV2ResursHedefiniAl(stateId, targetId, nowMs);
}

async function worldV2ResursDaxilOlmaVeziyyetiniAlClient(client, melumat) {
  if (await sqlIstifadeEtClient(client, melumat && melumat.stateId)) {
    return await sqlNative.worldV2ResursDaxilOlmaVeziyyetiniSqlAlClient(client, melumat);
  }
  return await legacy.worldV2ResursDaxilOlmaVeziyyetiniAlClient(client, melumat);
}

async function worldV2ResursuRezervEtClient(client, melumat) {
  if (await sqlIstifadeEtClient(client, melumat && melumat.stateId)) {
    return await sqlNative.worldV2ResursuSqlRezervEtClient(client, melumat);
  }
  const netice = await legacy.worldV2ResursuRezervEtClient(client, melumat);
  return shadowSyncEt(client, melumat && melumat.stateId, [melumat && melumat.targetId], netice);
}

async function worldV2ResursSahibliyiniKocurClient(client, melumat) {
  if (await sqlIstifadeEtClient(client, melumat && melumat.stateId)) {
    return await sqlNative.worldV2ResursSahibliyiniSqlKocurClient(client, melumat);
  }
  const netice = await legacy.worldV2ResursSahibliyiniKocurClient(client, melumat);
  return shadowSyncEt(client, melumat && melumat.stateId, [melumat && melumat.targetId], netice);
}

async function worldV2ResursRezerviniBuraxClient(client, melumat) {
  if (await sqlIstifadeEtClient(client, melumat && melumat.stateId)) {
    return await sqlNative.worldV2ResursSqlRezerviniBuraxClient(client, melumat);
  }
  const netice = await legacy.worldV2ResursRezerviniBuraxClient(client, melumat);
  return shadowSyncEt(client, melumat && melumat.stateId, [melumat && melumat.targetId], netice);
}

async function worldV2TeleportSaheResurslariniSilClient(client, melumat) {
  if (await sqlIstifadeEtClient(client, melumat && melumat.stateId)) {
    return await sqlNative.worldV2TeleportSaheResurslariniSqlSilClient(client, melumat);
  }
  const netice = await legacy.worldV2TeleportSaheResurslariniSilClient(client, melumat);
  const hedefler = netice && Array.isArray(netice.removedResourceTargetIds)
    ? netice.removedResourceTargetIds
    : [];
  return shadowSyncEt(client, melumat && melumat.stateId, hedefler, netice);
}

async function worldV2ResursToplamaniBitirClient(client, melumat) {
  if (await sqlIstifadeEtClient(client, melumat && melumat.stateId)) {
    return await sqlNative.worldV2ResursToplamaniSqlBitirClient(client, melumat);
  }
  const netice = await legacy.worldV2ResursToplamaniBitirClient(client, melumat);
  return shadowSyncEt(client, melumat && melumat.stateId, [melumat && melumat.targetId], netice);
}

module.exports = {
  WORLDV2_RESURS_TARGET_REGEX: legacy.WORLDV2_RESURS_TARGET_REGEX,
  worldV2ResursTargetIdDirmi: legacy.worldV2ResursTargetIdDirmi,
  worldV2ResursTargetiniParcala: legacy.worldV2ResursTargetiniParcala,
  runtimeEmeliyyatiClient,
  effektivMesgulluq: legacy.effektivMesgulluq,
  worldV2ResursHedefiniAlClient,
  worldV2ResursHedefiniAl,
  worldV2ResursDaxilOlmaVeziyyetiniAlClient,
  worldV2ResursuRezervEtClient,
  worldV2ResursSahibliyiniKocurClient,
  worldV2ResursRezerviniBuraxClient,
  worldV2TeleportSaheResurslariniSilClient,
  worldV2ResursToplamaniBitirClient,
};
