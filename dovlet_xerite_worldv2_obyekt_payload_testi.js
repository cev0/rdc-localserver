'use strict';

const assert = require('assert');

const {
  bazaGirisiniHazirla,
  worldV2ObyektPayloadHazirla,
} = require('./dovlet_xerite_worldv2_obyekt_payload');

const {
  worldV2BazalariniPlayersMapDanAl,
} = require('./dovlet_xerite_worldv2_baza_adapteri');

(function testBazaGirisininKoordinatCevrilmesi() {
  const baza = bazaGirisiniHazirla(
    {
      playerId: 'p1',
      baseX: 321,
      baseZ: 856,
      allianceId: 'a-1',
      allianceName: 'Test İttifaq',
    },
    'p1',
  );

  assert.strictEqual(baza.playerId, 'p1');
  assert.strictEqual(baza.x, 321);
  assert.strictEqual(baza.y, 856);
  assert.strictEqual(baza.isSelf, true);
  assert.strictEqual(baza.allianceId, 'a-1');
})();

(function testDuplicateBazalarTeklesdirilir() {
  const payload = worldV2ObyektPayloadHazirla({
    stateId: 1,
    requestingPlayerId: 'p1',
    serverTimeUnixMs: 123,
    bases: [
      { playerId: 'p1', baseX: 321, baseZ: 856 },
      { playerId: 'p1', baseX: 322, baseZ: 857 },
      { playerId: 'p2', baseX: 500, baseZ: 500 },
    ],
  });

  assert.strictEqual(payload.version, 2);
  assert.strictEqual(payload.stateId, 1);
  assert.strictEqual(payload.serverTimeUnixMs, 123);
  assert.strictEqual(payload.bases.length, 2);
  assert.strictEqual(payload.bases[0].isSelf, true);
  assert.strictEqual(payload.bases[1].isSelf, false);
  assert.strictEqual(payload.layerStatus.basesConnected, true);
  assert.strictEqual(payload.layerStatus.resourcesConnected, false);
})();

(function testPlayersMapStateFiltriVeAllianceIdQaydasi() {
  const players = new Map();

  players.set('p1', {
    playerId: 'p1',
    ittifaqAdi: 'Ad ID deyil',
    worldPlacement: { stateId: 1, baseX: 321, baseZ: 856 },
  });

  players.set('p2', {
    playerId: 'p2',
    allianceId: 'stable-22',
    ittifaqAdi: 'İttifaq 22',
    worldPlacement: { stateId: 1, baseX: 100, baseZ: 1200 },
  });

  players.set('p3', {
    playerId: 'p3',
    worldPlacement: { stateId: 2, baseX: 600, baseZ: 600 },
  });

  players.set('p4', {
    playerId: 'p4',
    worldPlacement: { stateId: 1, baseX: 1201, baseZ: 600 },
  });

  const bazalar = worldV2BazalariniPlayersMapDanAl(players, 1);

  assert.strictEqual(bazalar.length, 2);

  const p1 = bazalar.find((x) => x.playerId === 'p1');
  const p2 = bazalar.find((x) => x.playerId === 'p2');

  assert.ok(p1);
  assert.ok(p2);
  assert.strictEqual(p1.allianceId, null);
  assert.strictEqual(p1.allianceName, 'Ad ID deyil');
  assert.strictEqual(p2.allianceId, 'stable-22');
  assert.strictEqual(p2.baseZ, 1200);
})();

(function testSerhedXariciBazaFailClosed() {
  assert.throws(() => {
    bazaGirisiniHazirla(
      { playerId: 'p1', baseX: -1, baseZ: 600 },
      'p1',
    );
  }, /sərhəddən kənardır/i);
})();

console.log('✓ WorldV2 obyekt payload/baza adapter testləri keçdi.');
