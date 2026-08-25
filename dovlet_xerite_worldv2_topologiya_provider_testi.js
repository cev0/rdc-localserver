'use strict';

const assert = require('assert');
const {
  WORLDV2_TOPOLOGIYA_ENV,
  topologiyaXeritesiniEnvDenHazirla,
} = require('./dovlet_xerite_worldv2_topologiya_provider');

(function testKonfiqYoxdursaNull() {
  assert.strictEqual(topologiyaXeritesiniEnvDenHazirla({}), null);
})();

(function testEtibarliTopologiyaMapQaytarir() {
  const env = {
    [WORLDV2_TOPOLOGIYA_ENV]: JSON.stringify([
      { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
      { stateId: 2, simal: null, serq: null, cenub: null, qerb: 1 },
    ]),
  };

  const xerite = topologiyaXeritesiniEnvDenHazirla(env);
  assert.ok(xerite instanceof Map);
  assert.strictEqual(xerite.get(1).serq, 2);
  assert.strictEqual(xerite.get(2).qerb, 1);
})();

(function testSintaksisXetaliJsonFailFast() {
  assert.throws(
    () => topologiyaXeritesiniEnvDenHazirla({
      [WORLDV2_TOPOLOGIYA_ENV]: '[{"stateId":1}',
    }),
    (xeta) => xeta && xeta.code === 'WORLDV2_TOPOLOGY_CONFIG_INVALID',
  );
})();

(function testQarsiliqsizTopologiyaFailFast() {
  const env = {
    [WORLDV2_TOPOLOGIYA_ENV]: JSON.stringify([
      { stateId: 1, simal: null, serq: 2, cenub: null, qerb: null },
      { stateId: 2, simal: null, serq: null, cenub: null, qerb: null },
    ]),
  };

  assert.throws(
    () => topologiyaXeritesiniEnvDenHazirla(env),
    (xeta) => xeta && xeta.code === 'WORLDV2_TOPOLOGY_CONFIG_INVALID',
  );
})();

console.log('✓ WorldV2 runtime topologiya provider testləri keçdi');
