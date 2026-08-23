'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const contract = require('./server_unity_message_contract_worldv2.json');

const sened = fs.readFileSync(
  path.join(__dirname, 'DOVLET_XERITESI_WORLDV2_ACIQ_MESELELER.md'),
  'utf8',
);
const migrasiyaAuditi = fs.readFileSync(
  path.join(__dirname, 'DOVLET_XERITESI_WORLDV2_MIGRASIYA_AUDITI.md'),
  'utf8',
);

console.log('WorldV2 sənəd consistency testləri...');

assert.strictEqual(contract.intentionallyUnresolved.presidentDefenseCoordinates, false);
assert.ok(sened.includes('`yuxari` → `596:596`'));
assert.ok(sened.includes('`sag` → `605:596`'));
assert.ok(sened.includes('`sol` → `596:605`'));
assert.ok(sened.includes('`asagi` → `605:605`'));
assert.ok(!sened.includes('`defenseCoordinates` buna görə hazırda `null`'));

assert.strictEqual(contract.intentionallyUnresolved.globalMapNodeLayout, false);
assert.ok(sened.includes('Qlobal xəritə layout V1'));
assert.ok(sened.includes('`normalized_0_1`'));
assert.ok(sened.includes('`worldv2_qlobal_fon_v1`'));
assert.ok(!sened.includes('qlobal node/slot siyahısı;'));

assert.strictEqual(contract.intentionallyUnresolved.borderEntryCoordinates, true);
assert.ok(sened.includes('`entryCoordinate` hazırda `null`'));

assert.strictEqual(contract.intentionallyUnresolved.stableAllianceIdForBaseLodFiltering, true);
assert.ok(sened.includes('stabil server-authoritative `allianceId` mənbəyi hələ yoxdur'));
assert.ok(sened.includes('İttifaq adı texniki ID kimi istifadə edilmir'));

assert.strictEqual(contract.intentionallyUnresolved.worldV2ResourcePlacement, true);
assert.strictEqual(contract.intentionallyUnresolved.worldV2EnemyPlacement, true);
assert.ok(sened.includes('Legacy xəritədə olan `1024×1024` radius və spawn sayları'));

assert.strictEqual(contract.intentionallyUnresolved.globalPresidentNameFlagMetadataSource, true);
assert.ok(sened.includes('Qlobal xəritə Prezident/ad/bayraq metadata mənbəyi'));

assert.ok(sened.includes('Əlfəcinlərin authoritative saxlanması artıq həll olunub'));
assert.ok(sened.includes('npm run xerite:worldv2-test'));

// Migrasiya auditinin də cari production contract-dan geri qalmamasını qoruyur.
assert.ok(migrasiyaAuditi.includes('production-a qoşulmuş hissələr'));
assert.ok(migrasiyaAuditi.includes('WorldV2 baza obyekt layer-i PostgreSQL'));
assert.ok(migrasiyaAuditi.includes('`global_states_v2_request/result` production handler-i'));
assert.ok(migrasiyaAuditi.includes('Qlobal xəritə Layout V1'));
assert.ok(migrasiyaAuditi.includes('`yuxari` → `596:596`'));
assert.ok(migrasiyaAuditi.includes('`asagi` → `605:605`'));
assert.ok(migrasiyaAuditi.includes('WorldV2 əlfəcin list/add/remove'));
assert.ok(!migrasiyaAuditi.includes('WorldV2 hazırlığı yalnız:'));
assert.ok(!migrasiyaAuditi.includes('Production handler-ə qoşulmur.'));
assert.ok(!migrasiyaAuditi.includes('Prezident müdafiə toplarının dəqiq offset-ləri;'));
assert.ok(!migrasiyaAuditi.includes('locked State-in Global xəritədə görünüş qaydası.'));

assert.strictEqual(contract.intentionallyUnresolved.realStateTopologyIds, true);
assert.ok(migrasiyaAuditi.includes('real State qonşuluq ID-ləri'));
assert.strictEqual(contract.intentionallyUnresolved.borderEntryCoordinates, true);
assert.ok(migrasiyaAuditi.includes('`borderEntryCoordinates`'));
assert.strictEqual(contract.intentionallyUnresolved.stableAllianceIdForBaseLodFiltering, true);
assert.ok(migrasiyaAuditi.includes('`stableAllianceIdForBaseLodFiltering`'));
assert.strictEqual(contract.intentionallyUnresolved.globalPresidentNameFlagMetadataSource, true);
assert.ok(migrasiyaAuditi.includes('Qlobal Prezident/ad/bayraq metadata mənbəyi'));

console.log('WorldV2 sənədləri contract-la uyğundur.');
