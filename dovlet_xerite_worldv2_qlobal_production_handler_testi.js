'use strict';

const assert = require('assert');
const {
  WORLDV2_QLOBAL_SORGU,
  WORLDV2_QLOBAL_CAVAB,
  worldV2QlobalProductionHandleriYarat,
} = require('./dovlet_xerite_worldv2_qlobal_production_handler');

async function run() {
  const cavablar = [];
  const send = (_ws, payload) => cavablar.push(payload);

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

  console.log('✓ WorldV2 Qlobal production handler read-only/auth testləri keçdi.');
}

module.exports = run();
