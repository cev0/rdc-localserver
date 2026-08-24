'use strict';

const assert = require('assert');

const {
  DOVLET_DOVR_MS,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');

const {
  WORLDV2_QLOBAL_SORGU,
  WORLDV2_QLOBAL_CAVAB,
  WORLDV2_QLOBAL_AXTARIS_SORGU,
  WORLDV2_QLOBAL_AXTARIS_CAVAB,
  worldV2QlobalProductionHandleriYarat,
} = require('./dovlet_xerite_worldv2_qlobal_production_handler');

async function run() {
  const cavablar = [];
  const send = (_ws, payload) => cavablar.push(payload);
  const topologiyaXeritesi = topologiyaniYoxlaVeHazirla([
    { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
    { stateId: 2, simal: null, serq: null, cenub: null, qerb: 1 },
  ]);

  const handler = worldV2QlobalProductionHandleriYarat({
    metadataAl: async () => [],
    topologiyaXeritesi,
    payloadHazirla: ({ nowMs, metadata, topologiyaXeritesi: gelenTopologiya }) => {
      assert.strictEqual(gelenTopologiya, topologiyaXeritesi);
      return {
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
            globalNode: { nodeId: 'state_1', normalizedX: 0.2, normalizedY: 0.3 },
          },
        ],
      };
    },
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
  assert.strictEqual(cavab.info.displayName, undefined);
  assert.strictEqual(cavab.info.metadataCount, 0);
  assert.strictEqual(cavab.info.serverTimeUnixMs, 987654321);
  assert.strictEqual(cavab.payloadJson, JSON.stringify(cavab.info));

  cavablar.length = 0;

  const axtaris = await handler({
    type: WORLDV2_QLOBAL_AXTARIS_SORGU,
    msg: { stateCode: 'State#1' },
    ws: { _authedPlayerId: 'Oyuncu-1' },
    send,
    nowMs: () => 987654322,
  });

  assert.strictEqual(axtaris, true);
  assert.strictEqual(cavablar.length, 1);
  assert.strictEqual(cavablar[0].type, WORLDV2_QLOBAL_AXTARIS_CAVAB);
  assert.strictEqual(cavablar[0].success, true);
  assert.strictEqual(cavablar[0].info.found, true);
  assert.strictEqual(cavablar[0].info.stateId, 1);
  assert.strictEqual(cavablar[0].info.globalNode.nodeId, 'state_1');
  assert.strictEqual(cavablar[0].payloadJson, JSON.stringify(cavablar[0].info));

  cavablar.length = 0;

  await handler({
    type: WORLDV2_QLOBAL_AXTARIS_SORGU,
    msg: { stateCode: '999' },
    ws: { _authedPlayerId: 'Oyuncu-1' },
    send,
    nowMs: () => 987654323,
  });
  assert.strictEqual(cavablar[0].success, true);
  assert.strictEqual(cavablar[0].info.found, false);
  assert.strictEqual(cavablar[0].info.stateId, 999);

  cavablar.length = 0;

  await handler({
    type: WORLDV2_QLOBAL_AXTARIS_SORGU,
    msg: { stateCode: 'abc' },
    ws: { _authedPlayerId: 'Oyuncu-1' },
    send,
    nowMs: () => 987654324,
  });
  assert.strictEqual(cavablar[0].success, false);
  assert.strictEqual(cavablar[0].errorCode, 'WORLDV2_GLOBAL_SEARCH_INVALID');

  assert.throws(
    () => worldV2QlobalProductionHandleriYarat({ topologiyaXeritesi: {} }),
    /null və ya Map/,
  );

  const evvelkiRelease = process.env.PLAY_MARKET_RELEASE_TARIXI;
  const releaseMs = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
  process.env.PLAY_MARKET_RELEASE_TARIXI = new Date(releaseMs).toISOString();

  try {
    const realCavablar = [];
    const realHandler = worldV2QlobalProductionHandleriYarat({
      metadataAl: async () => [],
      topologiyaXeritesi,
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

    assert.deepStrictEqual(real.info.connections, [
      {
        connectionId: 'topologiya_1_2',
        fromStateId: 1,
        toStateId: 2,
      },
    ]);

    assert.strictEqual(real.payloadJson, JSON.stringify(real.info));
  } finally {
    if (evvelkiRelease === undefined) {
      delete process.env.PLAY_MARKET_RELEASE_TARIXI;
    } else {
      process.env.PLAY_MARKET_RELEASE_TARIXI = evvelkiRelease;
    }
  }

  console.log('✓ WorldV2 Qlobal production handler read-only/auth/layout/topologiya/axtarış testləri keçdi.');
}

module.exports = run();
