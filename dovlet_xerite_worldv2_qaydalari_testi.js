'use strict';

const assert = require('assert');

const {
  DOVLET_XERITESI_V2,
  DOVLET_KECID_STATUSU,
  koordinatEtibarlidir,
  koordinatiSerheddeSaxla,
  merkezeMesafe,
  serhedIstiqametiEtibarlidir,
  kecidStatusuEtibarlidir,
  qonsuDovletMelumatiYarat,
  worldV2XeriteMelumatiYarat,
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

test('WorldV2 xəritə sərhədi 0..1200 daxil olmaqla qəbul edilir', () => {
  assert.strictEqual(koordinatEtibarlidir(0, 0), true);
  assert.strictEqual(koordinatEtibarlidir(1200, 0), true);
  assert.strictEqual(koordinatEtibarlidir(0, 1200), true);
  assert.strictEqual(koordinatEtibarlidir(1200, 1200), true);
});

test('Xəritə mərkəzi 600:600-dür', () => {
  assert.strictEqual(DOVLET_XERITESI_V2.merkezX, 600);
  assert.strictEqual(DOVLET_XERITESI_V2.merkezY, 600);
  assert.strictEqual(koordinatEtibarlidir(600, 600), true);
  assert.strictEqual(merkezeMesafe(600, 600), 0);
});

test('Sərhəddən kənar koordinatlar etibarsızdır', () => {
  assert.strictEqual(koordinatEtibarlidir(-1, 600), false);
  assert.strictEqual(koordinatEtibarlidir(600, -1), false);
  assert.strictEqual(koordinatEtibarlidir(1200.01, 600), false);
  assert.strictEqual(koordinatEtibarlidir(600, 1200.01), false);
  assert.strictEqual(koordinatEtibarlidir(null, 600), false);
  assert.strictEqual(koordinatEtibarlidir(600, undefined), false);
  assert.strictEqual(koordinatEtibarlidir(Number.NaN, 600), false);
  assert.strictEqual(koordinatEtibarlidir(Number.POSITIVE_INFINITY, 600), false);
});

test('Rəqəm şəklində gələn string koordinatlar təhlükəsiz çevrilir', () => {
  assert.strictEqual(koordinatEtibarlidir('600', '600'), true);
  assert.strictEqual(koordinatEtibarlidir('', '600'), false);
  assert.strictEqual(koordinatEtibarlidir('abc', '600'), false);
});

test('Koordinat clamp 0..1200 sərhədində saxlayır', () => {
  assert.deepStrictEqual(
    koordinatiSerheddeSaxla(-50, 1300),
    { x: 0, y: 1200 },
  );

  assert.deepStrictEqual(
    koordinatiSerheddeSaxla(350.5, 850.25),
    { x: 350.5, y: 850.25 },
  );

  assert.strictEqual(koordinatiSerheddeSaxla(null, 500), null);
});

test('Prezident mərkəzi authoritative olaraq 600:600 və 30 gündür', () => {
  assert.strictEqual(DOVLET_XERITESI_V2.prezidentMerkezi.x, 600);
  assert.strictEqual(DOVLET_XERITESI_V2.prezidentMerkezi.y, 600);
  assert.strictEqual(DOVLET_XERITESI_V2.prezidentMerkezi.acilmaGunSayi, 30);
  assert.strictEqual(DOVLET_XERITESI_V2.prezidentMerkezi.mudafieTopSayi, 4);
});

test('Prezident müdafiə istiqamətləri dörd tərəfi saxlayır', () => {
  assert.deepStrictEqual(
    [...DOVLET_XERITESI_V2.prezidentMerkezi.mudafieIstiqametleri],
    ['simal', 'serq', 'cenub', 'qerb'],
  );
});

test('Dəqiq müdafiə top koordinatları hələ özbaşına yaradılmır', () => {
  const melumat = worldV2XeriteMelumatiYarat();
  assert.strictEqual(melumat.prezidentMerkezi.mudafieKoordinatlari, null);
});

test('Sərhəd istiqaməti yalnız dörd qəbul edilən istiqamətdən biridir', () => {
  assert.strictEqual(serhedIstiqametiEtibarlidir('simal'), true);
  assert.strictEqual(serhedIstiqametiEtibarlidir('serq'), true);
  assert.strictEqual(serhedIstiqametiEtibarlidir('cenub'), true);
  assert.strictEqual(serhedIstiqametiEtibarlidir('qerb'), true);
  assert.strictEqual(serhedIstiqametiEtibarlidir('yuxari-sag'), false);
});

test('Keçid statusları yalnız müəyyən edilmiş enum-dan qəbul edilir', () => {
  Object.values(DOVLET_KECID_STATUSU).forEach((status) => {
    assert.strictEqual(kecidStatusuEtibarlidir(status), true);
  });
  assert.strictEqual(kecidStatusuEtibarlidir('ACIQ'), false);
});

test('Açıq qonşu Dövlət keçid icazəsi yaradır', () => {
  const qonsu = qonsuDovletMelumatiYarat({
    istiqamet: 'serq',
    stateId: 2,
    status: DOVLET_KECID_STATUSU.KECIDE_ACIQDIR,
  });

  assert.deepStrictEqual(qonsu, {
    istiqamet: 'serq',
    stateId: 2,
    status: DOVLET_KECID_STATUSU.KECIDE_ACIQDIR,
    kecideIcazeVar: true,
  });
});

test('Bağlı qonşu Dövlət keçid icazəsi vermir', () => {
  const qonsu = qonsuDovletMelumatiYarat({
    istiqamet: 'qerb',
    stateId: 3,
    status: DOVLET_KECID_STATUSU.BAGLIDIR,
  });

  assert.strictEqual(qonsu.kecideIcazeVar, false);
});

test('Qonşu yoxdursa stateId null olmalıdır', () => {
  const qonsu = qonsuDovletMelumatiYarat({
    istiqamet: 'simal',
    stateId: null,
    status: DOVLET_KECID_STATUSU.QONSU_YOXDUR,
  });

  assert.strictEqual(qonsu.stateId, null);
  assert.strictEqual(qonsu.kecideIcazeVar, false);

  assert.throws(() => {
    qonsuDovletMelumatiYarat({
      istiqamet: 'simal',
      stateId: 5,
      status: DOVLET_KECID_STATUSU.QONSU_YOXDUR,
    });
  });
});

test('Qonşu mövcuddursa düzgün müsbət tam stateId tələb olunur', () => {
  assert.throws(() => {
    qonsuDovletMelumatiYarat({
      istiqamet: 'cenub',
      stateId: null,
      status: DOVLET_KECID_STATUSU.BAGLIDIR,
    });
  });

  assert.throws(() => {
    qonsuDovletMelumatiYarat({
      istiqamet: 'cenub',
      stateId: 1.5,
      status: DOVLET_KECID_STATUSU.BAGLIDIR,
    });
  });
});

console.log('\nWorldV2 Dövlət xəritəsi qayda testləri uğurla tamamlandı.');
