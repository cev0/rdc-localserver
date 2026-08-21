'use strict';

const assert = require('assert');

const {
  WORLDV2_GORUNUS_SEVIYYESI,
  gorunusQaydasiniAl,
  uzaqGorunusdeBazaGorunurmu,
  uzaqGorunusBazaMarkerleriniSec,
} = require('./dovlet_xerite_worldv2_lod_qaydalari');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

test('Yaxın və orta görünüşdə əsas local obyekt kateqoriyaları qalır', () => {
  const yaxin = gorunusQaydasiniAl(WORLDV2_GORUNUS_SEVIYYESI.YAXIN_3D);
  const orta = gorunusQaydasiniAl(WORLDV2_GORUNUS_SEVIYYESI.ORTA_LOD);

  assert.strictEqual(yaxin.bases, true);
  assert.strictEqual(yaxin.resources, true);
  assert.strictEqual(yaxin.enemies, true);

  assert.strictEqual(orta.bases, true);
  assert.strictEqual(orta.resources, true);
  assert.strictEqual(orta.enemies, true);
});

test('Uzaq strateji görünüşdə resurs və adi düşmən kateqoriyaları gizlənir', () => {
  const uzaq = gorunusQaydasiniAl(WORLDV2_GORUNUS_SEVIYYESI.UZAQ_STRATEJI);

  assert.strictEqual(uzaq.bases, true);
  assert.strictEqual(uzaq.resources, false);
  assert.strictEqual(uzaq.enemies, false);
  assert.strictEqual(uzaq.camps, false);
  assert.strictEqual(uzaq.convoys, false);
});

test('Öz baza allianceId olmasa belə uzaq görünüşdə qalır', () => {
  assert.strictEqual(uzaqGorunusdeBazaGorunurmu({
    viewerPlayerId: 'oyuncu_1',
    viewerAllianceId: null,
    base: {
      playerId: 'oyuncu_1',
      allianceName: 'Display Adı',
    },
  }), true);
});

test('Eyni stabil allianceId olan başqa baza görünür', () => {
  assert.strictEqual(uzaqGorunusdeBazaGorunurmu({
    viewerPlayerId: 'oyuncu_1',
    viewerAllianceId: 'ittifaq_55',
    base: {
      playerId: 'oyuncu_2',
      allianceId: 'ittifaq_55',
    },
  }), true);
});

test('Fərqli allianceId olan baza gizlənir', () => {
  assert.strictEqual(uzaqGorunusdeBazaGorunurmu({
    viewerPlayerId: 'oyuncu_1',
    viewerAllianceId: 'ittifaq_55',
    base: {
      playerId: 'oyuncu_2',
      allianceId: 'ittifaq_77',
    },
  }), false);
});

test('Eyni allianceName stabil ID əvəzi kimi qəbul edilmir', () => {
  assert.strictEqual(uzaqGorunusdeBazaGorunurmu({
    viewerPlayerId: 'oyuncu_1',
    viewerAllianceId: 'ittifaq_55',
    base: {
      playerId: 'oyuncu_2',
      allianceName: 'Eyni Ad',
      allianceId: null,
    },
  }), false);
});

test('Viewer allianceId yoxdursa başqa bazalar alliance adına görə göstərilmir', () => {
  assert.strictEqual(uzaqGorunusdeBazaGorunurmu({
    viewerPlayerId: 'oyuncu_1',
    viewerAllianceId: null,
    base: {
      playerId: 'oyuncu_2',
      allianceName: 'Eyni Ad',
      allianceId: null,
    },
  }), false);
});

test('Uzaq baza siyahısı yalnız öz baza və eyni allianceId üzvlərini saxlayır', () => {
  const netice = uzaqGorunusBazaMarkerleriniSec({
    viewerPlayerId: 'oyuncu_1',
    viewerAllianceId: 'ittifaq_55',
    bases: [
      { playerId: 'oyuncu_1', allianceId: null },
      { playerId: 'oyuncu_2', allianceId: 'ittifaq_55' },
      { playerId: 'oyuncu_3', allianceId: 'ittifaq_77' },
      { playerId: 'oyuncu_4', allianceName: 'Ittifaq 55' },
    ],
  });

  assert.deepStrictEqual(netice.map(x => x.playerId), ['oyuncu_1', 'oyuncu_2']);
});

test('Etibarsız görünüş səviyyəsi rədd edilir', () => {
  assert.throws(() => gorunusQaydasiniAl('ULTRA_FAR'));
});

console.log('\nWorldV2 LOD/görünürlük testləri uğurla tamamlandı.');
