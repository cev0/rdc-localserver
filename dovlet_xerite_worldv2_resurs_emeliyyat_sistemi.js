'use strict';

const legacy = require('./dovlet_xerite_worldv2_resurs_emeliyyat_legacy');
const {
  worldV2ResursShadowSyncAktivdir,
  worldV2ResursShadowSyncEtClient,
} = require('./dovlet_xerite_worldv2_resurs_shadow_sync');

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

async function worldV2ResursuRezervEtClient(client, melumat) {
  const netice = await legacy.worldV2ResursuRezervEtClient(client, melumat);
  return shadowSyncEt(client, melumat && melumat.stateId, [melumat && melumat.targetId], netice);
}

async function worldV2ResursSahibliyiniKocurClient(client, melumat) {
  const netice = await legacy.worldV2ResursSahibliyiniKocurClient(client, melumat);
  return shadowSyncEt(client, melumat && melumat.stateId, [melumat && melumat.targetId], netice);
}

async function worldV2ResursRezerviniBuraxClient(client, melumat) {
  const netice = await legacy.worldV2ResursRezerviniBuraxClient(client, melumat);
  return shadowSyncEt(client, melumat && melumat.stateId, [melumat && melumat.targetId], netice);
}

async function worldV2TeleportSaheResurslariniSilClient(client, melumat) {
  const netice = await legacy.worldV2TeleportSaheResurslariniSilClient(client, melumat);
  const hedefler = netice && Array.isArray(netice.removedResourceTargetIds)
    ? netice.removedResourceTargetIds
    : [];
  return shadowSyncEt(client, melumat && melumat.stateId, hedefler, netice);
}

async function worldV2ResursToplamaniBitirClient(client, melumat) {
  const netice = await legacy.worldV2ResursToplamaniBitirClient(client, melumat);
  return shadowSyncEt(client, melumat && melumat.stateId, [melumat && melumat.targetId], netice);
}

module.exports = {
  WORLDV2_RESURS_TARGET_REGEX: legacy.WORLDV2_RESURS_TARGET_REGEX,
  worldV2ResursTargetIdDirmi: legacy.worldV2ResursTargetIdDirmi,
  worldV2ResursTargetiniParcala: legacy.worldV2ResursTargetiniParcala,
  runtimeEmeliyyatiClient: legacy.runtimeEmeliyyatiClient,
  effektivMesgulluq: legacy.effektivMesgulluq,
  worldV2ResursHedefiniAlClient: legacy.worldV2ResursHedefiniAlClient,
  worldV2ResursHedefiniAl: legacy.worldV2ResursHedefiniAl,
  worldV2ResursDaxilOlmaVeziyyetiniAlClient: legacy.worldV2ResursDaxilOlmaVeziyyetiniAlClient,
  worldV2ResursuRezervEtClient,
  worldV2ResursSahibliyiniKocurClient,
  worldV2ResursRezerviniBuraxClient,
  worldV2TeleportSaheResurslariniSilClient,
  worldV2ResursToplamaniBitirClient,
};
