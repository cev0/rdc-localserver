'use strict';

/**
 * Yalnız lokal WorldV2 sərhəd keçid testi üçün server launcher-i.
 *
 * QURULUŞ:
 * - Dövlət #1-in Şərq qonşusu Dövlət #2-dir.
 * - Dövlət #2-nin Qərb qonşusu Dövlət #1-dir.
 * - Digər istiqamətlərdə qonşu yoxdur.
 * - Lifecycle release vaxtı cari vaxtdan 61 gün əvvələ çəkilir ki,
 *   Dövlət #2 test zamanı açıq olsun.
 *
 * Production-da işləməsi qəsdən bloklanır.
 */

if (String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production') {
  console.error('[WORLDV2 TEST] Bu launcher production mühitində işlədilə bilməz.');
  process.exit(1);
}

const GUN_MS = 24 * 60 * 60 * 1000;

process.env.WORLDV2_STATE_TOPOLOGY_JSON = JSON.stringify([
  {
    stateId: 1,
    simal: null,
    serq: 2,
    cenub: null,
    qerb: null,
  },
  {
    stateId: 2,
    simal: null,
    serq: null,
    cenub: null,
    qerb: 1,
  },
]);

// 61 gün əvvəl => cari aktiv Dövlət #2 olur.
process.env.PLAY_MARKET_RELEASE_TARIXI = new Date(Date.now() - (61 * GUN_MS)).toISOString();

console.log('[WORLDV2 TEST] Lokal iki Dövlətli test rejimi aktivdir.');
console.log('[WORLDV2 TEST] Dövlət #1 --Şərq--> Dövlət #2');
console.log('[WORLDV2 TEST] Dövlət #2 --Qərb--> Dövlət #1');
console.log('[WORLDV2 TEST] Dövlət #2 lifecycle üzrə açıqdır.');

require('./server_missiya_genisletme');
