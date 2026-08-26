'use strict';

const assert = require('assert');
const {
  worldV2ProductionObyektHandleriYarat,
} = require('./dovlet_xerite_worldv2_obyekt_production_handler');

async function run() {
  const gonderilenler = [];
  const sabitVaxt = 1770000000000;
  const oxunanStateIdleri = [];
  const oxunanResursStateIdleri = [];

  const handler = worldV2ProductionObyektHandleriYarat({
    dovletBazalariniAl: async (stateId) => {
      oxunanStateIdleri.push(stateId);

      return {
        stateId,
        bases: [
          {
            playerId: stateId === 1 ? 'oyuncu_1' : 'oyuncu_2',
            baseX: stateId === 1 ? 321 : 700,
            baseZ: stateId === 1 ? 856 : 400,
            allianceName: stateId === 1 ? 'Qartal' : 'Şimal',
          },
          {
            playerId: stateId === 1 ? 'oyuncu_2' : 'oyuncu_3',
            baseX: 600,
            baseZ: 500,
            allianceName: '',
          },
        ],
      };
    },
    dovletResurslariniAl: async (stateId, bases) => {
      oxunanResursStateIdleri.push(stateId);
      assert.ok(Array.isArray(bases));
      return {
        stateId,
        resources: [
          {
            targetType: 'resource',
            targetId: `state_${stateId}_worldv2_resource_1_spawn_1`,
            nodeId: `state_${stateId}_worldv2_resource_1`,
            stateId,
            index: 1,
            zoneId: 'outer',
            resourceId: 'food',
            level: 3,
            x: stateId === 1 ? 1100 : 100,
            y: stateId === 1 ? 600 : 700,
            fullAmount: 30000,
            remainingAmount: 30000,
            gatherSeconds: 1200,
            available: true,
            occupiedByPlayerId: '',
            occupiedByConvoyId: '',
            occupiedUntilMs: 0,
            respawnAtMs: 0,
            presidentCenter: false,
            spawnSerial: 1,
          },
        ],
      };
    },
    stateBerpaOlunub: () => true,
    stateBerpaEt: async () => {},
    dovletAcilibmiFn: (stateId) => stateId <= 2,
  });

  const esasKontekst = {
    type: 'state_map_v2_objects_request',
    msg: {},
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
  assert.strictEqual(cavab.homeStateId, 1);
  assert.strictEqual(cavab.viewedStateId, 1);
  assert.strictEqual(cavab.readOnlyView, false);
  assert.strictEqual(cavab.persistentPlacementMutated, false);
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
  assert.strictEqual(cavab.info.layerStatus.resourcesConnected, true);
  assert.strictEqual(cavab.info.resources.length, 1);
  assert.strictEqual(cavab.info.resources[0].resourceId, 'food');
  assert.strictEqual(cavab.info.resources[0].remainingAmount, 30000);
  assert.strictEqual(cavab.serverTimeUnixMs, sabitVaxt);
  assert.deepStrictEqual(oxunanStateIdleri, [1]);
  assert.deepStrictEqual(oxunanResursStateIdleri, [1]);

  const baxilanCavablar = [];
  const baxilanNetice = await handler({
    ...esasKontekst,
    type: 'state_map_v2_view_objects_request',
    msg: { viewedStateId: 2 },
    send: (_ws, payload) => baxilanCavablar.push(payload),
  });

  assert.strictEqual(baxilanNetice, true);
  assert.strictEqual(baxilanCavablar.length, 1);

  const baxilanCavab = baxilanCavablar[0];
  assert.strictEqual(baxilanCavab.type, 'state_map_v2_view_objects_result');
  assert.strictEqual(baxilanCavab.success, true);
  assert.strictEqual(baxilanCavab.homeStateId, 1);
  assert.strictEqual(baxilanCavab.viewedStateId, 2);
  assert.strictEqual(baxilanCavab.stateId, 2);
  assert.strictEqual(baxilanCavab.readOnlyView, true);
  assert.strictEqual(baxilanCavab.persistentPlacementMutated, false);
  assert.strictEqual(baxilanCavab.info.stateId, 2);
  assert.strictEqual(baxilanCavab.info.bases[0].x, 700);
  assert.strictEqual(baxilanCavab.info.bases[0].y, 400);
  assert.strictEqual(baxilanCavab.info.bases[0].isSelf, false);
  assert.strictEqual(baxilanCavab.info.resources.length, 1);
  assert.strictEqual(baxilanCavab.info.resources[0].stateId, 2);
  assert.deepStrictEqual(oxunanStateIdleri, [1, 2]);
  assert.deepStrictEqual(oxunanResursStateIdleri, [1, 2]);

  const bagliCavablar = [];
  const bagliNetice = await handler({
    ...esasKontekst,
    type: 'state_map_v2_view_objects_request',
    msg: { viewedStateId: 3 },
    send: (_ws, payload) => bagliCavablar.push(payload),
  });

  assert.strictEqual(bagliNetice, true);
  assert.strictEqual(bagliCavablar.length, 1);
  assert.strictEqual(bagliCavablar[0].success, false);
  assert.strictEqual(bagliCavablar[0].errorCode, 'WORLDV2_VIEW_STATE_LOCKED');
  assert.strictEqual(bagliCavablar[0].homeStateId, 1);
  assert.strictEqual(bagliCavablar[0].viewedStateId, 3);
  assert.strictEqual(bagliCavablar[0].readOnlyView, true);
  assert.strictEqual(bagliCavablar[0].persistentPlacementMutated, false);
  assert.deepStrictEqual(oxunanStateIdleri, [1, 2]);
  assert.deepStrictEqual(oxunanResursStateIdleri, [1, 2]);

  const etibarsizCavablar = [];
  const etibarsizNetice = await handler({
    ...esasKontekst,
    type: 'state_map_v2_view_objects_request',
    msg: { viewedStateId: 0 },
    send: (_ws, payload) => etibarsizCavablar.push(payload),
  });

  assert.strictEqual(etibarsizNetice, true);
  assert.strictEqual(etibarsizCavablar.length, 1);
  assert.strictEqual(etibarsizCavablar[0].success, false);
  assert.strictEqual(etibarsizCavablar[0].errorCode, 'WORLDV2_VIEW_INVALID');
  assert.strictEqual(etibarsizCavablar[0].persistentPlacementMutated, false);

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
    dovletResurslariniAl: async () => ({ resources: [] }),
    stateBerpaOlunub: () => true,
    stateBerpaEt: async () => {},
    dovletAcilibmiFn: () => true,
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
