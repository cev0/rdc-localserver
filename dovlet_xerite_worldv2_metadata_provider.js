'use strict';

const {
  metadataXeritesiHazirla,
  dovletMetadataHazirla,
} = require('./dovlet_xerite_worldv2_qlobal_payload');

const WORLDV2_METADATA_ENV = 'WORLDV2_STATE_METADATA_JSON';

function envMetniniAl(env = process.env) {
  if (!env || typeof env !== 'object') return '';
  const deyer = env[WORLDV2_METADATA_ENV];
  return typeof deyer === 'string' ? deyer.trim() : '';
}

/**
 * Production runtime üçün explicit WorldV2 Dövlət metadata provider-i.
 *
 * Bu provider heç bir Prezident, bayraq və ya node uydurmur. Yalnız server
 * konfiqində açıq şəkildə verilən metadata-nı mövcud Qlobal payload qaydaları
 * ilə normallaşdırır. Konfiq verilməyibsə boş siyahı qaytarılır və əvvəlki
 * backward-compatible davranış saxlanılır.
 */
function dovletMetadatasiniEnvDenHazirla(env = process.env) {
  const xam = envMetniniAl(env);
  if (!xam) return [];

  let parsed;
  try {
    parsed = JSON.parse(xam);
  }
  catch (xeta) {
    const error = new Error(`${WORLDV2_METADATA_ENV} etibarlı JSON deyil.`);
    error.code = 'WORLDV2_METADATA_CONFIG_INVALID';
    error.cause = xeta;
    throw error;
  }

  try {
    const xerite = metadataXeritesiHazirla(parsed);
    return Array.from(xerite.entries())
      .map(([stateId, metadata]) => ({
        stateId,
        ...dovletMetadataHazirla(metadata),
      }))
      .sort((a, b) => a.stateId - b.stateId);
  }
  catch (xeta) {
    const error = new Error(`${WORLDV2_METADATA_ENV} WorldV2 metadata qaydalarına uyğun deyil: ${xeta.message}`);
    error.code = 'WORLDV2_METADATA_CONFIG_INVALID';
    error.cause = xeta;
    throw error;
  }
}

// Bir process daxilində Global payload və search eyni immutable mənbə snapshot-ını
// istifadə edir. Runtime DB provider qoşulana qədər bu explicit konfiq təhlükəsiz
// production bridge rolunu oynayır.
const runtimeDovletMetadatasi = Object.freeze(
  dovletMetadatasiniEnvDenHazirla(process.env).map((x) => Object.freeze({ ...x })),
);

async function runtimeDovletMetadatasiniAl() {
  return runtimeDovletMetadatasi;
}

module.exports = {
  WORLDV2_METADATA_ENV,
  envMetniniAl,
  dovletMetadatasiniEnvDenHazirla,
  runtimeDovletMetadatasiniAl,
};
