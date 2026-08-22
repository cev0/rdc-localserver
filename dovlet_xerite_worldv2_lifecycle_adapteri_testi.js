'use strict';

const assert = require('assert');

const {
  GUN_MS,
  DOVLET_DOVR_MS,
  PREZIDENT_ACILMA_MS,
  dovletLifecycleMelumatiniAl,
  dovletAcilibmi,
  dovletPlanliVaxtlariniAl,
  qonsuDovletLifecycleStatusunuAl,
  qonsuTopologiyasiniLifecycleIleHazirla,
  acilmisDovletIdleriniAl,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const { DOVLET_KECID_STATUSU } = require('./dovlet_xerite_worldv2_qaydalari');

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

const RELEASE_MS = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
const RELEASE_ISO = new Date(RELEASE_MS).toISOString();

test('Release günü yalnız Dövlət #1 aktivdir', () => {
  envIle(RELEASE_ISO, () => {
    const info = dovletLifecycleMelumatiniAl(RELEASE_MS);
    assert.strictEqual(info.releaseConfigured, true);
    assert.strictEqual(info.activeStateId, 1);
    assert.deepStrictEqual(acilmisDovletIdleriniAl(RELEASE_MS), [1]);
  });
});

test('60 gün tamam olmadan Dövlət #2 bağlı qalır', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS - 1;
    assert.strictEqual(dovletAcilibmi(1, now), true);
    assert.strictEqual(dovletAcilibmi(2, now), false);
  });
});

test('Tam 60 gün sonra Dövlət #2 açılır', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const info = dovletLifecycleMelumatiniAl(now);

    assert.strictEqual(info.activeStateId, 2);
    assert.strictEqual(dovletAcilibmi(2, now), true);
    assert.strictEqual(dovletAcilibmi(3, now), false);
    assert.deepStrictEqual(acilmisDovletIdleriniAl(now), [1, 2]);
  });
});

test('Dövlət #3 ikinci 60 günlük dövr tamam olanda açılır', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + (2 * DOVLET_DOVR_MS);
    assert.deepStrictEqual(acilmisDovletIdleriniAl(now), [1, 2, 3]);
  });
});

test('Prezident mərkəzi hər Dövlətin başlanğıcından 30 gün sonra planlanır', () => {
  envIle(RELEASE_ISO, () => {
    const state1 = dovletPlanliVaxtlariniAl(1, RELEASE_MS);
    const state2 = dovletPlanliVaxtlariniAl(2, RELEASE_MS);

    assert.strictEqual(state1.stateOpensAtMs, RELEASE_MS);
    assert.strictEqual(state1.presidentUnlockAtMs, RELEASE_MS + PREZIDENT_ACILMA_MS);

    assert.strictEqual(state2.stateOpensAtMs, RELEASE_MS + DOVLET_DOVR_MS);
    assert.strictEqual(
      state2.presidentUnlockAtMs,
      RELEASE_MS + DOVLET_DOVR_MS + PREZIDENT_ACILMA_MS,
    );
  });
});

test('Açılmış qonşu Dövlət sərhəd keçidinə icazə verir', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const qonsu = qonsuDovletLifecycleStatusunuAl(2, now);

    assert.strictEqual(qonsu.stateId, 2);
    assert.strictEqual(qonsu.acilib, true);
    assert.strictEqual(qonsu.status, DOVLET_KECID_STATUSU.KECIDE_ACIQDIR);
    assert.strictEqual(qonsu.kecideIcazeVar, true);
  });
});

test('Gələcək qonşu Dövlət bağlıdır və keçidə icazə vermir', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const qonsu = qonsuDovletLifecycleStatusunuAl(3, now);

    assert.strictEqual(qonsu.stateId, 3);
    assert.strictEqual(qonsu.acilib, false);
    assert.strictEqual(qonsu.status, DOVLET_KECID_STATUSU.BAGLIDIR);
    assert.strictEqual(qonsu.kecideIcazeVar, false);
    assert.strictEqual(qonsu.stateOpensAtMs, RELEASE_MS + (2 * DOVLET_DOVR_MS));
  });
});

test('Qonşu Dövlət yoxdursa lifecycle heç bir ID uydurmur', () => {
  envIle(RELEASE_ISO, () => {
    const qonsu = qonsuDovletLifecycleStatusunuAl(null, RELEASE_MS);
    assert.strictEqual(qonsu.stateId, null);
    assert.strictEqual(qonsu.status, DOVLET_KECID_STATUSU.QONSU_YOXDUR);
    assert.strictEqual(qonsu.kecideIcazeVar, false);
  });
});

test('Topologiya yalnız verilən qonşu ID-lərini lifecycle statusu ilə doldurur', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const qonsular = qonsuTopologiyasiniLifecycleIleHazirla({
      simal: null,
      serq: 2,
      cenub: 3,
      qerb: null,
    }, now);

    assert.deepStrictEqual(qonsular.simal, {
      stateId: null,
      status: DOVLET_KECID_STATUSU.QONSU_YOXDUR,
    });
    assert.deepStrictEqual(qonsular.serq, {
      stateId: 2,
      status: DOVLET_KECID_STATUSU.KECIDE_ACIQDIR,
    });
    assert.deepStrictEqual(qonsular.cenub, {
      stateId: 3,
      status: DOVLET_KECID_STATUSU.BAGLIDIR,
    });
    assert.deepStrictEqual(qonsular.qerb, {
      stateId: null,
      status: DOVLET_KECID_STATUSU.QONSU_YOXDUR,
    });
  });
});

test('Natamam topologiya səssiz qonşu fərziyyəsi etmir', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => qonsuTopologiyasiniLifecycleIleHazirla({
      simal: null,
      serq: 2,
      cenub: 3,
    }, RELEASE_MS));
  });
});

test('Release tarixi konfiqurasiya edilməyibsə legacy fallback yalnız Dövlət #1-dir', () => {
  envIle(null, () => {
    assert.strictEqual(dovletAcilibmi(1, RELEASE_MS), true);
    assert.strictEqual(dovletAcilibmi(2, RELEASE_MS), false);
    assert.deepStrictEqual(acilmisDovletIdleriniAl(RELEASE_MS), [1]);

    const vaxt = dovletPlanliVaxtlariniAl(1, RELEASE_MS);
    assert.strictEqual(vaxt.scheduleConfigured, false);
    assert.strictEqual(vaxt.stateOpensAtMs, null);
    assert.strictEqual(vaxt.presidentUnlockAtMs, null);
  });
});

test('Etibarsız Dövlət ID-si açıq sayılmır', () => {
  envIle(RELEASE_ISO, () => {
    assert.strictEqual(dovletAcilibmi(0, RELEASE_MS), false);
    assert.strictEqual(dovletAcilibmi(-1, RELEASE_MS), false);
    assert.strictEqual(dovletAcilibmi('abc', RELEASE_MS), false);
  });
});

test('Server vaxtı etibarsızdırsa adapter fail-closed davranır', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => dovletLifecycleMelumatiniAl(Number.NaN));
    assert.throws(() => dovletLifecycleMelumatiniAl(-1));
  });
});

test('Gün sabiti gözlənilən millisekund dəyəridir', () => {
  assert.strictEqual(GUN_MS, 24 * 60 * 60 * 1000);
});

console.log('\nWorldV2 Dövlət lifecycle adapter testləri uğurla tamamlandı.');
