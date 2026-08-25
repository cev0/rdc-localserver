'use strict';

const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');

const {
  ikiDovletTestRejimiAktivdir,
  ikiDovletTestTopologiyasiniAl,
} = require('./dovlet_xerite_worldv2_iki_dovlet_test_rejimi');

const WORLDV2_TOPOLOGIYA_ENV = 'WORLDV2_STATE_TOPOLOGY_JSON';

function envMetniniAl(env = process.env) {
  if (!env || typeof env !== 'object') return '';
  const deyer = env[WORLDV2_TOPOLOGIYA_ENV];
  return typeof deyer === 'string' ? deyer.trim() : '';
}

/**
 * Production runtime üçün yeganə authoritative WorldV2 topologiya provider-i.
 *
 * Qaydalar:
 * - Real topologiya varsa yalnız açıq env konfiqindən gəlir.
 * - Konfiq verilibsə JSON massiv olmalı və tam qarşılıqlı validator-dan keçməlidir.
 * - Etibarsız konfiq səssiz qəbul edilmir; startup zamanı fail-fast edilir.
 * - MÜVƏQQƏTİ inteqrasiya testi zamanı server prosesi üçün Dövlət #1 <-> #2
 *   fallback topologiyası istifadə oluna bilər. Unit-test runner-lərində bu fallback işləmir.
 */
function topologiyaXeritesiniEnvDenHazirla(env = process.env) {
  const xam = envMetniniAl(env);
  if (!xam) return null;

  let parsed;
  try {
    parsed = JSON.parse(xam);
  }
  catch (xeta) {
    const error = new Error(`${WORLDV2_TOPOLOGIYA_ENV} etibarlı JSON deyil.`);
    error.code = 'WORLDV2_TOPOLOGY_CONFIG_INVALID';
    error.cause = xeta;
    throw error;
  }

  try {
    return topologiyaniYoxlaVeHazirla(parsed);
  }
  catch (xeta) {
    const error = new Error(`${WORLDV2_TOPOLOGIYA_ENV} WorldV2 topologiya qaydalarına uyğun deyil: ${xeta.message}`);
    error.code = 'WORLDV2_TOPOLOGY_CONFIG_INVALID';
    error.cause = xeta;
    throw error;
  }
}

function runtimeTopologiyasiniHazirla(env = process.env, argv = process.argv) {
  const envTopologiyasi = topologiyaXeritesiniEnvDenHazirla(env);
  if (envTopologiyasi) return envTopologiyasi;

  if (!ikiDovletTestRejimiAktivdir(env, argv)) return null;

  const testTopologiyasi = topologiyaniYoxlaVeHazirla(
    ikiDovletTestTopologiyasiniAl(),
  );

  console.warn(
    '[WORLDV2 TEST] Müvəqqəti iki Dövlətli runtime topologiyası aktivdir: ' +
    'Dövlət #1 --Şərq--> #2, Dövlət #2 --Qərb--> #1.',
  );

  return testTopologiyasi;
}

// Bir process daxilində Near/Far/Global eyni Map obyektini paylaşır.
const runtimeTopologiyaXeritesi = runtimeTopologiyasiniHazirla(
  process.env,
  process.argv,
);

function runtimeTopologiyaXeritesiniAl() {
  return runtimeTopologiyaXeritesi;
}

module.exports = {
  WORLDV2_TOPOLOGIYA_ENV,
  envMetniniAl,
  topologiyaXeritesiniEnvDenHazirla,
  runtimeTopologiyasiniHazirla,
  runtimeTopologiyaXeritesiniAl,
};
