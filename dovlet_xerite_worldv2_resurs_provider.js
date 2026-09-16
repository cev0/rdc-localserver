'use strict';

const legacy = require('./dovlet_xerite_worldv2_resurs_provider_legacy');
const {
  SQL_AUTHORITATIVE,
  worldV2SqlMutasiyaFlagAktivdir,
  worldV2SqlViewportFlagAktivdir,
  worldV2ResursRuntimeModeAl,
} = require('./dovlet_xerite_worldv2_resurs_runtime_mode');

/**
 * Legacy full-catalog provider SQL-authoritative rejimdə qəsdən bloklanır.
 * Bu guard köhnə/unbounded endpoint-in giant audit JSON-u yenidən yazıb
 * row-based authoritative state-i geriyə aparmasının qarşısını alır.
 */
async function worldV2ResurslariniAl(stateId, bases = [], nowMs = Date.now(), istenilenSay = 0, options = {}) {
  if (worldV2SqlMutasiyaFlagAktivdir() || worldV2SqlViewportFlagAktivdir()) {
    const mode = await worldV2ResursRuntimeModeAl(stateId);
    if (mode && mode.runtimeMode === SQL_AUTHORITATIVE) {
      const xeta = new Error('SQL authoritative rejimdə legacy full resource provider qadağandır; bounded resourceView istifadə olunmalıdır.');
      xeta.code = 'WORLDV2_SQL_VIEWPORT_REQUIRED';
      throw xeta;
    }
  }
  return await legacy.worldV2ResurslariniAl(stateId, bases, nowMs, istenilenSay, options);
}

module.exports = {
  ...legacy,
  worldV2ResurslariniAl,
};
