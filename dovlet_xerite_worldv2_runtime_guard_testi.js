'use strict';

const assert = require('assert');
const {
  WORLDV2_RUNTIME_GUARD_XETALARI,
  stateRuntimeUyğunluğunuYoxla,
} = require('./dovlet_xerite_worldv2_runtime_guard');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

test('runtime guard uyğun State runtime-ı dəyişmədən qaytarır', () => {
  const runtime = {
    stateId: 7,
    presidentPlayerId: 'p7',
  };

  assert.strictEqual(stateRuntimeUyğunluğunuYoxla(runtime, 7), runtime);
});

test('runtime guard null runtime-ı təhlükəsiz fallback üçün qəbul edir', () => {
  assert.strictEqual(stateRuntimeUyğunluğunuYoxla(null, 7), null);
  assert.strictEqual(stateRuntimeUyğunluğunuYoxla(undefined, 7), null);
});

test('runtime guard başqa Dövlət runtime-ını fail-closed rədd edir', () => {
  assert.throws(
    () => stateRuntimeUyğunluğunuYoxla({ stateId: 8 }, 7),
    (xeta) => xeta.code === WORLDV2_RUNTIME_GUARD_XETALARI.RUNTIME_STATE_ID_UYGUN_DEYIL,
  );
});

test('runtime guard stateId olmayan runtime-ı fail-closed rədd edir', () => {
  assert.throws(
    () => stateRuntimeUyğunluğunuYoxla({ presidentPlayerId: 'p7' }, 7),
    (xeta) => xeta.code === WORLDV2_RUNTIME_GUARD_XETALARI.RUNTIME_STATE_ID_UYGUN_DEYIL,
  );
});

test('runtime guard obyekt olmayan runtime-ı rədd edir', () => {
  assert.throws(
    () => stateRuntimeUyğunluğunuYoxla('state-7', 7),
    (xeta) => xeta.code === WORLDV2_RUNTIME_GUARD_XETALARI.RUNTIME_OBYEKT_DEYIL,
  );
});

test('runtime guard etibarsız expected State ID-ni rədd edir', () => {
  assert.throws(
    () => stateRuntimeUyğunluğunuYoxla({ stateId: 1 }, 0),
    (xeta) => xeta.code === WORLDV2_RUNTIME_GUARD_XETALARI.RUNTIME_STATE_ID_UYGUN_DEYIL,
  );
});
