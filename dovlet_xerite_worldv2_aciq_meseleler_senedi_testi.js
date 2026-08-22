'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const contract = require('./server_unity_message_contract_worldv2.json');

const sened = fs.readFileSync(
  path.join(__dirname, 'DOVLET_XERITESI_WORLDV2_ACIQ_MESELELER.md'),
  'utf8',
);

console.log('WorldV2 açıq məsələlər sənədi consistency testləri...');

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

console.log('WorldV2 açıq məsələlər sənədi contract-la uyğundur.');
