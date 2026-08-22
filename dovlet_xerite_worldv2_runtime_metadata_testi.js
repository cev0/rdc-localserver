'use strict';

const assert = require('assert');
const {
  stateIdAl,
  runtimeDovletMetadatasiniHazirla,
  runtimeDovletMetadataSiyahisiniHazirla,
} = require('./dovlet_xerite_worldv2_runtime_metadata');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

const NOW = Date.UTC(2026, 7, 22, 0, 0, 0, 0);

test('Runtime metadata Dövlət adını və Prezident capture məlumatını daşıyır', () => {
  const metadata = runtimeDovletMetadatasiniHazirla({
    stateId: 2,
    displayName: 'Dövlət 2',
    centerBuilding: {
      x: 600,
      z: 600,
      unlockAtMs: NOW - 1000,
      occupiedByPlayerId: 'player_prezident',
      occupiedByAllianceId: 'alliance_2',
      occupiedAtMs: NOW - 500,
    },
  }, NOW);

  assert.deepStrictEqual(metadata, {
    stateId: 2,
    displayName: 'Dövlət 2',
    presidentPlayerId: 'player_prezident',
    presidentAllianceId: 'alliance_2',
    presidentUnlocked: true,
    presidentOccupiedAtMs: NOW - 500,
    flagId: null,
    globalNode: null,
  });
});

test('Runtime metadata bayraq və qlobal node uydurmur', () => {
  const metadata = runtimeDovletMetadatasiniHazirla({
    stateId: 1,
    centerBuilding: { x: 600, z: 600, unlockAtMs: NOW + 1000 },
  }, NOW);

  assert.strictEqual(metadata.flagId, null);
  assert.strictEqual(metadata.globalNode, null);
  assert.strictEqual(metadata.presidentUnlocked, false);
});

test('Runtime siyahısı State ID-yə görə stabil sıralanır', () => {
  const siyahi = runtimeDovletMetadataSiyahisiniHazirla([
    { stateId: 3, centerBuilding: { x: 600, z: 600 } },
    { stateId: 1, centerBuilding: { x: 600, z: 600 } },
    { stateId: 2, centerBuilding: { x: 600, z: 600 } },
  ], NOW);

  assert.deepStrictEqual(siyahi.map(x => x.stateId), [1, 2, 3]);
});

test('Təkrarlanan runtime State ID-si rədd edilir', () => {
  assert.throws(() => runtimeDovletMetadataSiyahisiniHazirla([
    { stateId: 1, centerBuilding: {} },
    { stateId: 1, centerBuilding: {} },
  ], NOW));
});

test('Etibarsız State ID-ləri qəbul edilmir', () => {
  assert.strictEqual(stateIdAl(1), 1);
  assert.strictEqual(stateIdAl('2'), 2);
  assert.strictEqual(stateIdAl(0), null);
  assert.strictEqual(stateIdAl(-1), null);
  assert.strictEqual(stateIdAl('abc'), null);
  assert.throws(() => runtimeDovletMetadatasiniHazirla({ stateId: 0 }, NOW));
});

console.log('\nWorldV2 runtime metadata testləri uğurla tamamlandı.');
