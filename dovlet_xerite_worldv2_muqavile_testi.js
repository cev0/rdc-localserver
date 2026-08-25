'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  DOVLET_XERITESI_V2,
} = require('./dovlet_xerite_worldv2_qaydalari');

const {
  WORLDV2_MESAJ_NOVLERI,
} = require('./dovlet_xerite_worldv2_payload');

const {
  WORLDV2_XETA_KODLARI,
} = require('./dovlet_xerite_worldv2_handler');

const {
  WORLDV2_RUNTIME_GUARD_XETALARI,
} = require('./dovlet_xerite_worldv2_runtime_guard');

const {
  SERHED_KECID_XETA_KODLARI,
} = require('./dovlet_xerite_worldv2_serhed_xidmeti');

const {
  DOVLET_DOVR_GUN,
  PREZIDENT_ACILMA_GUN,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const {
  QLOBAL_LAYOUT_VERSION,
  QLOBAL_LAYOUT_KOORDINAT_SAHESI,
  QLOBAL_LAYOUT_FON_ID,
  QLOBAL_LAYOUT_TUTUMU,
} = require('./dovlet_xerite_worldv2_qlobal_layout');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

const contractYolu = path.join(__dirname, 'server_unity_message_contract_worldv2.json');
const contract = JSON.parse(fs.readFileSync(contractYolu, 'utf8'));

test('WorldV2 JSON müqaviləsinin versiyası kodla eynidir', () => {
  assert.strictEqual(contract.version, DOVLET_XERITESI_V2.versiya);
});

test('WorldV2 JSON koordinat domeni kodla eynidir', () => {
  assert.strictEqual(contract.coordinateSystem.minX, DOVLET_XERITESI_V2.minimumKoordinat);
  assert.strictEqual(contract.coordinateSystem.maxX, DOVLET_XERITESI_V2.maksimumKoordinat);
  assert.strictEqual(contract.coordinateSystem.minY, DOVLET_XERITESI_V2.minimumKoordinat);
  assert.strictEqual(contract.coordinateSystem.maxY, DOVLET_XERITESI_V2.maksimumKoordinat);
  assert.strictEqual(contract.coordinateSystem.centerX, DOVLET_XERITESI_V2.merkezX);
  assert.strictEqual(contract.coordinateSystem.centerY, DOVLET_XERITESI_V2.merkezY);
});

test('Bütün WorldV2 request/result mesaj adları JSON müqaviləsində var', () => {
  const mesajlar = contract.messages || {};

  assert.ok(mesajlar[WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU]);
  assert.strictEqual(
    mesajlar[WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU].resultType,
    WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_CAVAB,
  );

  assert.ok(mesajlar[WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU]);
  assert.strictEqual(
    mesajlar[WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU].resultType,
    WORLDV2_MESAJ_NOVLERI.OBYEKTLER_CAVAB,
  );

  assert.ok(mesajlar[WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU]);
  assert.strictEqual(
    mesajlar[WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU].resultType,
    WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_CAVAB,
  );

  assert.ok(mesajlar[WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_SORGU]);
  assert.strictEqual(
    mesajlar[WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_SORGU].resultType,
    WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_CAVAB,
  );
});

test('Server-side WorldV2 error kodları JSON müqaviləsində tam siyahılanıb', () => {
  const contractKodlari = new Set(contract.errorCodes || []);
  const serverKodlari = [
    ...Object.values(WORLDV2_XETA_KODLARI),
    ...Object.values(WORLDV2_RUNTIME_GUARD_XETALARI),
    ...Object.values(SERHED_KECID_XETA_KODLARI),
  ];

  for (const kod of serverKodlari) {
    assert.strictEqual(contractKodlari.has(kod), true, `Contract-da errorCode yoxdur: ${kod}`);
  }
});

test('Runtime State ID uyğunluğu fail-closed qaydası contract-da açıq yazılıb', () => {
  assert.strictEqual(contract.authoritativeRules.runtimeStateIdMustMatchRequestedStateId, true);
  assert.strictEqual(contract.authoritativeRules.runtimeValidationIsFailClosed, true);
});

test('Border direction validation fail-closed qaydası contract-da açıq yazılıb', () => {
  const border = contract.messages[WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU];
  assert.strictEqual(
    border.invalidDirectionErrorCode,
    SERHED_KECID_XETA_KODLARI.ETIBARSIZ_ISTIQAMET,
  );
  assert.strictEqual(contract.authoritativeRules.invalidBorderDirectionFailsClosed, true);
});

test('60 günlük State və 30 günlük Prezident qaydası JSON müqaviləsi ilə eynidir', () => {
  assert.strictEqual(contract.authoritativeRules.stateLifecycleDays, DOVLET_DOVR_GUN);
  assert.strictEqual(
    contract.authoritativeRules.presidentUnlockDaysAfterStateStart,
    PREZIDENT_ACILMA_GUN,
  );
});

test('Prezident müdafiə koordinatları server və JSON müqaviləsində eynidir', () => {
  const info = contract.messages[WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU]
    .result.info.presidentCenter;
  const qaydaKoordinatlari = DOVLET_XERITESI_V2.prezidentMerkezi.mudafieKoordinatlari
    .map(x => ({ ...x }));

  assert.deepStrictEqual(info.defenseCoordinates, qaydaKoordinatlari);
  assert.strictEqual(info.defenseBuildingCount, qaydaKoordinatlari.length);
  assert.strictEqual(
    contract.authoritativeRules.presidentDefenseCoordinatesAreServerAuthoritative,
    true,
  );
  assert.strictEqual(contract.intentionallyUnresolved.presidentDefenseCoordinates, false);
});

test('Border transition production read-only və server entry koordinatlıdır', () => {
  const border = contract.messages[WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU];
  assert.strictEqual(
    border.currentBehavior,
    'production_read_only_authoritative_neighbor_and_entry_coordinate',
  );
  assert.deepStrictEqual(
    border.requestFields,
    ['viewedStateId', 'direction', 'x', 'y'],
  );
  assert.strictEqual(contract.authoritativeRules.borderEntryCoordinateIsServerAuthoritative, true);
  assert.strictEqual(contract.authoritativeRules.clientMayMutateBorderTransitionLocally, false);
  assert.strictEqual(contract.intentionallyUnresolved.borderEntryCoordinates, false);
  assert.strictEqual(
    contract.productionConnections.state_map_v2_border_transition_request.connected,
    true,
  );
  assert.strictEqual(
    contract.productionConnections.state_map_v2_border_transition_request.readOnly,
    true,
  );
});

test('Obyekt layer-i production PostgreSQL baza mənbəyinə qoşulub', () => {
  const objects = contract.messages[WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU];
  assert.strictEqual(
    objects.currentBehavior,
    'production_postgres_bases_connected',
  );
  assert.strictEqual(objects.productionSource, 'dovlet_baza_kataloqu_postgres');
  assert.strictEqual(objects.readFailureErrorCode, 'WORLDV2_OBJECTS_READ_FAILED');
  assert.strictEqual(
    objects.resultWhenBaseDependencyConnected.info.layerStatus.basesConnected,
    true,
  );
  assert.strictEqual(
    objects.resultWhenBaseDependencyConnected.info.layerStatus.resourcesConnected,
    false,
  );
});

test('WorldV2 baza public marker sahələri JSON müqaviləsində runtime payload-la uyğun saxlanır', () => {
  const baza = contract.messages[WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU]
    .resultWhenBaseDependencyConnected.info.bases[0];

  assert.deepStrictEqual(baza, {
    playerId: 'string',
    x: 'number_0_to_1200',
    y: 'number_0_to_1200',
    isSelf: 'boolean',
    allianceId: 'stable_string_or_null',
    allianceName: 'string_or_null',
    commanderName: 'string_or_null',
    publicPower: 'non_negative_integer',
    publicPowerKnown: 'boolean',
    hqLevel: 'non_negative_integer',
    completedBuildingCount: 'non_negative_integer',
    pvpShieldUntilMs: 'non_negative_integer',
  });
});

test('Qlobal Dövlət production müqaviləsi layout V1 və authoritative topology ilə eynidir', () => {
  const qlobal = contract.messages[WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_SORGU];
  const layout = qlobal.result.info.layout;
  const production = contract.productionConnections.global_states_v2_request;

  assert.strictEqual(
    qlobal.currentBehavior,
    'production_lifecycle_layout_and_authoritative_topology_connected',
  );
  assert.strictEqual(layout.layoutVersion, QLOBAL_LAYOUT_VERSION);
  assert.strictEqual(layout.coordinateSpace, QLOBAL_LAYOUT_KOORDINAT_SAHESI);
  assert.strictEqual(layout.backgroundId, QLOBAL_LAYOUT_FON_ID);
  assert.strictEqual(layout.capacity, QLOBAL_LAYOUT_TUTUMU);

  assert.strictEqual(production.connected, true);
  assert.strictEqual(production.layoutVersion, QLOBAL_LAYOUT_VERSION);
  assert.strictEqual(production.coordinateSpace, QLOBAL_LAYOUT_KOORDINAT_SAHESI);
  assert.strictEqual(production.backgroundId, QLOBAL_LAYOUT_FON_ID);
  assert.strictEqual(production.capacity, QLOBAL_LAYOUT_TUTUMU);
});

test('Qlobal node və əlaqə qaydaları server-authoritative kimi rəsmiləşdirilib', () => {
  assert.strictEqual(contract.authoritativeRules.globalNodeLayoutIsServerAuthoritative, true);
  assert.strictEqual(contract.authoritativeRules.globalConnectionRequiresBothStatesOpened, true);
  assert.strictEqual(contract.authoritativeRules.globalClientMayInventLockedStatesOrNodes, false);
  assert.strictEqual(contract.intentionallyUnresolved.globalMapNodeLayout, false);
  assert.strictEqual(
    contract.intentionallyUnresolved.globalPresidentNameFlagMetadataSource,
    true,
  );
});

console.log('\nWorldV2 server/Unity müqavilə testləri uğurla tamamlandı.');
