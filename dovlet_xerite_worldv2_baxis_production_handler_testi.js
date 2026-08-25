'use strict';

const assert = require('assert');
const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');
const {
  WORLDV2_BAXIS_SORGU,
  WORLDV2_BAXIS_CAVAB,
  WORLDV2_PREZIDENT_FOKUS_SORGU,
  WORLDV2_PREZIDENT_FOKUS_CAVAB,
  WORLDV2_EVE_QAYIT_SORGU,
  WORLDV2_EVE_QAYIT_CAVAB,
  worldV2BaxisProductionHandleriYarat,
} = require('./dovlet_xerite_worldv2_baxis_production_handler');

async function run() {
  const topologiyaXeritesi = topologiyaniYoxlaVeHazirla([
    { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
    { stateId: 2, simal: null, serq: null, cenub: null, qerb: 1 },
  ]);

  const playerState = {
    worldPlacement: { stateId: 1, baseX: 321, baseZ: 654 },
  };
  const ilkin = JSON.parse(JSON.stringify(playerState));
  const gonderilenler = [];

  const handler = worldV2BaxisProductionHandleriYarat({
    topologiyaXeritesi,
    dovletAcilibmiFn: stateId => Number(stateId) <= 2,
  });

  const esas = {
    ws: { _authedPlayerId: 'PLAYER-1' },
    nowMs: () => 123456,
    getOrCreatePlayerState: () => playerState,
    send: (_ws, cavab) => gonderilenler.push(cavab),
  };

  let emal = await handler({
    ...esas,
    type: WORLDV2_BAXIS_SORGU,
    msg: { viewedStateId: 2, mode: 'far' },
  });
  assert.strictEqual(emal, true);
  let cavab = gonderilenler.pop();
  assert.strictEqual(cavab.type, WORLDV2_BAXIS_CAVAB);
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.info.homeStateId, 1);
  assert.strictEqual(cavab.info.viewedStateId, 2);
  assert.deepStrictEqual(cavab.info.viewCoordinate, { x: 600, y: 600 });
  assert.strictEqual(cavab.info.mode, 'far');
  assert.strictEqual(cavab.info.readOnlyView, true);
  assert.strictEqual(cavab.info.persistentPlacementMutated, false);
  assert.strictEqual(cavab.info.neighbors.qerb.stateId, 1);
  assert.deepStrictEqual(playerState, ilkin);

  emal = await handler({
    ...esas,
    type: WORLDV2_PREZIDENT_FOKUS_SORGU,
    msg: { viewedStateId: 2 },
  });
  assert.strictEqual(emal, true);
  cavab = gonderilenler.pop();
  assert.strictEqual(cavab.type, WORLDV2_PREZIDENT_FOKUS_CAVAB);
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.info.mode, 'near');
  assert.deepStrictEqual(cavab.info.viewCoordinate, { x: 600, y: 600 });
  assert.deepStrictEqual(playerState, ilkin);

  emal = await handler({
    ...esas,
    type: WORLDV2_EVE_QAYIT_SORGU,
    msg: {},
  });
  assert.strictEqual(emal, true);
  cavab = gonderilenler.pop();
  assert.strictEqual(cavab.type, WORLDV2_EVE_QAYIT_CAVAB);
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.info.viewedStateId, 1);
  assert.deepStrictEqual(cavab.info.viewCoordinate, { x: 321, y: 654 });
  assert.strictEqual(cavab.info.mode, 'near');
  assert.strictEqual(cavab.info.viewingHomeState, true);
  assert.deepStrictEqual(playerState, ilkin);

  await handler({
    ...esas,
    type: WORLDV2_BAXIS_SORGU,
    msg: { viewedStateId: 3, mode: 'far' },
  });
  cavab = gonderilenler.pop();
  assert.strictEqual(cavab.success, false);
  assert.strictEqual(cavab.errorCode, 'WORLDV2_VIEW_STATE_LOCKED');
  assert.deepStrictEqual(playerState, ilkin);

  await handler({
    ...esas,
    type: WORLDV2_BAXIS_SORGU,
    msg: { viewedStateId: 1, mode: 'global' },
  });
  cavab = gonderilenler.pop();
  assert.strictEqual(cavab.success, false);
  assert.strictEqual(cavab.errorCode, 'WORLDV2_VIEW_INVALID');

  await handler({
    ...esas,
    ws: {},
    type: WORLDV2_BAXIS_SORGU,
    msg: { viewedStateId: 1, mode: 'near' },
  });
  cavab = gonderilenler.pop();
  assert.strictEqual(cavab.success, false);
  assert.strictEqual(cavab.errorCode, 'WORLDV2_AUTH_REQUIRED');

  emal = await handler({ ...esas, type: 'unrelated_request', msg: {} });
  assert.strictEqual(emal, false);

  console.log('✓ WorldV2 read-only Viewed State production handler testi keçdi');
}

module.exports = run();
