'use strict';

const assert = require('assert');
const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');

const {
  WORLDV2_MESAJ_NOVLERI,
} = require('./dovlet_xerite_worldv2_payload');

const {
  WORLDV2_XETA_KODLARI,
  worldV2HandleriYarat,
} = require('./dovlet_xerite_worldv2_handler');

function asyncTest(basliq, funksiya) {
  return Promise.resolve()
    .then(funksiya)
    .then(() => console.log(`✓ ${basliq}`))
    .catch((xeta) => {
      console.error(`✗ ${basliq}`);
      throw xeta;
    });
}

function envIle(releaseTarixi, funksiya) {
  const evvelki = process.env.PLAY_MARKET_RELEASE_TARIXI;
  if (releaseTarixi == null) delete process.env.PLAY_MARKET_RELEASE_TARIXI;
  else process.env.PLAY_MARKET_RELEASE_TARIXI = releaseTarixi;

  return Promise.resolve()
    .then(funksiya)
    .finally(() => {
      if (evvelki === undefined) delete process.env.PLAY_MARKET_RELEASE_TARIXI;
      else process.env.PLAY_MARKET_RELEASE_TARIXI = evvelki;
    });
}

const RELEASE_MS = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
const RELEASE_ISO = new Date(RELEASE_MS).toISOString();
const GUN_MS = 24 * 60 * 60 * 1000;
const NOW_MS = RELEASE_MS + (60 * GUN_MS);

function topologiyaHazirla() {
  return topologiyaniYoxlaVeHazirla([
    { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
    { stateId: 2, simal: null, serq: null, cenub: null, qerb: 1 },
  ]);
}

function kontekstHazirla({
  type,
  msg = {},
  authed = true,
  state = null,
  nowMs = NOW_MS,
} = {}) {
  const gonderilenler = [];
  const oyunState = state || {
    worldPlacement: {
      stateId: 1,
      baseX: 420,
      baseZ: 880,
    },
  };

  return {
    kontekst: {
      type,
      msg,
      ws: authed ? { _authedPlayerId: 'player_1' } : {},
      nowMs: () => nowMs,
      getOrCreatePlayerState: () => oyunState,
      send: (_ws, cavab) => gonderilenler.push(cavab),
    },
    gonderilenler,
    oyunState,
  };
}

async function run() {
  await asyncTest('WorldV2 handler aid olmayan mesajı emal etmir', async () => {
    const handler = worldV2HandleriYarat({ topologiyaXeritesi: topologiyaHazirla() });
    const { kontekst, gonderilenler } = kontekstHazirla({ type: 'unrelated_message' });
    const emalOlundu = await handler(kontekst);

    assert.strictEqual(emalOlundu, false);
    assert.strictEqual(gonderilenler.length, 0);
  });

  await asyncTest('WorldV2 sorğusu autentifikasiyasız fail-closed cavab verir', async () => {
    const handler = worldV2HandleriYarat({ topologiyaXeritesi: topologiyaHazirla() });
    const { kontekst, gonderilenler } = kontekstHazirla({
      type: WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU,
      authed: false,
    });

    assert.strictEqual(await handler(kontekst), true);
    assert.strictEqual(gonderilenler.length, 1);
    assert.strictEqual(gonderilenler[0].success, false);
    assert.strictEqual(
      gonderilenler[0].errorCode,
      WORLDV2_XETA_KODLARI.AUTH_TELEB_OLUNUR,
    );
  });

  await asyncTest('WorldV2 placement mənfi koordinatda fail-closed MOVQE_YOXDUR qaytarır', async () => {
    const handler = worldV2HandleriYarat({ topologiyaXeritesi: topologiyaHazirla() });
    const { kontekst, gonderilenler } = kontekstHazirla({
      type: WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU,
      state: {
        worldPlacement: {
          stateId: 1,
          baseX: -1,
          baseZ: 600,
        },
      },
    });

    await handler(kontekst);
    assert.strictEqual(gonderilenler[0].success, false);
    assert.strictEqual(
      gonderilenler[0].errorCode,
      WORLDV2_XETA_KODLARI.MOVQE_YOXDUR,
    );
  });

  await asyncTest('WorldV2 placement 1200 sərhədini aşdıqda fail-closed MOVQE_YOXDUR qaytarır', async () => {
    const handler = worldV2HandleriYarat({ topologiyaXeritesi: topologiyaHazirla() });
    const { kontekst, gonderilenler } = kontekstHazirla({
      type: WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU,
      state: {
        worldPlacement: {
          stateId: 1,
          baseX: 1200,
          baseZ: 1200.01,
        },
      },
    });

    await handler(kontekst);
    assert.strictEqual(gonderilenler[0].success, false);
    assert.strictEqual(
      gonderilenler[0].errorCode,
      WORLDV2_XETA_KODLARI.MOVQE_YOXDUR,
    );
  });

  await asyncTest('WorldV2 info payload authoritative baza, qonşu və Prezident datasını qaytarır', async () => {
    await envIle(RELEASE_ISO, async () => {
      const handler = worldV2HandleriYarat({
        topologiyaXeritesi: topologiyaHazirla(),
        stateRuntimeAl: async () => ({
          stateId: 1,
          centerBuilding: {
            x: 600,
            z: 600,
            unlockAtMs: RELEASE_MS + (30 * GUN_MS),
            occupiedByPlayerId: 'president_1',
            occupiedByAllianceId: 'alliance_9',
            occupiedAtMs: RELEASE_MS + (40 * GUN_MS),
          },
        }),
      });

      const { kontekst, gonderilenler } = kontekstHazirla({
        type: WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU,
      });

      await handler(kontekst);
      const cavab = gonderilenler[0];

      assert.strictEqual(cavab.success, true);
      assert.strictEqual(cavab.info.version, 2);
      assert.strictEqual(cavab.info.map.maxX, 1200);
      assert.strictEqual(cavab.info.map.maxY, 1200);
      assert.deepStrictEqual(cavab.info.playerBase, { x: 420, y: 880 });
      assert.strictEqual(cavab.info.neighbors.serq.stateId, 2);
      assert.strictEqual(cavab.info.neighbors.serq.kecideIcazeVar, true);
      assert.strictEqual(cavab.info.neighbors.simal.stateId, null);
      assert.strictEqual(
        cavab.info.presidentCenter.status.presidentPlayerId,
        'president_1',
      );
      assert.strictEqual(
        cavab.info.presidentCenter.status.presidentAllianceId,
        'alliance_9',
      );
      assert.strictEqual(cavab.info.presidentCenter.status.unlocked, true);
    });
  });

  await asyncTest('Sərhəd transition sorğusu yalnız check edir, player state-i dəyişmir', async () => {
    await envIle(RELEASE_ISO, async () => {
      const handler = worldV2HandleriYarat({ topologiyaXeritesi: topologiyaHazirla() });
      const { kontekst, gonderilenler, oyunState } = kontekstHazirla({
        type: WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU,
        msg: { direction: 'serq' },
      });
      const evvel = JSON.stringify(oyunState);

      await handler(kontekst);
      const cavab = gonderilenler[0];

      assert.strictEqual(cavab.success, true);
      assert.strictEqual(cavab.checkedOnly, true);
      assert.strictEqual(cavab.mutatedPlayerState, false);
      assert.strictEqual(cavab.info.neighborStateId, 2);
      assert.strictEqual(cavab.info.transitionAllowed, true);
      assert.strictEqual(cavab.info.entryCoordinate, null);
      assert.strictEqual(JSON.stringify(oyunState), evvel);
    });
  });

  await asyncTest('WorldV2 obyekt sorğusu production placement-ə qoşulmadan fail-closed qalır', async () => {
    const handler = worldV2HandleriYarat({ topologiyaXeritesi: topologiyaHazirla() });
    const { kontekst, gonderilenler } = kontekstHazirla({
      type: WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU,
    });

    await handler(kontekst);
    assert.strictEqual(gonderilenler[0].success, false);
    assert.strictEqual(
      gonderilenler[0].errorCode,
      WORLDV2_XETA_KODLARI.OBYEKTLER_HAZIR_DEYIL,
    );
  });

  await asyncTest('Qlobal WorldV2 sorğusu lifecycle-a görə yalnız açılmış Dövlətləri qaytarır', async () => {
    await envIle(RELEASE_ISO, async () => {
      const handler = worldV2HandleriYarat({
        topologiyaXeritesi: topologiyaHazirla(),
        qlobalMetadataAl: async () => [
          { stateId: 1, presidentPlayerId: 'p1' },
          { stateId: 2, presidentPlayerId: 'p2' },
          { stateId: 3, presidentPlayerId: 'future' },
        ],
      });

      const { kontekst, gonderilenler } = kontekstHazirla({
        type: WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_SORGU,
      });

      await handler(kontekst);
      const cavab = gonderilenler[0];

      assert.strictEqual(cavab.success, true);
      assert.deepStrictEqual(cavab.info.states.map((x) => x.stateId), [1, 2]);
      assert.deepStrictEqual(
        cavab.info.states.map((x) => x.presidentPlayerId),
        ['p1', 'p2'],
      );
    });
  });

  await asyncTest('Topologiya verilməyibsə info sorğusu fail-closed olur', async () => {
    await envIle(RELEASE_ISO, async () => {
      const handler = worldV2HandleriYarat();
      const { kontekst, gonderilenler } = kontekstHazirla({
        type: WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU,
      });

      await handler(kontekst);
      assert.strictEqual(gonderilenler[0].success, false);
      assert.strictEqual(
        gonderilenler[0].errorCode,
        WORLDV2_XETA_KODLARI.TOPOLOGIYA_YOXDUR,
      );
    });
  });
}

const icra = run().then(() => {
  console.log('\nWorldV2 handler testləri uğurla tamamlandı.');
});

module.exports = icra;
