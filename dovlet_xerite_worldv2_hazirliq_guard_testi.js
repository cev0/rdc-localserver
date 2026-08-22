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
assert.strictEqual(contract.status, 'hazirliq_branch_only');
assert.strictEqual(contract.productionConnected, false);

const unresolved = contract.intentionallyUnresolved || {};
for (const key of [
  'realStateTopologyIds',
  'borderEntryCoordinates',
  'presidentDefenseCoordinates',
  'globalMapNodeLayout',
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
  'Prezident müdafiə koordinatları qərar verilmədən payload-a yazılmamalıdır.',
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

assert.strictEqual(
  contract.messages.state_map_v2_objects_request.currentBehavior,
  'fail_closed_until_worldv2_placement_is_connected',
);
assert.strictEqual(
  contract.messages.state_map_v2_objects_request.errorCode,
  'WORLDV2_OBJECTS_NOT_CONNECTED',
);

console.log('WorldV2 hazırlıq guard testləri uğurla tamamlandı.');
