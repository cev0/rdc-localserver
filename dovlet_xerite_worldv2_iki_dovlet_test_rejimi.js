'use strict';

/**
 * MÜVƏQQƏTİ WorldV2 inteqrasiya test rejimi.
 *
 * Məqsəd:
 * - Koyeb-də ayrıca env yazmadan Dövlət #1 <-> Dövlət #2 sərhəd keçidini yoxlamaq;
 * - normal unit-test runner-lərinə təsir etməmək;
 * - test bitəndən sonra bu fallback-i asanlıqla söndürmək.
 *
 * Bu modul gameplay üçün final topologiya mənbəyi deyil.
 */

const WORLDV2_IKI_DOVLET_TEST_ENV = 'WORLDV2_IKI_DOVLET_TESTI';
const WORLDV2_IKI_DOVLET_TESTI_MECBURIDIR = true;
const WORLDV2_IKI_DOVLET_TEST_AKTIV_STATE_ID = 2;

function serverStartProsesiDirmi(argv = process.argv) {
  if (!Array.isArray(argv) || argv.length < 2) return false;

  const giris = String(argv[1] || '')
    .trim()
    .replace(/\\/g, '/')
    .toLowerCase();

  return giris === 'server_missiya_genisletme.js' ||
    giris.endsWith('/server_missiya_genisletme.js');
}

function envBooleanAl(deyer) {
  const metn = String(deyer == null ? '' : deyer).trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(metn)) return true;
  if (['0', 'false', 'no', 'off'].includes(metn)) return false;
  return null;
}

function ikiDovletTestRejimiAktivdir(
  env = process.env,
  argv = process.argv,
) {
  const explicit = envBooleanAl(
    env && typeof env === 'object'
      ? env[WORLDV2_IKI_DOVLET_TEST_ENV]
      : null,
  );

  if (explicit !== null) return explicit;

  return WORLDV2_IKI_DOVLET_TESTI_MECBURIDIR &&
    serverStartProsesiDirmi(argv);
}

function ikiDovletTestTopologiyasiniAl() {
  return [
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
  ];
}

module.exports = {
  WORLDV2_IKI_DOVLET_TEST_ENV,
  WORLDV2_IKI_DOVLET_TESTI_MECBURIDIR,
  WORLDV2_IKI_DOVLET_TEST_AKTIV_STATE_ID,
  serverStartProsesiDirmi,
  envBooleanAl,
  ikiDovletTestRejimiAktivdir,
  ikiDovletTestTopologiyasiniAl,
};
