'use strict';

const assert = require('assert');

const {
  WORLDV2_MESAJ_NOVLERI,
  DOVLET_KECID_STATUSU,
  bazaKoordinatiniProtokolaCevir,
  qonsulariHazirla,
  worldV2BaslangicPayloadHazirla,
  serhedKecidiPayloadHazirla,
} = require('./dovlet_xerite_worldv2_payload');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

function numuneQonsular() {
  return {
    simal: {
      stateId: null,
      status: DOVLET_KECID_STATUSU.QONSU_YOXDUR,
    },
    serq: {
      stateId: 2,
      status: DOVLET_KECID_STATUSU.KECIDE_ACIQDIR,
    },
    cenub: {
      stateId: 3,
      status: DOVLET_KECID_STATUSU.BAGLIDIR,
    },
    qerb: {
      stateId: 4,
      status: DOVLET_KECID_STATUSU.ACILIB_KECID_BAGLIDIR,
    },
  };
}

test('WorldV2 mesaj adları legacy endpoint-lərdən ayrıdır', () => {
  assert.strictEqual(WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU, 'state_map_v2_info_request');
  assert.strictEqual(WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU, 'state_map_v2_objects_request');
  assert.strictEqual(WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU, 'state_map_v2_border_transition_request');
  assert.strictEqual(WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_SORGU, 'global_states_v2_request');
});

test('Persistent baseZ protokolda y koordinatına çevrilir', () => {
  assert.deepStrictEqual(
    bazaKoordinatiniProtokolaCevir(479, 938),
    { x: 479, y: 938 },
  );
});

test('0:0 və 1200:1200 baza koordinatı müqavilə daxilindədir', () => {
  assert.deepStrictEqual(bazaKoordinatiniProtokolaCevir(0, 0), { x: 0, y: 0 });
  assert.deepStrictEqual(bazaKoordinatiniProtokolaCevir(1200, 1200), { x: 1200, y: 1200 });
});

test('WorldV2 xaricində baza koordinatı rədd edilir', () => {
  assert.throws(() => bazaKoordinatiniProtokolaCevir(-1, 500));
  assert.throws(() => bazaKoordinatiniProtokolaCevir(500, 1201));
  assert.throws(() => bazaKoordinatiniProtokolaCevir('abc', 500));
});

test('Bütün dörd qonşu istiqaməti authoritative statusla hazırlanır', () => {
  const qonsular = qonsulariHazirla(numuneQonsular());

  assert.strictEqual(qonsular.simal.stateId, null);
  assert.strictEqual(qonsular.simal.kecideIcazeVar, false);

  assert.strictEqual(qonsular.serq.stateId, 2);
  assert.strictEqual(qonsular.serq.kecideIcazeVar, true);

  assert.strictEqual(qonsular.cenub.stateId, 3);
  assert.strictEqual(qonsular.cenub.kecideIcazeVar, false);

  assert.strictEqual(qonsular.qerb.stateId, 4);
  assert.strictEqual(qonsular.qerb.kecideIcazeVar, false);
});

test('Qonşu istiqamətlərdən biri yoxdursa payload səssiz fərziyyə etmir', () => {
  const qonsular = numuneQonsular();
  delete qonsular.qerb;
  assert.throws(() => qonsulariHazirla(qonsular));
});

test('Başlanğıc payload kamera üçün oyunçu bazasını verir', () => {
  const payload = worldV2BaslangicPayloadHazirla({
    stateId: 1,
    playerId: 'oyuncu_1',
    baseX: 479,
    baseZ: 938,
    qonsular: numuneQonsular(),
    prezident: {
      unlocked: false,
      active: false,
      unlockAtUnixMs: 123456789,
    },
    serverTimeUnixMs: 987654321,
  });

  assert.strictEqual(payload.version, 2);
  assert.strictEqual(payload.stateId, 1);
  assert.strictEqual(payload.playerId, 'oyuncu_1');
  assert.deepStrictEqual(payload.playerBase, { x: 479, y: 938 });
  assert.strictEqual(payload.serverTimeUnixMs, 987654321);
});

test('Başlanğıc payload 1200×1200 koordinat domenini və 600:600 mərkəzi verir', () => {
  const payload = worldV2BaslangicPayloadHazirla({
    stateId: 5,
    playerId: 'oyuncu_5',
    baseX: 300,
    baseZ: 700,
    qonsular: numuneQonsular(),
  });

  assert.deepStrictEqual(payload.map, {
    minX: 0,
    maxX: 1200,
    minY: 0,
    maxY: 1200,
    centerX: 600,
    centerY: 600,
  });

  assert.strictEqual(payload.presidentCenter.x, 600);
  assert.strictEqual(payload.presidentCenter.y, 600);
  assert.strictEqual(payload.presidentCenter.unlockAfterDays, 30);
  assert.strictEqual(payload.presidentCenter.defenseBuildingCount, 4);
});

test('Prezident müdafiə top koordinatları hələ uydurulmur', () => {
  const payload = worldV2BaslangicPayloadHazirla({
    stateId: 1,
    playerId: 'oyuncu_1',
    baseX: 100,
    baseZ: 100,
    qonsular: numuneQonsular(),
  });

  assert.strictEqual(payload.presidentCenter.defenseCoordinates, null);
});

test('Bağlı Dövlət sərhəd keçidinə icazə vermir', () => {
  const payload = serhedKecidiPayloadHazirla({
    currentStateId: 1,
    istiqamet: 'cenub',
    qonsu: {
      stateId: 3,
      status: DOVLET_KECID_STATUSU.BAGLIDIR,
    },
  });

  assert.strictEqual(payload.currentStateId, 1);
  assert.strictEqual(payload.neighborStateId, 3);
  assert.strictEqual(payload.transitionAllowed, false);
  assert.strictEqual(payload.entryCoordinate, null);
});

test('Açıq Dövlət sərhəd keçidinə icazə verir, amma giriş koordinatı hələ təyin edilmir', () => {
  const payload = serhedKecidiPayloadHazirla({
    currentStateId: 1,
    istiqamet: 'serq',
    qonsu: {
      stateId: 2,
      status: DOVLET_KECID_STATUSU.KECIDE_ACIQDIR,
    },
  });

  assert.strictEqual(payload.neighborStateId, 2);
  assert.strictEqual(payload.transitionAllowed, true);
  assert.strictEqual(payload.entryCoordinate, null);
});

console.log('\nWorldV2 Dövlət xəritəsi payload testləri uğurla tamamlandı.');
