'use strict';

const assert = require('assert');
const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');
const {
  worldV2SerhedProductionHandleriYarat,
} = require('./dovlet_xerite_worldv2_serhed_production_handler');

async function run() {
  const topologiya = topologiyaniYoxlaVeHazirla([
    { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
    { stateId: 2, simal: null, serq: null, cenub: null, qerb: 1 },
  ]);

  const handler = worldV2SerhedProductionHandleriYarat({
    topologiyaXeritesi: topologiya,
    dovletAcilibmiFn: () => true,
  });

  const gonderilenler = [];
  const esasKontekst = {
    type: 'state_map_v2_border_transition_request',
    msg: {
      viewedStateId: 2,
      direction: 'qerb',
      x: 400,
      y: 777,
    },
    ws: { _authedPlayerId: 'oyuncu_1' },
    nowMs: () => 1770000000000,
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
  assert.strictEqual(cavab.type, 'state_map_v2_border_transition_result');
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.checkedOnly, true);
  assert.strictEqual(cavab.mutatedPlayerState, false);
  assert.ok(cavab.info);
  assert.strictEqual(cavab.info.version, 2);
  assert.strictEqual(cavab.info.homeStateId, 1);
  assert.strictEqual(cavab.info.viewedStateId, 2);
  assert.strictEqual(cavab.info.currentStateId, 2);
  assert.strictEqual(cavab.info.direction, 'qerb');
  assert.strictEqual(cavab.info.neighborStateId, 1);
  assert.strictEqual(cavab.info.neighborOpened, true);
  assert.strictEqual(cavab.info.transitionAllowed, true);
  assert.strictEqual(cavab.info.readOnlyView, true);
  assert.strictEqual(cavab.info.persistentPlacementMutated, false);
  assert.deepStrictEqual(cavab.info.entryCoordinate, {
    x: 1176,
    y: 777,
  });

  const xetaCavablari = [];
  const xetaEmal = await handler({
    ...esasKontekst,
    msg: {
      ...esasKontekst.msg,
      x: -1,
    },
    send: (_ws, payload) => xetaCavablari.push(payload),
  });

  assert.strictEqual(xetaEmal, true);
  assert.strictEqual(xetaCavablari.length, 1);
  assert.strictEqual(xetaCavablari[0].success, false);
  assert.strictEqual(xetaCavablari[0].mutatedPlayerState, false);
  assert.strictEqual(xetaCavablari[0].errorCode, 'WORLDV2_VIEW_INVALID');

  const aidiyyetsiz = await handler({
    ...esasKontekst,
    type: 'state_map_v2_info_request',
  });
  assert.strictEqual(aidiyyetsiz, false);

  console.log('WorldV2 production sərhəd keçidi handler testi OK');
}

module.exports = run();
