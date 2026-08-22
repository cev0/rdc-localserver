'use strict';

const assert = require('assert');

const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');

const {
  WORLDV2_MESAJ_NOVLERI,
} = require('./dovlet_xerite_worldv2_payload');

const {
  SERHED_KECID_XETA_KODLARI,
} = require('./dovlet_xerite_worldv2_serhed_xidmeti');

const {
  worldV2HandleriYarat,
} = require('./dovlet_xerite_worldv2_handler');

const topologiya = topologiyaniYoxlaVeHazirla([
  { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
  { stateId: 2, simal: null, serq: null, cenub: null, qerb: 1 },
]);

async function yoxla(direction) {
  const gonderilenler = [];
  const handler = worldV2HandleriYarat({ topologiyaXeritesi: topologiya });

  const kontekst = {
    type: WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU,
    msg: direction === undefined ? {} : { direction },
    ws: { _authedPlayerId: 'player_1' },
    nowMs: () => Date.UTC(2026, 2, 5),
    getOrCreatePlayerState: () => ({
      worldPlacement: {
        stateId: 1,
        baseX: 600,
        baseZ: 600,
      },
    }),
    send: (_ws, cavab) => gonderilenler.push(cavab),
  };

  const emalOlundu = await handler(kontekst);
  assert.strictEqual(emalOlundu, true);
  assert.strictEqual(gonderilenler.length, 1);
  assert.strictEqual(gonderilenler[0].success, false);
  assert.strictEqual(
    gonderilenler[0].errorCode,
    SERHED_KECID_XETA_KODLARI.ETIBARSIZ_ISTIQAMET,
  );
  assert.strictEqual(gonderilenler[0].info, undefined);
}

const icra = Promise.resolve()
  .then(() => yoxla(undefined))
  .then(() => {
    console.log('✓ Border transition direction olmadıqda WORLDV2_INVALID_DIRECTION qaytarır');
    return yoxla('north');
  })
  .then(() => {
    console.log('✓ Border transition naməlum direction üçün WORLDV2_INVALID_DIRECTION qaytarır');
  });

module.exports = icra;
