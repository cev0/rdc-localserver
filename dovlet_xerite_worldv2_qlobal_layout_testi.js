'use strict';

const assert = require('assert');

const {
  QLOBAL_LAYOUT_VERSION,
  QLOBAL_LAYOUT_KOORDINAT_SAHESI,
  QLOBAL_LAYOUT_MENSEYI,
  QLOBAL_LAYOUT_FON_ID,
  QLOBAL_LAYOUT_FON_ASPEKT,
  QLOBAL_LAYOUT_TUTUMU,
  QLOBAL_LAYOUT_NODELARI,
  QLOBAL_LAYOUT_ELAQELERI,
  dovletUcunQlobalNodeAl,
  acilmisDovletElageleriniHazirla,
  qlobalLayoutMelumatiniHazirla,
} = require('./dovlet_xerite_worldv2_qlobal_layout');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

test('Qlobal layout V1 91 stabil slot və 9:16 fon müqaviləsi verir', () => {
  assert.strictEqual(QLOBAL_LAYOUT_VERSION, 1);
  assert.strictEqual(QLOBAL_LAYOUT_TUTUMU, 91);
  assert.strictEqual(QLOBAL_LAYOUT_NODELARI.length, 91);
  assert.strictEqual(QLOBAL_LAYOUT_KOORDINAT_SAHESI, 'normalized_0_1');
  assert.strictEqual(QLOBAL_LAYOUT_MENSEYI, 'bottom_left');
  assert.strictEqual(QLOBAL_LAYOUT_FON_ID, 'worldv2_qlobal_fon_v1');
  assert.strictEqual(QLOBAL_LAYOUT_FON_ASPEKT, 9 / 16);
});

test('Bütün node ID və normalized koordinatlar etibarlı və unikaldır', () => {
  const idler = new Set();
  const movqeler = new Set();

  for (const node of QLOBAL_LAYOUT_NODELARI) {
    assert.ok(Number.isInteger(node.stateId) && node.stateId > 0);
    assert.ok(/^qlobal_v1_node_\d{3}$/.test(node.nodeId));
    assert.ok(node.normalizedX >= 0 && node.normalizedX <= 1);
    assert.ok(node.normalizedY >= 0 && node.normalizedY <= 1);

    assert.strictEqual(idler.has(node.nodeId), false, `Təkrar nodeId: ${node.nodeId}`);
    idler.add(node.nodeId);

    const movqeAcari = `${node.normalizedX}:${node.normalizedY}`;
    assert.strictEqual(movqeler.has(movqeAcari), false, `Təkrar node mövqeyi: ${movqeAcari}`);
    movqeler.add(movqeAcari);
  }
});

test('Dövlət #1 xəritənin mərkəzinə yaxın sabit node alır', () => {
  const node = dovletUcunQlobalNodeAl(1);
  assert.ok(node);
  assert.strictEqual(node.nodeId, 'qlobal_v1_node_001');
  assert.ok(Math.abs(node.normalizedX - 0.5) < 0.08);
  assert.ok(Math.abs(node.normalizedY - 0.5) < 0.08);
});

test('Layout tutumundan kənar uzaq gələcək Dövlət üçün node uydurulmur', () => {
  assert.strictEqual(dovletUcunQlobalNodeAl(QLOBAL_LAYOUT_TUTUMU + 1), null);
});

test('Əlaqə qrafında self/duplicate və etibarsız endpoint yoxdur', () => {
  const gorulen = new Set();

  for (const elage of QLOBAL_LAYOUT_ELAQELERI) {
    assert.ok(elage.fromStateId > 0 && elage.fromStateId <= QLOBAL_LAYOUT_TUTUMU);
    assert.ok(elage.toStateId > 0 && elage.toStateId <= QLOBAL_LAYOUT_TUTUMU);
    assert.notStrictEqual(elage.fromStateId, elage.toStateId);
    assert.ok(elage.fromStateId < elage.toStateId);

    const acar = `${elage.fromStateId}:${elage.toStateId}`;
    assert.strictEqual(gorulen.has(acar), false, `Təkrar əlaqə: ${acar}`);
    gorulen.add(acar);

    assert.strictEqual(elage.fromNodeId, dovletUcunQlobalNodeAl(elage.fromStateId).nodeId);
    assert.strictEqual(elage.toNodeId, dovletUcunQlobalNodeAl(elage.toStateId).nodeId);
  }
});

test('Filtered əlaqələrdə yalnız hər iki ucu açılmış Dövlət qalır', () => {
  const aciq = [1, 2, 3, 4, 5];
  const aciqSet = new Set(aciq);
  const elaqeler = acilmisDovletElageleriniHazirla(aciq);

  assert.ok(elaqeler.length > 0);
  for (const elage of elaqeler) {
    assert.strictEqual(aciqSet.has(elage.fromStateId), true);
    assert.strictEqual(aciqSet.has(elage.toStateId), true);
  }

  assert.deepStrictEqual(acilmisDovletElageleriniHazirla([1]), []);
});

test('Layout metadata client üçün mənşə və fon aspektini də verir', () => {
  assert.deepStrictEqual(qlobalLayoutMelumatiniHazirla(), {
    layoutVersion: 1,
    coordinateSpace: 'normalized_0_1',
    origin: 'bottom_left',
    backgroundId: 'worldv2_qlobal_fon_v1',
    backgroundAspectRatio: 9 / 16,
    capacity: 91,
  });
});

test('Etibarsız Dövlət ID-si rədd edilir', () => {
  assert.throws(() => dovletUcunQlobalNodeAl(0));
  assert.throws(() => dovletUcunQlobalNodeAl(-1));
  assert.throws(() => dovletUcunQlobalNodeAl(1.5));
});

console.log('\nWorldV2 Qlobal layout V1 testləri uğurla tamamlandı.');
