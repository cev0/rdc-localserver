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

test('Border transition contract hazırda yalnız check olduğunu açıq saxlayır', () => {
  const border = contract.messages[WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU];
  assert.strictEqual(
    border.currentBehavior,
    'authoritative_check_only_no_state_mutation',
  );
});

test('Obyekt layer-i qoşulmamış vəziyyətdə fail-closed contract saxlanılır', () => {
  const objects = contract.messages[WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU];
  assert.strictEqual(
    objects.errorCode,
    WORLDV2_XETA_KODLARI.OBYEKTLER_HAZIR_DEYIL,
  );
});

console.log('\nWorldV2 server/Unity müqavilə testləri uğurla tamamlandı.');