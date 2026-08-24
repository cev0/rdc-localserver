'use strict';

const assert = require('assert');
const muqavile = require('./server_unity_message_contract_worldv2.json');

assert.strictEqual(muqavile.contract, 'rdc_state_map_worldv2');
assert.strictEqual(muqavile.version, 2);

assert.strictEqual(
  muqavile.productionConnections.global_states_v2_request.topologySource,
  'dovlet_xerite_worldv2_topologiya',
);
assert.strictEqual(
  muqavile.productionConnections.global_states_v2_search_request.connected,
  true,
);
assert.strictEqual(
  muqavile.productionConnections.global_states_v2_search_request.readOnly,
  true,
);

const qlobalMesaj = muqavile.messages.global_states_v2_request;
assert.strictEqual(qlobalMesaj.resultType, 'global_states_v2_result');
assert.strictEqual(
  qlobalMesaj.result.info.states[0].presidentDisplayName,
  'string_or_null',
);

const axtarisMesaji = muqavile.messages.global_states_v2_search_request;
assert.deepStrictEqual(axtarisMesaji.requestFields, ['stateCode']);
assert.strictEqual(axtarisMesaji.resultType, 'global_states_v2_search_result');
assert.strictEqual(
  axtarisMesaji.invalidSearchErrorCode,
  'WORLDV2_GLOBAL_SEARCH_INVALID',
);

assert.strictEqual(
  muqavile.authoritativeRules.homeStatePlacementIsAuthoritative,
  true,
);
assert.strictEqual(
  muqavile.authoritativeRules.viewedStateNavigationMustNotMutateWorldPlacement,
  true,
);
assert.strictEqual(
  muqavile.authoritativeRules.globalConnectionsUseAuthoritativeTopologyWhenAvailable,
  true,
);
assert.strictEqual(muqavile.authoritativeRules.globalSearchIsReadOnly, true);
assert.ok(muqavile.errorCodes.includes('WORLDV2_GLOBAL_SEARCH_INVALID'));

console.log('✓ WorldV2 Server↔Unity contract global search/topology qaydaları doğrudur');
