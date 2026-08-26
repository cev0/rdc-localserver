'use strict';

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : '';
}

/**
 * Oyunçunun sabit ittifaq kimliyini server state-dən çıxarır.
 * Sabit ID həmişə ad-dan üstündür. `ad:` prefiksli fallback yalnız
 * köhnə snapshot-larla müvəqqəti uyğunluq üçündür və yeni gameplay
 * state-i üçün authoritative ID kimi yazılmamalıdır.
 */
function ittifaqKimliyiniAl(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return {
      ittifaqId: '',
      sabitdir: false,
      menbe: 'yoxdur',
    };
  }

  const sabitId =
    metnAl(state.ittifaqId, 128) ||
    metnAl(state.allianceId, 128) ||
    metnAl(state.ittifaq && state.ittifaq.ittifaqId, 128) ||
    metnAl(state.ittifaq && state.ittifaq.id, 128) ||
    metnAl(state.playerProfile && state.playerProfile.ittifaqId, 128);

  if (sabitId) {
    return {
      ittifaqId: sabitId,
      sabitdir: true,
      menbe: 'stable_id',
    };
  }

  const kohneAd =
    metnAl(state.ittifaqAdi, 128) ||
    metnAl(state.playerProfile && state.playerProfile.ittifaqAdi, 128);

  if (kohneAd) {
    return {
      ittifaqId: `ad:${kohneAd}`,
      sabitdir: false,
      menbe: 'legacy_name_fallback',
    };
  }

  return {
    ittifaqId: '',
    sabitdir: false,
    menbe: 'yoxdur',
  };
}

function eyniIttifaqdadir(birinciState, ikinciState) {
  const birinci = ittifaqKimliyiniAl(birinciState);
  const ikinci = ittifaqKimliyiniAl(ikinciState);

  return !!(
    birinci.ittifaqId &&
    ikinci.ittifaqId &&
    birinci.ittifaqId === ikinci.ittifaqId
  );
}

function ittifaqElaqeNeticesiAl(birinciState, ikinciState) {
  const birinci = ittifaqKimliyiniAl(birinciState);
  const ikinci = ittifaqKimliyiniAl(ikinciState);

  if (!birinci.ittifaqId || !ikinci.ittifaqId) {
    return {
      eyniIttifaq: false,
      birinci,
      ikinci,
      sebeb: 'ittifaq_yoxdur',
    };
  }

  const eynidir = birinci.ittifaqId === ikinci.ittifaqId;
  return {
    eyniIttifaq: eynidir,
    birinci,
    ikinci,
    sebeb: eynidir ? 'eyni_ittifaq' : 'ferqli_ittifaq',
  };
}

module.exports = {
  metnAl,
  ittifaqKimliyiniAl,
  eyniIttifaqdadir,
  ittifaqElaqeNeticesiAl,
};
