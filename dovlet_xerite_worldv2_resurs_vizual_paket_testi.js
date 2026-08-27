'use strict';

const assert = require('assert');
const {
  worldV2ProductionObyektHandleriYarat,
  worldV2ResursVizualPaketiHazirla,
} = require('./dovlet_xerite_worldv2_obyekt_production_handler');

async function run() {
  const birbasaPaket = worldV2ResursVizualPaketiHazirla([
    {
      index: 7,
      resourceId: 'water',
      level: 5,
      x: 321,
      y: 856,
      spawnSerial: 3,
    },
  ]);

  assert.strictEqual(birbasaPaket.say, 1);
  assert.deepStrictEqual(birbasaPaket.i, [7]);
  assert.deepStrictEqual(birbasaPaket.r, [1]);
  assert.deepStrictEqual(birbasaPaket.l, [5]);
  assert.deepStrictEqual(birbasaPaket.x, [321]);
  assert.deepStrictEqual(birbasaPaket.y, [856]);
  assert.deepStrictEqual(birbasaPaket.s, [3]);

  const gonderilenler = [];
  let providerTelebi = 0;

  const handler = worldV2ProductionObyektHandleriYarat({
    dovletBazalariniAl: async () => ({
      stateId: 1,
      bases: [{ playerId: 'oyuncu_1', baseX: 100, baseZ: 100 }],
    }),
    dovletResurslariniAl: async (_stateId, _bases, _nowMs, requestedResourceCount) => {
      providerTelebi = requestedResourceCount;
      return {
        stateId: 1,
        provisionedResourceCount: 3000,
        activeResourceCount: 2,
        physicalCapacityReached: false,
        resources: [
          {
            index: 1,
            resourceId: 'food',
            level: 3,
            x: 111,
            y: 222,
            spawnSerial: 1,
          },
          {
            index: 2,
            resourceId: 'fuel',
            level: 6,
            x: 333,
            y: 444,
            spawnSerial: 4,
          },
        ],
      };
    },
    stateBerpaOlunub: () => true,
    stateBerpaEt: async () => {},
    dovletAcilibmiFn: () => true,
  });

  const ws = { _authedPlayerId: 'oyuncu_1' };
  const emalOlundu = await handler({
    type: 'state_map_v2_objects_request',
    msg: {
      requestedResourceCount: 10000,
      resourceVisualOnly: true,
    },
    ws,
    nowMs: () => 1770000000000,
    getOrCreatePlayerState: () => ({
      worldPlacement: { stateId: 1, baseX: 100, baseZ: 100 },
    }),
    send: (_ws, payload) => gonderilenler.push(payload),
  });

  assert.strictEqual(emalOlundu, true);
  assert.strictEqual(providerTelebi, 10000);
  assert.strictEqual(gonderilenler.length, 1);

  const cavab = gonderilenler[0];
  assert.strictEqual(cavab.type, 'state_map_v2_resource_visuals_result');
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.stateId, 1);
  assert.strictEqual(cavab.homeStateId, 1);
  assert.strictEqual(cavab.readOnlyView, false);
  assert.strictEqual(cavab.say, 2);
  assert.deepStrictEqual(cavab.i, [1, 2]);
  assert.deepStrictEqual(cavab.r, [0, 4]);
  assert.deepStrictEqual(cavab.l, [3, 6]);
  assert.deepStrictEqual(cavab.x, [111, 333]);
  assert.deepStrictEqual(cavab.y, [222, 444]);
  assert.deepStrictEqual(cavab.s, [1, 4]);
  assert.strictEqual(cavab.info, undefined);

  // Vizual-only sorğu sonrakı tam obyekt sorğularının say cache-ni çirkləndirməməlidir.
  assert.strictEqual(ws._worldV2RequestedResourceCount, undefined);

  console.log('WorldV2 resurs vizual paket testi OK');
}

module.exports = run();
