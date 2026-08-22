'use strict';

const assert = require('assert');

const {
  DOVLET_DOVR_MS,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const {
  WORLDV2_QLOBAL_SORGU,
  WORLDV2_QLOBAL_CAVAB,
  worldV2QlobalProductionHandleriYarat,
} = require('./dovlet_xerite_worldv2_qlobal_production_handler');

async function run() {
  const cavablar = [];
  const send = (_ws, payload) => cavablar.push(payload);

  // Dependency injection testi handler-in read-only/auth davranışını ayrı yoxlayır.
  const handler = worldV2QlobalProductionHandleriYarat({
    metadataAl: async () => [],
    payloadHazirla: ({ nowMs, metadata }) => ({
      version: 2,
      serverTimeUnixMs: nowMs,
      onlyOpenedStates: true,
      metadataCount: metadata.length,
      states: [
        {
          stateId: 1,
          opened: true,
          displayName: null,
          presidentPlayerId: null,
          flagId: null,
          globalNode: null,
        },
      ],
    }),
  });

  const aidDeyil = await handler({
    type: 'başqa_mesaj',
    ws: { _authedPlayerId: 'oyuncu-1' },
    send,
  });
  assert.strictEqual(aidDeyil, false);
  assert.strictEqual(cavablar.length, 0);

  const authYoxdur = await handler({
    type: WORLDV2_QLOBAL_SORGU,
    ws: {},
    send,
    nowMs: () => 123456,
  });
  assert.strictEqual(authYoxdur, true);
  assert.strictEqual(cavablar.length, 1);
  assert.strictEqual(cavablar[0].type, WORLDV2_QLOBAL_CAVAB);
  assert.strictEqual(cavablar[0].success, false);
  assert.strictEqual(cavablar[0].errorCode, 'WORLDV2_AUTH_REQUIRED');

  cavablar.length = 0;

  const ugurlu = await handler({
    type: WORLDV2_QLOBAL_SORGU,
    ws: { _authedPlayerId: 'Oyuncu-1' },
    send,
    nowMs: () => 987654321,
  });

  assert.strictEqual(ugurlu, true);
  assert.strictEqual(cavablar.length, 1);

  const cavab = cavablar[0];
  assert.strictEqual(cavab.type, WORLDV2_QLOBAL_CAVAB);
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.playerId, 'oyuncu-1');
  assert.ok(cavab.info);
  assert.strictEqual(cavab.info.onlyOpenedStates, true);
  assert.strictEqual(cavab.info.states.length, 1);
  assert.strictEqual(cavab.info.states[0].stateId, 1);
  assert.strictEqual(cavab.info.states[0].displayName, null);
  assert.strictEqual(cavab.info.states[0].globalNode, null);
  assert.strictEqual(cavab.info.metadataCount, 0);
  assert.strictEqual(cavab.info.serverTimeUnixMs, 987654321);
  assert.strictEqual(cavab.payloadJson, JSON.stringify(cavab.info));

  // İndi production handler + real qlobal payload builder inteqrasiyasını yoxlayırıq.
  const evvelkiRelease = process.env.PLAY_MARKET_RELEASE_TARIXI;
  const releaseMs = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
  process.env.PLAY_MARKET_RELEASE_TARIXI = new Date(releaseMs).toISOString();

  try {
    const realCavablar = [];
    const realHandler = worldV2QlobalProductionHandleriYarat({
      metadataAl: async () => [],
    });

    const emalOlundu = await realHandler({
      type: WORLDV2_QLOBAL_SORGU,
      ws: { _authedPlayerId: 'oyuncu-layout' },
      send: (_ws, payload) => realCavablar.push(payload),
      nowMs: () => releaseMs + DOVLET_DOVR_MS,
    });

    assert.strictEqual(emalOlundu, true);
    assert.strictEqual(realCavablar.length, 1);

    const real = realCavablar[0];
    assert.strictEqual(real.success, true);
    assert.deepStrictEqual(real.info.states.map(x => x.stateId), [1, 2]);
    assert.strictEqual(real.info.layout.layoutVersion, 1);
    assert.strictEqual(real.info.layout.coordinateSpace, 'normalized_0_1');
    assert.strictEqual(real.info.layout.backgroundId, 'worldv2_qlobal_fon_v1');
    assert.strictEqual(real.info.layout.capacity, 91);

    for (const dovlet of real.info.states) {
      assert.ok(dovlet.globalNode);
      assert.ok(Number.isFinite(dovlet.globalNode.normalizedX));
      assert.ok(Number.isFinite(dovlet.globalNode.normalizedY));
    }

    for (const elage of real.info.connections) {
      assert.ok([1, 2].includes(elage.fromStateId));
      assert.ok([1, 2].includes(elage.toStateId));
    }

    assert.strictEqual(real.payloadJson, JSON.stringify(real.info));
  } finally {
    if (evvelkiRelease === undefined) {
      delete process.env.PLAY_MARKET_RELEASE_TARIXI;
    } else {
      process.env.PLAY_MARKET_RELEASE_TARIXI = evvelkiRelease;
    }
  }

  console.log('✓ WorldV2 Qlobal production handler read-only/auth/layout testləri keçdi.');
}

module.exports = run();
