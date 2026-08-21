'use strict';

const assert = require('assert');

const {
  DOVLET_DOVR_MS,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');

const {
  SERHED_KECID_SEBEBI,
  serhedKecidiniYoxla,
} = require('./dovlet_xerite_worldv2_serhed_xidmeti');

const {
  DOVLET_KECID_STATUSU,
} = require('./dovlet_xerite_worldv2_qaydalari');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

function envIle(releaseTarixi, funksiya) {
  const evvelki = process.env.PLAY_MARKET_RELEASE_TARIXI;

  try {
    if (releaseTarixi === null) {
      delete process.env.PLAY_MARKET_RELEASE_TARIXI;
    } else {
      process.env.PLAY_MARKET_RELEASE_TARIXI = releaseTarixi;
    }
    funksiya();
  } finally {
    if (evvelki === undefined) {
      delete process.env.PLAY_MARKET_RELEASE_TARIXI;
    } else {
      process.env.PLAY_MARKET_RELEASE_TARIXI = evvelki;
    }
  }
}

// Yalnız test topologiyasıdır, real oyun State yerləşməsi deyil.
function testTopologiyasi() {
  return topologiyaniYoxlaVeHazirla([
    { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
    { stateId: 2, simal: null, serq: null, cenub: null, qerb: 1 },
  ]);
}

const RELEASE_MS = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
const RELEASE_ISO = new Date(RELEASE_MS).toISOString();

test('Qonşu Dövlət yoxdur: keçid fail-closed olur', () => {
  envIle(RELEASE_ISO, () => {
    const netice = serhedKecidiniYoxla({
      topologiyaXeritesi: testTopologiyasi(),
      currentStateId: 1,
      istiqamet: 'simal',
      nowMs: RELEASE_MS,
    });

    assert.strictEqual(netice.neighborStateId, null);
    assert.strictEqual(netice.status, DOVLET_KECID_STATUSU.QONSU_YOXDUR);
    assert.strictEqual(netice.reason, SERHED_KECID_SEBEBI.QONSU_YOXDUR);
    assert.strictEqual(netice.transitionAllowed, false);
    assert.strictEqual(netice.entryCoordinate, null);
  });
});

test('Gələcək Dövlət sərhəddə bağlıdır', () => {
  envIle(RELEASE_ISO, () => {
    const netice = serhedKecidiniYoxla({
      topologiyaXeritesi: testTopologiyasi(),
      currentStateId: 1,
      istiqamet: 'serq',
      nowMs: RELEASE_MS,
    });

    assert.strictEqual(netice.neighborStateId, 2);
    assert.strictEqual(netice.neighborOpened, false);
    assert.strictEqual(netice.status, DOVLET_KECID_STATUSU.BAGLIDIR);
    assert.strictEqual(netice.reason, SERHED_KECID_SEBEBI.QONSU_BAGLIDIR);
    assert.strictEqual(netice.transitionAllowed, false);
    assert.strictEqual(netice.neighborOpensAtMs, RELEASE_MS + DOVLET_DOVR_MS);
  });
});

test('60 gün sonra eyni qonşu Dövlət keçidə açılır', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const netice = serhedKecidiniYoxla({
      topologiyaXeritesi: testTopologiyasi(),
      currentStateId: 1,
      istiqamet: 'serq',
      nowMs: now,
    });

    assert.strictEqual(netice.neighborStateId, 2);
    assert.strictEqual(netice.neighborOpened, true);
    assert.strictEqual(netice.status, DOVLET_KECID_STATUSU.KECIDE_ACIQDIR);
    assert.strictEqual(netice.reason, SERHED_KECID_SEBEBI.ICAZE_VAR);
    assert.strictEqual(netice.transitionAllowed, true);
    assert.strictEqual(netice.entryCoordinate, null);
  });
});

test('Qərbdən geri keçid də topologiyadan tapılır', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const netice = serhedKecidiniYoxla({
      topologiyaXeritesi: testTopologiyasi(),
      currentStateId: 2,
      istiqamet: 'qerb',
      nowMs: now,
    });

    assert.strictEqual(netice.neighborStateId, 1);
    assert.strictEqual(netice.transitionAllowed, true);
  });
});

test('Etibarsız istiqamət rədd edilir', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => serhedKecidiniYoxla({
      topologiyaXeritesi: testTopologiyasi(),
      currentStateId: 1,
      istiqamet: 'sag-yuxari',
      nowMs: RELEASE_MS,
    }));
  });
});

test('Topologiyada olmayan cari State rədd edilir', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => serhedKecidiniYoxla({
      topologiyaXeritesi: testTopologiyasi(),
      currentStateId: 99,
      istiqamet: 'serq',
      nowMs: RELEASE_MS,
    }));
  });
});

console.log('\nWorldV2 sərhəd keçidi xidməti testləri uğurla tamamlandı.');
