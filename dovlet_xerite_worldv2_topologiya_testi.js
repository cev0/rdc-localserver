'use strict';

const assert = require('assert');

const {
  topologiyaniYoxlaVeHazirla,
  dovletTopologiyasiniAl,
} = require('./dovlet_xerite_worldv2_topologiya');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

// Bu State ID-ləri yalnız validator test fixture-idir; oyun üçün real qonşuluq deyil.
function duzgunNumune() {
  return [
    { stateId: 1, simal: null, serq: 2, cenub: 3, qerb: null },
    { stateId: 2, simal: null, serq: null, cenub: 4, qerb: 1 },
    { stateId: 3, simal: 1, serq: 4, cenub: null, qerb: null },
    { stateId: 4, simal: 2, serq: null, cenub: null, qerb: 3 },
  ];
}

test('Qarşılıqlı dörd istiqamətli topologiya qəbul edilir', () => {
  const xerite = topologiyaniYoxlaVeHazirla(duzgunNumune());
  assert.strictEqual(xerite.size, 4);
  assert.deepStrictEqual(dovletTopologiyasiniAl(xerite, 1), {
    simal: null,
    serq: 2,
    cenub: 3,
    qerb: null,
  });
});

test('Dövlət özünə qonşu ola bilməz', () => {
  const xam = duzgunNumune();
  xam[0].serq = 1;
  assert.throws(() => topologiyaniYoxlaVeHazirla(xam));
});

test('Təkrarlanan State ID rədd edilir', () => {
  const xam = duzgunNumune();
  xam.push({ stateId: 1, simal: null, serq: null, cenub: null, qerb: null });
  assert.throws(() => topologiyaniYoxlaVeHazirla(xam));
});

test('Dörd istiqamətdən biri yazılmayıbsa səssiz null fərziyyəsi edilmir', () => {
  const xam = duzgunNumune();
  delete xam[0].qerb;
  assert.throws(() => topologiyaniYoxlaVeHazirla(xam));
});

test('Konfiqdə olmayan qonşu Dövlətə referans rədd edilir', () => {
  const xam = duzgunNumune();
  xam[0].serq = 99;
  assert.throws(() => topologiyaniYoxlaVeHazirla(xam));
});

test('Qarşılıqsız qonşuluq rədd edilir', () => {
  const xam = duzgunNumune();
  xam[1].qerb = null;
  assert.throws(() => topologiyaniYoxlaVeHazirla(xam));
});

test('Etibarsız State ID rədd edilir', () => {
  const xam = duzgunNumune();
  xam[0].stateId = 0;
  assert.throws(() => topologiyaniYoxlaVeHazirla(xam));
});

test('Boş topologiya rədd edilir', () => {
  assert.throws(() => topologiyaniYoxlaVeHazirla([]));
});

test('Hazırlanmış topologiyada olmayan State sorğusu rədd edilir', () => {
  const xerite = topologiyaniYoxlaVeHazirla(duzgunNumune());
  assert.throws(() => dovletTopologiyasiniAl(xerite, 99));
});

console.log('\nWorldV2 Dövlət topologiyası testləri uğurla tamamlandı.');
