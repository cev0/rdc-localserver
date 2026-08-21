'use strict';

const assert = require('assert');
const {
  prezidentMelumatiniHazirla,
  prezidentMerkeziKecidlidir,
} = require('./dovlet_xerite_worldv2_prezident_adapteri');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

const GUN_MS = 24 * 60 * 60 * 1000;
const BASLANGIC = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
const ACILMA = BASLANGIC + (30 * GUN_MS);

test('Prezident mərkəzi WorldV2-də legacy x/z-ni x/y-yə çevirir', () => {
  const info = prezidentMelumatiniHazirla({
    stateId: 3,
    centerBuilding: {
      x: 600,
      z: 600,
      unlockAtMs: ACILMA,
    },
  }, BASLANGIC);

  assert.strictEqual(info.stateId, 3);
  assert.deepStrictEqual(info.merkez, { x: 600, y: 600 });
});

test('30 günlük vaxt tamam olmadan Prezident mərkəzi bağlıdır', () => {
  const runtime = {
    stateId: 1,
    centerUnlockAtMs: ACILMA,
    centerBuilding: {
      x: 600,
      z: 600,
      unlockAtMs: ACILMA,
      isUnlocked: true,
    },
  };

  const info = prezidentMelumatiniHazirla(runtime, ACILMA - 1);
  assert.strictEqual(info.acilib, false);
  assert.strictEqual(prezidentMerkeziKecidlidir(runtime, ACILMA - 1), false);
});

test('Tam unlock vaxtında Prezident mərkəzi açılır', () => {
  const runtime = {
    stateId: 1,
    centerBuilding: {
      x: 600,
      z: 600,
      unlockAtMs: ACILMA,
      isUnlocked: false,
    },
  };

  const info = prezidentMelumatiniHazirla(runtime, ACILMA);
  assert.strictEqual(info.acilib, true);
  assert.strictEqual(prezidentMerkeziKecidlidir(runtime, ACILMA), true);
});

test('Capture məlumatı centerBuilding-dən oxunur', () => {
  const info = prezidentMelumatiniHazirla({
    stateId: 2,
    centerBuilding: {
      x: 600,
      z: 600,
      unlockAtMs: ACILMA,
      occupiedByPlayerId: 'player_77',
      occupiedByAllianceId: 'alliance_5',
      occupiedAtMs: ACILMA + 5000,
    },
  }, ACILMA + 10000);

  assert.strictEqual(info.tutulub, true);
  assert.strictEqual(info.captureMelumatiVar, true);
  assert.strictEqual(info.presidentPlayerId, 'player_77');
  assert.strictEqual(info.presidentAllianceId, 'alliance_5');
  assert.strictEqual(info.occupiedAtMs, ACILMA + 5000);
});

test('centerBuilding capture sahələri yoxdursa runtime Prezident fallback-i işləyir', () => {
  const info = prezidentMelumatiniHazirla({
    stateId: 4,
    presidentPlayerId: 'player_fallback',
    presidentAllianceId: 'alliance_fallback',
    centerBuilding: {
      x: 600,
      z: 600,
      unlockAtMs: ACILMA,
    },
  }, ACILMA);

  assert.strictEqual(info.presidentPlayerId, 'player_fallback');
  assert.strictEqual(info.presidentAllianceId, 'alliance_fallback');
  assert.strictEqual(info.tutulub, true);
});

test('Capture olmayan Dövlət null Prezident məlumatı qaytarır', () => {
  const info = prezidentMelumatiniHazirla({
    stateId: 1,
    centerBuilding: {
      x: 600,
      z: 600,
      unlockAtMs: ACILMA,
    },
  }, ACILMA);

  assert.strictEqual(info.tutulub, false);
  assert.strictEqual(info.presidentPlayerId, null);
  assert.strictEqual(info.presidentAllianceId, null);
  assert.strictEqual(info.occupiedAtMs, 0);
});

test('Legacy koordinatları V2 sərhədindən çıxsa fail-safe clamp olunur', () => {
  const info = prezidentMelumatiniHazirla({
    stateId: 1,
    centerBuilding: {
      x: -100,
      z: 9999,
      unlockAtMs: ACILMA,
    },
  }, ACILMA);

  assert.deepStrictEqual(info.merkez, { x: 0, y: 1200 });
});

test('Unlock vaxtı yoxdursa authoritative isUnlocked fallback-i istifadə olunur', () => {
  const info = prezidentMelumatiniHazirla({
    stateId: 1,
    centerBuilding: {
      x: 600,
      z: 600,
      isUnlocked: true,
    },
  }, BASLANGIC);

  assert.strictEqual(info.unlockAtMs, 0);
  assert.strictEqual(info.acilib, true);
});

test('Etibarsız server vaxtında Prezident adapteri fail-closed davranır', () => {
  assert.throws(() => prezidentMelumatiniHazirla({}, Number.NaN));
  assert.throws(() => prezidentMelumatiniHazirla({}, -1));
});

console.log('\nWorldV2 Prezident adapter testləri uğurla tamamlandı.');
