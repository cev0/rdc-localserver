'use strict';

const assert = require('assert');
const {
  worldV2ProductionObyektHandleriYarat,
} = require('./dovlet_xerite_worldv2_obyekt_production_handler');

async function run() {
  const gonderilenler = [];
  const sabitVaxt = 1770000000000;

  const handler = worldV2ProductionObyektHandleriYarat({
    dovletBazalariniAl: async (stateId) => ({
      stateId,
      bases: [
        {
          playerId: 'oyuncu_1',
          baseX: 321,
          baseZ: 856,
          allianceName: 'Qartal',
        },
        {
          playerId: 'oyuncu_2',
          baseX: 600,
          baseZ: 500,
          allianceName: '',
        },
      ],
    }),
    stateBerpaOlunub: () => true,
    stateBerpaEt: async () => {},
  });

  const esasKontekst = {
    type: 'state_map_v2_objects_request',
    ws: { _authedPlayerId: 'oyuncu_1' },
    nowMs: () => sabitVaxt,
    getOrCreatePlayerState: () => ({
      worldPlacement: {
        stateId: 1,
        baseX: 321,
        baseZ: 856,
      },
    }),
    send: (_ws, payload) => gonderilenler.push(payload),
  };

  const emalOlundu = await handler(esasKontekst);
  assert.strictEqual(emalOlundu, true);
  assert.strictEqual(gonderilenler.length, 1);

  const cavab = gonderilenler[0];
  assert.strictEqual(cavab.type, 'state_map_v2_objects_result');
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.stateId, 1);
  assert.ok(cavab.info);
  assert.strictEqual(cavab.info.version, 2);
  assert.strictEqual(cavab.info.stateId, 1);
  assert.strictEqual(cavab.info.bases.length, 2);
  assert.strictEqual(cavab.info.bases[0].playerId, 'oyuncu_1');
  assert.strictEqual(cavab.info.bases[0].x, 321);
  assert.strictEqual(cavab.info.bases[0].y, 856);
  assert.strictEqual(cavab.info.bases[0].isSelf, true);
  assert.strictEqual(cavab.info.bases[0].allianceId, null);
  assert.strictEqual(cavab.info.bases[0].allianceName, 'Qartal');
  assert.strictEqual(cavab.info.bases[1].isSelf, false);
  assert.strictEqual(cavab.info.layerStatus.basesConnected, true);
  assert.strictEqual(cavab.info.layerStatus.resourcesConnected, false);
  assert.strictEqual(cavab.serverTimeUnixMs, sabitVaxt);

  const aidiyyetsiz = await handler({
    ...esasKontekst,
    type: 'state_map_static_request',
  });
  assert.strictEqual(aidiyyetsiz, false);

  const authCavablari = [];
  const authNetice = await handler({
    ...esasKontekst,
    ws: {},
    send: (_ws, payload) => authCavablari.push(payload),
  });
  assert.strictEqual(authNetice, true);
  assert.strictEqual(authCavablari.length, 1);
  assert.strictEqual(authCavablari[0].success, false);
  assert.strictEqual(authCavablari[0].errorCode, 'WORLDV2_AUTH_REQUIRED');

  const dbXetaCavablari = [];
  const dbXetaHandler = worldV2ProductionObyektHandleriYarat({
    dovletBazalariniAl: async () => {
      throw new Error('DB test xətası');
    },
    stateBerpaOlunub: () => true,
    stateBerpaEt: async () => {},
  });

  const dbNetice = await dbXetaHandler({
    ...esasKontekst,
    send: (_ws, payload) => dbXetaCavablari.push(payload),
  });
  assert.strictEqual(dbNetice, true);
  assert.strictEqual(dbXetaCavablari.length, 1);
  assert.strictEqual(dbXetaCavablari[0].success, false);
  assert.strictEqual(dbXetaCavablari[0].errorCode, 'WORLDV2_OBJECTS_READ_FAILED');

  console.log('WorldV2 production obyekt handler testi OK');
}

module.exports = run();
