'use strict';

const assert = require('assert');

const {
  dovletKodunuNormallasdir,
  qlobalDovletAxtar,
} = require('./dovlet_xerite_worldv2_qlobal_axtaris');

assert.strictEqual(dovletKodunuNormallasdir(1434), 1434);
assert.strictEqual(dovletKodunuNormallasdir('1434'), 1434);
assert.strictEqual(dovletKodunuNormallasdir('State#1434'), 1434);
assert.strictEqual(dovletKodunuNormallasdir('state 1434'), 1434);

assert.throws(() => dovletKodunuNormallasdir(''), /Etibarsız Dövlət kodu/);
assert.throws(() => dovletKodunuNormallasdir('abc'), /Etibarsız Dövlət kodu/);
assert.throws(() => dovletKodunuNormallasdir(0), /Etibarsız Dövlət kodu/);

const dovlet = {
  stateId: 2,
  opened: true,
  displayName: 'State#2',
  presidentDisplayName: 'Prezident',
  flagId: 'az',
  globalNode: {
    nodeId: 'state_2',
    normalizedX: 0.25,
    normalizedY: 0.75,
  },
};

const payload = {
  version: 2,
  states: [
    { stateId: 1, opened: true, globalNode: { nodeId: 'state_1' } },
    dovlet,
  ],
};

const tapildi = qlobalDovletAxtar({ payload, stateCode: 'State#2' });
assert.strictEqual(tapildi.found, true);
assert.strictEqual(tapildi.opened, true);
assert.strictEqual(tapildi.stateId, 2);
assert.deepStrictEqual(tapildi.globalNode, dovlet.globalNode);
assert.deepStrictEqual(tapildi.state, dovlet);
assert.notStrictEqual(tapildi.state, dovlet);
assert.notStrictEqual(tapildi.globalNode, dovlet.globalNode);

const tapilmadi = qlobalDovletAxtar({ payload, stateCode: 999 });
assert.deepStrictEqual(tapilmadi, {
  version: 2,
  stateId: 999,
  found: false,
  opened: false,
  globalNode: null,
  state: null,
});

assert.throws(
  () => qlobalDovletAxtar({ payload: null, stateCode: 1 }),
  /payload tələb olunur/,
);
assert.throws(
  () => qlobalDovletAxtar({ payload: {}, stateCode: 1 }),
  /payload.states massivi tələb olunur/,
);

console.log('✓ WorldV2 Qlobal Dövlət ID axtarışı read-only testləri keçdi.');
