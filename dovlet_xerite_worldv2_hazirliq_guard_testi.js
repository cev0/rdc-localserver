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

// Sərhəd giriş koordinatı artıq production server qaydasıdır.
assert.strictEqual(unresolved.borderEntryCoordinates, false);
assert.strictEqual(
  contract.productionConnections.state_map_v2_border_transition_request.connected,
  true,
);
assert.strictEqual(
  contract.productionConnections.state_map_v2_border_transition_request.readOnly,
  true,
);
assert.strictEqual(
  contract.authoritativeRules.borderEntryCoordinateIsServerAuthoritative,
  true,
);
assert.strictEqual(
  contract.authoritativeRules.clientMayMutateBorderTransitionLocally,
  false,
);

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

// Prezident mərkəzinin dörd müdafiə topu artıq gameplay/Unity quruluşunda
// təsdiqlənib və server müqaviləsində də authoritative saxlanılır.
assert.strictEqual(unresolved.presidentDefenseCoordinates, false);
assert.strictEqual(
  contract.authoritativeRules.presidentDefenseCoordinatesAreServerAuthoritative,
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

assert.deepStrictEqual(
  baslangic.presidentCenter.defenseCoordinates,
  [
    { slot: 'yuxari', x: 596, y: 596 },
    { slot: 'sag', x: 605, y: 596 },
    { slot: 'sol', x: 596, y: 605 },
    { slot: 'asagi', x: 605, y: 605 },
  ],
  'Prezident müdafiə koordinatları təsdiqlənmiş authoritative slotlarla gəlməlidir.',
);

// Köhnə pure payload helper hələ giriş koordinatı yaratmır. Production handler
// onu ayrıca topologiya/lifecycle yoxlamasından sonra authoritative doldurur.
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
  'Pure payload helper production sərhəd giriş koordinatını özü uydurmamalıdır.',
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
