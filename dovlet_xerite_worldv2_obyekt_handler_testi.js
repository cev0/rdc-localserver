'use strict';

const assert = require('assert');

const {
  WORLDV2_MESAJ_NOVLERI,
} = require('./dovlet_xerite_worldv2_payload');

const {
  worldV2HandleriYarat,
} = require('./dovlet_xerite_worldv2_handler');

async function run() {
  const gonderilenler = [];
  const NOW_MS = 1780000000000;

  const handler = worldV2HandleriYarat({
    dovletBazalariAl: async (stateId) => {
      assert.strictEqual(stateId, 1);

      return [
        {
          playerId: 'player_1',
          baseX: 321,
          baseZ: 856,
          allianceId: null,
          allianceName: 'A İttifaqı',
        },
        {
          playerId: 'player_2',
          baseX: 600,
          baseZ: 600,
          allianceId: 'stable-a2',
          allianceName: 'B İttifaqı',
        },
      ];
    },
  });

  const emalOlundu = await handler({
    type: WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU,
    msg: {},
    ws: { _authedPlayerId: 'player_1' },
    nowMs: () => NOW_MS,
    getOrCreatePlayerState: () => ({
      worldPlacement: {
        stateId: 1,
        baseX: 321,
        baseZ: 856,
      },
    }),
    send: (_ws, cavab) => gonderilenler.push(cavab),
  });

  assert.strictEqual(emalOlundu, true);
  assert.strictEqual(gonderilenler.length, 1);

  const cavab = gonderilenler[0];
  assert.strictEqual(cavab.type, WORLDV2_MESAJ_NOVLERI.OBYEKTLER_CAVAB);
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.playerId, 'player_1');
  assert.strictEqual(cavab.stateId, 1);
  assert.strictEqual(cavab.info.version, 2);
  assert.strictEqual(cavab.info.bases.length, 2);
  assert.deepStrictEqual(
    cavab.info.bases.map((x) => [x.playerId, x.x, x.y, x.isSelf]),
    [
      ['player_1', 321, 856, true],
      ['player_2', 600, 600, false],
    ],
  );
  assert.strictEqual(cavab.info.bases[0].allianceId, null);
  assert.strictEqual(cavab.info.bases[1].allianceId, 'stable-a2');
  assert.strictEqual(cavab.info.layerStatus.basesConnected, true);
  assert.strictEqual(cavab.info.layerStatus.resourcesConnected, false);

  const payloadJson = JSON.parse(cavab.payloadJson);
  assert.strictEqual(payloadJson.bases.length, 2);

  console.log('✓ WorldV2 obyekt handler real baza dependency-si ilə işləyir.');
}

const icra = run();
module.exports = icra;
