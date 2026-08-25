'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  WORLDV2_INFO_SORGU,
  WORLDV2_INFO_CAVAB,
  worldV2InfoProductionHandleriYarat,
} = require('./dovlet_xerite_worldv2_info_production_handler');
const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');

const TOPOLOGIYA_STATUSU = 'TOPOLOGIYA_MUEYYEN_DEYIL';

async function run() {
  const cavablar = [];
  let berpaCagirildi = 0;

  const handler = worldV2InfoProductionHandleriYarat({
    stateBerpaOlunub: () => false,
    stateBerpaEt: async () => {
      berpaCagirildi += 1;
      return true;
    },
  });

  const kontekst = {
    type: WORLDV2_INFO_SORGU,
    msg: { type: WORLDV2_INFO_SORGU },
    ws: { _authedPlayerId: 'player_test_1' },
    nowMs: () => 1787547600000,
    getOrCreatePlayerState: () => ({
      worldPlacement: {
        stateId: 1,
        baseX: 321,
        baseZ: 856,
      },
    }),
    send: (_ws, payload) => cavablar.push(payload),
  };

  const emalOlundu = await handler(kontekst);
  assert.strictEqual(emalOlundu, true, 'Info request production handler tərəfindən emal olunmalıdır.');
  assert.strictEqual(berpaCagirildi, 1, 'State hazır deyilsə mövcud persistence bridge ilə bərpa edilməlidir.');
  assert.strictEqual(cavablar.length, 1, 'Bir info cavabı göndərilməlidir.');

  const cavab = cavablar[0];
  assert.strictEqual(cavab.type, WORLDV2_INFO_CAVAB);
  assert.strictEqual(cavab.success, true);
  assert.strictEqual(cavab.playerId, 'player_test_1');
  assert.ok(cavab.info, 'Info payload olmalıdır.');
  assert.strictEqual(cavab.info.version, 2);
  assert.strictEqual(cavab.info.stateId, 1);
  assert.deepStrictEqual(cavab.info.playerBase, { x: 321, y: 856 });
  assert.strictEqual(cavab.info.map.minX, 0);
  assert.strictEqual(cavab.info.map.maxX, 1200);
  assert.strictEqual(cavab.info.map.minY, 0);
  assert.strictEqual(cavab.info.map.maxY, 1200);
  assert.strictEqual(cavab.info.map.centerX, 600);
  assert.strictEqual(cavab.info.map.centerY, 600);

  assert.strictEqual(cavab.info.presidentCenter.x, 600);
  assert.strictEqual(cavab.info.presidentCenter.y, 600);
  assert.strictEqual(cavab.info.presidentCenter.unlockAfterDays, 30);
  assert.deepStrictEqual(
    cavab.info.presidentCenter.defenseCoordinates,
    [
      { slot: 'yuxari', x: 596, y: 596 },
      { slot: 'sag', x: 605, y: 596 },
      { slot: 'sol', x: 596, y: 605 },
      { slot: 'asagi', x: 605, y: 605 },
    ],
  );

  for (const istiqamet of ['simal', 'serq', 'cenub', 'qerb']) {
    const qonsu = cavab.info.neighbors[istiqamet];
    assert.ok(qonsu, `${istiqamet} statusu olmalıdır.`);
    assert.strictEqual(qonsu.stateId, null, 'Topologiya müəyyən deyil statusunda State ID uydurulmamalıdır.');
    assert.strictEqual(qonsu.status, TOPOLOGIYA_STATUSU);
    assert.strictEqual(qonsu.kecideIcazeVar, false, 'Topologiya müəyyən deyil statusu fail-closed olmalıdır.');
  }

  // Authoritative topology verildikdə Near info eyni mənbədən real qonşu ID-sini
  // götürməlidir. Lifecycle həmin Dövlətin açıq/bağlı statusunu ayrıca hesablayır;
  // test real deployment tarixindən asılı olmamaq üçün statusun konkret dəyərini
  // yox, topology ID-sinin qorunmasını və fallback statusunun itməsini yoxlayır.
  const topologiya = topologiyaniYoxlaVeHazirla([
    { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
    { stateId: 2, simal: null, serq: null, cenub: null, qerb: 1 },
  ]);
  const topologiyaCavablari = [];
  const topologiyaHandler = worldV2InfoProductionHandleriYarat({
    stateBerpaOlunub: () => true,
    stateBerpaEt: async () => true,
    topologiyaXeritesi: topologiya,
  });

  await topologiyaHandler({
    ...kontekst,
    send: (_ws, payload) => topologiyaCavablari.push(payload),
  });

  assert.strictEqual(topologiyaCavablari.length, 1);
  assert.strictEqual(topologiyaCavablari[0].success, true);
  assert.strictEqual(topologiyaCavablari[0].info.neighbors.serq.stateId, 2);
  assert.notStrictEqual(
    topologiyaCavablari[0].info.neighbors.serq.status,
    TOPOLOGIYA_STATUSU,
    'Authoritative topology veriləndə Near info fallback topology statusunda qalmamalıdır.',
  );
  assert.strictEqual(topologiyaCavablari[0].info.neighbors.qerb.stateId, null);

  assert.doesNotThrow(() => JSON.parse(cavab.payloadJson));

  const unrelated = await handler({
    ...kontekst,
    type: 'state_map_v2_objects_request',
  });
  assert.strictEqual(unrelated, false, 'Info handler başqa WorldV2 mesajını tutmamalıdır.');

  const authCavablari = [];
  const authNeticesi = await handler({
    ...kontekst,
    ws: {},
    send: (_ws, payload) => authCavablari.push(payload),
  });
  assert.strictEqual(authNeticesi, true);
  assert.strictEqual(authCavablari[0].success, false);
  assert.strictEqual(authCavablari[0].errorCode, 'WORLDV2_AUTH_REQUIRED');

  assert.throws(
    () => worldV2InfoProductionHandleriYarat({ topologiyaXeritesi: {} }),
    /null və ya Map/,
    'Info handler yanlış topology dependency-sini fail-fast rədd etməlidir.',
  );

  const routeMetni = fs.readFileSync(
    path.join(__dirname, 'server_missiya_genisletme_v2.js'),
    'utf8',
  );

  assert.ok(
    routeMetni.includes('dovletXeriteWorldV2InfoProductionMesajiniEmalEt'),
    'Production gameplay zənciri WorldV2 info handler-i import etməlidir.',
  );
  assert.ok(
    routeMetni.includes('await dovletXeriteWorldV2InfoProductionMesajiniEmalEt(kontekst)'),
    'Production gameplay zənciri WorldV2 info handler-i çağırmalıdır.',
  );

  console.log('✓ WorldV2 state info production handler testi keçdi');
}

module.exports = run();
