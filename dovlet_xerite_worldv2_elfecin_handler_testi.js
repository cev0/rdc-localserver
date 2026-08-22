'use strict';

const assert = require('assert');
const {
  WORLDV2_ELFECIN_LIMIT,
  elfecinMutasiyasiniTetbiqEt,
  worldV2ElfecinHandleriYarat,
} = require('./dovlet_xerite_worldv2_elfecin_handler');

async function run() {
  const sabitVaxt = 1770000000000;
  const state = {
    playerId: 'oyuncu_1',
    worldPlacement: {
      stateId: 1,
      baseX: 321,
      baseZ: 856,
    },
  };

  const gonderilenler = [];
  const handler = worldV2ElfecinHandleriYarat({
    stateBerpaOlunub: () => true,
    stateBerpaEt: async () => {},
    stateMutasiyaEt: async (_playerId, cariState, emeliyyat) => {
      return await emeliyyat(cariState);
    },
  });

  function kontekst(type, msg = {}) {
    return {
      type,
      msg,
      ws: { _authedPlayerId: 'oyuncu_1' },
      nowMs: () => sabitVaxt,
      getOrCreatePlayerState: () => state,
      send: (_ws, payload) => gonderilenler.push(payload),
    };
  }

  let emalOlundu = await handler(kontekst('state_map_v2_elfecinler_request'));
  assert.strictEqual(emalOlundu, true);
  assert.strictEqual(gonderilenler.length, 1);
  assert.strictEqual(gonderilenler[0].success, true);
  assert.strictEqual(gonderilenler[0].stateId, 1);
  assert.deepStrictEqual(gonderilenler[0].elfecinler, []);

  gonderilenler.length = 0;
  emalOlundu = await handler(kontekst('state_map_v2_elfecin_elave_request', {
    targetPlayerId: 'TEST_RAQIB_001',
    x: 349,
    y: 832,
    basliq: 'Test Komandir',
  }));

  assert.strictEqual(emalOlundu, true);
  assert.strictEqual(gonderilenler.length, 1);
  assert.strictEqual(gonderilenler[0].type, 'state_map_v2_elfecin_elave_result');
  assert.strictEqual(gonderilenler[0].success, true);
  assert.strictEqual(gonderilenler[0].action, 'add');
  assert.strictEqual(gonderilenler[0].elfecinler.length, 1);
  assert.strictEqual(gonderilenler[0].elfecinler[0].targetPlayerId, 'TEST_RAQIB_001');
  assert.strictEqual(gonderilenler[0].elfecinler[0].x, 349);
  assert.strictEqual(gonderilenler[0].elfecinler[0].y, 832);
  assert.strictEqual(gonderilenler[0].elfecinler[0].basliq, 'Test Komandir');
  assert.strictEqual(state.worldV2Elfecinler.length, 1);

  // Eyni baza yenidən əlavə olunanda dublikat yaratmamalıdır.
  gonderilenler.length = 0;
  await handler(kontekst('state_map_v2_elfecin_elave_request', {
    targetPlayerId: 'TEST_RAQIB_001',
    x: 350,
    y: 831,
    basliq: 'Yenilənmiş',
  }));
  assert.strictEqual(state.worldV2Elfecinler.length, 1);
  assert.strictEqual(state.worldV2Elfecinler[0].x, 350);
  assert.strictEqual(state.worldV2Elfecinler[0].basliq, 'Yenilənmiş');

  gonderilenler.length = 0;
  await handler(kontekst('state_map_v2_elfecin_sil_request', {
    targetPlayerId: 'TEST_RAQIB_001',
  }));
  assert.strictEqual(gonderilenler[0].success, true);
  assert.strictEqual(gonderilenler[0].action, 'remove');
  assert.deepStrictEqual(gonderilenler[0].elfecinler, []);
  assert.deepStrictEqual(state.worldV2Elfecinler, []);

  const yanlisKoord = elfecinMutasiyasiniTetbiqEt(
    state,
    'state_map_v2_elfecin_elave_request',
    { targetPlayerId: 'oyuncu_2', x: 1201, y: 10 },
    'oyuncu_1',
    sabitVaxt,
  );
  assert.strictEqual(yanlisKoord.success, false);
  assert.strictEqual(yanlisKoord.errorCode, 'WORLDV2_ELFECIN_COORDINATE_INVALID');

  const ozBaza = elfecinMutasiyasiniTetbiqEt(
    state,
    'state_map_v2_elfecin_elave_request',
    { targetPlayerId: 'oyuncu_1', x: 321, y: 856 },
    'oyuncu_1',
    sabitVaxt,
  );
  assert.strictEqual(ozBaza.success, false);
  assert.strictEqual(ozBaza.errorCode, 'WORLDV2_ELFECIN_SELF_NOT_ALLOWED');

  state.worldV2Elfecinler = [];
  for (let i = 0; i < WORLDV2_ELFECIN_LIMIT; i++) {
    state.worldV2Elfecinler.push({
      stateId: 1,
      targetPlayerId: 'limit_' + i,
      x: i,
      y: i,
      basliq: '',
      yaradilibMs: sabitVaxt,
      yenilenibMs: sabitVaxt,
    });
  }

  const limit = elfecinMutasiyasiniTetbiqEt(
    state,
    'state_map_v2_elfecin_elave_request',
    { targetPlayerId: 'limit_yeni', x: 100, y: 100 },
    'oyuncu_1',
    sabitVaxt,
  );
  assert.strictEqual(limit.success, false);
  assert.strictEqual(limit.errorCode, 'WORLDV2_ELFECIN_LIMIT_REACHED');

  const authCavablari = [];
  const authNetice = await handler({
    ...kontekst('state_map_v2_elfecinler_request'),
    ws: {},
    send: (_ws, payload) => authCavablari.push(payload),
  });
  assert.strictEqual(authNetice, true);
  assert.strictEqual(authCavablari.length, 1);
  assert.strictEqual(authCavablari[0].success, false);
  assert.strictEqual(authCavablari[0].errorCode, 'WORLDV2_AUTH_REQUIRED');

  const aidiyyetsiz = await handler(kontekst('state_map_v2_objects_request'));
  assert.strictEqual(aidiyyetsiz, false);

  console.log('WorldV2 persistent əlfəcin handler testi OK');
}

module.exports = run();
