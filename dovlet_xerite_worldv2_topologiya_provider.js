'use strict';

const {
  topologiyaniYoxlaVeHazirla,
} = require('./dovlet_xerite_worldv2_topologiya');

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
 * - Real topologiya yalnız açıq konfiqdən gəlir; provider heç bir State ID uydurmur.
 * - Konfiq verilməyibsə null qaytarılır və mövcud fail-closed/fallback davranışı qalır.
 * - Konfiq verilibsə JSON massiv olmalı və tam qarşılıqlı topologiya validator-dan keçməlidir.
 * - Etibarsız konfiq səssizcə qəbul edilmir; startup zamanı fail-fast edilir.
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

// Bir process daxilində Near/Far/Global eyni Map obyektini paylaşır.
const runtimeTopologiyaXeritesi = topologiyaXeritesiniEnvDenHazirla(process.env);

function runtimeTopologiyaXeritesiniAl() {
  return runtimeTopologiyaXeritesi;
}

module.exports = {
  WORLDV2_TOPOLOGIYA_ENV,
  envMetniniAl,
  topologiyaXeritesiniEnvDenHazirla,
  runtimeTopologiyaXeritesiniAl,
};
