'use strict';

const assert = require('assert');
const {
  RESURS_SAYI,
  XERITE_MERKEZI,
  SERHED_PAYI,
  BAZADAN_MIN_MESAFE,
  RESURSDAN_MIN_MESAFE,
  KOHNE_MOVQEDEN_MIN_MESAFE,
  PREZIDENT_MERKEZINDEN_MIN_MESAFE,
  zonaTesviriAl,
  worldV2ResursDescriptoruAl,
  worldV2ResursMovqeyiSec,
} = require('./dovlet_xerite_worldv2_resurs_provider');

function mesafeKvadrati(a, b) {
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  return dx * dx + dy * dy;
}

(function testDescriptorPaylanmasi() {
  const saylar = {
    outer: 0,
    middle: 0,
    inner_green: 0,
    president_center: 0,
  };

  for (let i = 1; i <= RESURS_SAYI; i++) {
    const d = worldV2ResursDescriptoruAl(1, i);
    saylar[d.zoneId] += 1;
    assert.ok(d.fullAmount > 0);
    assert.ok(d.gatherSeconds > 0);
    assert.ok(d.respawnSeconds > 0);
    assert.ok(['food', 'water', 'wood', 'iron', 'fuel'].includes(d.resourceId));
  }

  assert.strictEqual(RESURS_SAYI, 120);
  assert.deepStrictEqual(saylar, {
    outer: 48,
    middle: 44,
    inner_green: 24,
    president_center: 4,
  });
})();

(function testMovqelerVizualZonalaraVeMesafelereUyğundur() {
  const bases = [
    { x: 100, y: 100 },
    { x: 1000, y: 1000 },
    { x: 600, y: 500 },
  ];

  const movqeler = [];

  for (let i = 1; i <= RESURS_SAYI; i++) {
    const zona = zonaTesviriAl(i);
    const movqe = worldV2ResursMovqeyiSec({
      stateId: 1,
      index: i,
      spawnSerial: 1,
      bases,
      digerMovqeler: movqeler,
    });

    assert.ok(movqe.x >= SERHED_PAYI && movqe.x <= 1200 - SERHED_PAYI);
    assert.ok(movqe.y >= SERHED_PAYI && movqe.y <= 1200 - SERHED_PAYI);

    const merkezMesafesi = Math.max(
      Math.abs(movqe.x - XERITE_MERKEZI),
      Math.abs(movqe.y - XERITE_MERKEZI),
    );

    assert.ok(merkezMesafesi > zona.minimumMerkezMesafesi);
    assert.ok(merkezMesafesi <= zona.maksimumMerkezMesafesi);

    for (const baza of bases) {
      assert.ok(
        mesafeKvadrati(movqe, baza) >= BAZADAN_MIN_MESAFE * BAZADAN_MIN_MESAFE,
      );
    }

    for (const diger of movqeler) {
      assert.ok(
        mesafeKvadrati(movqe, diger) >= RESURSDAN_MIN_MESAFE * RESURSDAN_MIN_MESAFE,
      );
    }

    assert.ok(
      mesafeKvadrati(movqe, { x: XERITE_MERKEZI, y: XERITE_MERKEZI }) >=
        PREZIDENT_MERKEZINDEN_MIN_MESAFE * PREZIDENT_MERKEZINDEN_MIN_MESAFE,
    );

    movqeler.push(movqe);
  }
})();

(function testRespawnKohneKoordinatdanUzaqlasir() {
  const ilk = worldV2ResursMovqeyiSec({
    stateId: 2,
    index: 7,
    spawnSerial: 1,
  });

  const yeni = worldV2ResursMovqeyiSec({
    stateId: 2,
    index: 7,
    spawnSerial: 2,
    kohneMovqe: ilk,
  });

  assert.ok(
    mesafeKvadrati(ilk, yeni) >=
      KOHNE_MOVQEDEN_MIN_MESAFE * KOHNE_MOVQEDEN_MIN_MESAFE,
  );
})();

console.log('✓ WorldV2 dinamik resurs provider testləri keçdi.');
