'use strict';

const assert = require('assert');
const {
  WORLDV2_BAXIS_REJIMI,
  evMovqeyiniHazirla,
  oxunanBaxisHazirla,
  prezidentMerkezineBaxisHazirla,
} = require('./dovlet_xerite_worldv2_baxis_naviqasiyasi');

const placement = {
  stateId: 4,
  baseX: 321,
  baseZ: 654,
};

const ev = evMovqeyiniHazirla(placement);
assert.deepStrictEqual(ev, {
  homeStateId: 4,
  homeBase: { x: 321, y: 654 },
});

const foreignFar = oxunanBaxisHazirla({
  worldPlacement: placement,
  viewedStateId: 9,
  viewX: 700,
  viewY: 350,
  mode: WORLDV2_BAXIS_REJIMI.UZAQ,
});

assert.strictEqual(foreignFar.homeStateId, 4);
assert.deepStrictEqual(foreignFar.homeBase, { x: 321, y: 654 });
assert.strictEqual(foreignFar.viewedStateId, 9);
assert.deepStrictEqual(foreignFar.viewCoordinate, { x: 700, y: 350 });
assert.strictEqual(foreignFar.mode, 'far');
assert.strictEqual(foreignFar.readOnlyView, true);
assert.strictEqual(foreignFar.viewingHomeState, false);
assert.strictEqual(foreignFar.persistentPlacementMutated, false);

// Builder persistent worldPlacement obyektini dəyişməməlidir.
assert.deepStrictEqual(placement, {
  stateId: 4,
  baseX: 321,
  baseZ: 654,
});

const homeDefault = oxunanBaxisHazirla({ worldPlacement: placement });
assert.strictEqual(homeDefault.viewedStateId, 4);
assert.deepStrictEqual(homeDefault.viewCoordinate, { x: 321, y: 654 });
assert.strictEqual(homeDefault.viewingHomeState, true);

const president = prezidentMerkezineBaxisHazirla({
  worldPlacement: placement,
  viewedStateId: 12,
});
assert.strictEqual(president.viewedStateId, 12);
assert.deepStrictEqual(president.viewCoordinate, { x: 600, y: 600 });
assert.strictEqual(president.mode, 'near');
assert.strictEqual(president.persistentPlacementMutated, false);

assert.throws(
  () => oxunanBaxisHazirla({ worldPlacement: placement, viewX: 50 }),
  /viewX və viewY birlikdə/,
);

assert.throws(
  () => oxunanBaxisHazirla({
    worldPlacement: placement,
    viewedStateId: 2,
    viewX: 1201,
    viewY: 10,
  }),
  /WorldV2 sərhədindən kənardır/,
);

console.log('✓ WorldV2 Home State və read-only Viewed State contract testi keçdi');
