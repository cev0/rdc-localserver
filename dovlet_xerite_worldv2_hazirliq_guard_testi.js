'use strict';

const assert = require('assert');
const contract = require('./server_unity_message_contract_worldv2.json');
const {
  worldV2BaslangicPayloadHazirla,
  serhedKecidiPayloadHazirla,
  DOVLET_KECID_STATUSU,
} = require('./dovlet_xerite_worldv2_payload');

console.log('WorldV2 hazırlıq guard testləri...');

assert.strictEqual(contract.version, 2);
assert.strictEqual(contract.status, 'partial_production_connected');
assert.strictEqual(
  contract.productionConnected,
  false,
  'Bütöv WorldV2 hələ tam production-connected sayılmamalıdır.',
);

assert.ok(contract.productionConnections);
assert.strictEqual(
  contract.productionConnections.state_map_v2_objects_request.connected,
  true,
);
assert.strictEqual(
  contract.productionConnections.state_map_v2_objects_request.source,
  'dovlet_baza_kataloqu_postgres',
);
assert.strictEqual(
  contract.productionConnections.state_map_v2_objects_request.layers.bases,
  true,
);
assert.strictEqual(
  contract.productionConnections.state_map_v2_objects_request.layers.resources,
  false,
);

const unresolved = contract.intentionallyUnresolved || {};
for (const key of [
  'realStateTopologyIds',
  'borderEntryCoordinates',
  'presidentDefenseCoordinates',
  'globalPresidentNameFlagMetadataSource',
  'worldV2ResourcePlacement',
  'worldV2EnemyPlacement',
  'stableAllianceIdForBaseLodFiltering',
]) {
  assert.strictEqual(
    unresolved[key],
    true,
    `Hazırlıq mərhələsində unresolved qayda false edilməməlidir: ${key}`,
  );
}

// Qlobal node layout artıq ayrıca server-authoritative V1 kimi həll olunub.
assert.strictEqual(
  unresolved.globalMapNodeLayout,
  false,
  'Qlobal node layout V1 rəsmiləşdirildiyi üçün unresolved qala bilməz.',
);
assert.strictEqual(
  contract.productionConnections.global_states_v2_request.connected,
  true,
);
assert.strictEqual(
  contract.productionConnections.global_states_v2_request.layoutVersion,
  1,
);
assert.strictEqual(
  contract.productionConnections.global_states_v2_request.coordinateSpace,
  'normalized_0_1',
);
assert.strictEqual(
  contract.authoritativeRules.globalNodeLayoutIsServerAuthoritative,
  true,
);
assert.strictEqual(
  contract.authoritativeRules.globalConnectionRequiresBothStatesOpened,
  true,
);

const qonsular = {
  simal: { stateId: null, status: DOVLET_KECID_STATUSU.QONSU_YOXDUR },
  serq: { stateId: 2, status: DOVLET_KECID_STATUSU.BAGLIDIR },
  cenub: { stateId: null, status: DOVLET_KECID_STATUSU.QONSU_YOXDUR },
  qerb: { stateId: null, status: DOVLET_KECID_STATUSU.QONSU_YOXDUR },
};

const baslangic = worldV2BaslangicPayloadHazirla({
  stateId: 1,
  playerId: 'guard-player',
  baseX: 100,
  baseZ: 200,
  qonsular,
  prezident: {
    unlocked: false,
    active: false,
    presidentPlayerId: null,
    presidentAllianceId: null,
    unlockAtUnixMs: 0,
  },
  serverTimeUnixMs: 1,
});

assert.strictEqual(
  baslangic.presidentCenter.defenseCoordinates,
  null,
  'Prezident müdafiə koordinatları server müqaviləsinə ayrıca keçirilmədən payload-a yazılmamalıdır.',
);

const kecid = serhedKecidiPayloadHazirla({
  currentStateId: 1,
  istiqamet: 'serq',
  qonsu: {
    stateId: 2,
    status: DOVLET_KECID_STATUSU.KECIDE_ACIQDIR,
  },
});

assert.strictEqual(
  kecid.entryCoordinate,
  null,
  'Sərhəd giriş koordinatı gameplay qaydası təsdiqlənmədən uydurulmamalıdır.',
);

const obyektMesaji = contract.messages.state_map_v2_objects_request;
assert.strictEqual(
  obyektMesaji.currentBehavior,
  'production_postgres_bases_connected',
);
assert.strictEqual(
  obyektMesaji.productionSource,
  'dovlet_baza_kataloqu_postgres',
);
assert.strictEqual(
  obyektMesaji.readFailureErrorCode,
  'WORLDV2_OBJECTS_READ_FAILED',
);
assert.strictEqual(
  obyektMesaji.resultWhenBaseDependencyConnected.info.layerStatus.basesConnected,
  true,
);
assert.strictEqual(
  obyektMesaji.resultWhenBaseDependencyConnected.info.layerStatus.resourcesConnected,
  false,
);

console.log('WorldV2 hazırlıq guard testləri uğurla tamamlandı.');
