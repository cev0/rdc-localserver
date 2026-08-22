'use strict';

const WORLDV2_ELFECIN_LIST = 'state_map_v2_elfecinler_request';
const WORLDV2_ELFECIN_ADD = 'state_map_v2_elfecin_elave_request';
const WORLDV2_ELFECIN_REMOVE = 'state_map_v2_elfecin_sil_request';
const WORLDV2_ELFECIN_LIMIT = 50;
const WORLDV2_MAX_KOORDINAT = 1200;

const MESAJLAR = new Set([
  WORLDV2_ELFECIN_LIST,
  WORLDV2_ELFECIN_ADD,
  WORLDV2_ELFECIN_REMOVE,
]);

// WorldV2 izolyasiya testləri DB package-lərini quraşdırmadan işləyir.
// Production persistence dependency-ləri yalnız real sorğu gələndə lazy yüklənir.
function defaultStateBerpaOlunub(playerId) {
  const { oyuncuStateBerpaOlunub } = require('./oyun_state_daimilik_korpu');
  return oyuncuStateBerpaOlunub(playerId);
}

async function defaultStateBerpaEt(kontekst, playerId) {
  const { oyunStateIniBerpaEt } = require('./oyun_state_daimilik_korpu');
  return await oyunStateIniBerpaEt(kontekst, playerId);
}

async function defaultStateMutasiyaEt(playerId, state, emeliyyat) {
  const {
    oyuncuStateMutasiyasiniPostgresIleIcraEt,
  } = require('./oyun_state_mutasiya_postgres');

  return await oyuncuStateMutasiyasiniPostgresIleIcraEt(
    playerId,
    state,
    emeliyyat,
  );
}

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function reqemAl(deyer) {
  const reqem = Number(deyer);
  return Number.isFinite(reqem) ? reqem : null;
}

function tamEded(deyer) {
  const reqem = Number(deyer);
  return Number.isFinite(reqem) ? Math.trunc(reqem) : 0;
}

function kopyala(deyer) {
  return deyer == null ? null : JSON.parse(JSON.stringify(deyer));
}

function stateIdAl(state) {
  const stateId = tamEded(
    state && state.worldPlacement && state.worldPlacement.stateId,
  );

  return stateId > 0 ? stateId : 0;
}

function koordinatEtibarlidir(x, y) {
  return x !== null &&
    y !== null &&
    x >= 0 &&
    y >= 0 &&
    x <= WORLDV2_MAX_KOORDINAT &&
    y <= WORLDV2_MAX_KOORDINAT;
}

function elfecinAcariHazirla(stateId, targetPlayerId) {
  const target = metnAl(targetPlayerId, 128).toLowerCase();
  return stateId > 0 && target ? `${stateId}:${target}` : '';
}

function elfecinElementiniNormallasdir(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const stateId = Math.max(0, tamEded(raw.stateId));
  const targetPlayerId = metnAl(raw.targetPlayerId, 128);
  const x = reqemAl(raw.x);
  const y = reqemAl(raw.y);

  if (stateId <= 0 || !targetPlayerId || !koordinatEtibarlidir(x, y)) {
    return null;
  }

  return {
    elfecinId: elfecinAcariHazirla(stateId, targetPlayerId),
    stateId,
    targetPlayerId,
    x,
    y,
    basliq: metnAl(raw.basliq, 80),
    yaradilibMs: Math.max(0, tamEded(raw.yaradilibMs)),
    yenilenibMs: Math.max(0, tamEded(raw.yenilenibMs)),
  };
}

function butunElfecinleriNormallasdir(state) {
  const raw = Array.isArray(state && state.worldV2Elfecinler)
    ? state.worldV2Elfecinler
    : [];

  const netice = [];
  const gorulen = new Set();

  for (const item of raw) {
    const norm = elfecinElementiniNormallasdir(item);
    if (!norm || !norm.elfecinId || gorulen.has(norm.elfecinId)) continue;

    gorulen.add(norm.elfecinId);
    netice.push(norm);

    if (netice.length >= WORLDV2_ELFECIN_LIMIT) break;
  }

  return netice;
}

function cariDovletElfecinleriniHazirla(state, stateId) {
  return butunElfecinleriNormallasdir(state)
    .filter(item => item.stateId === stateId)
    .map(kopyala);
}

function cavabGonder(kontekst, type, melumat) {
  if (!kontekst || typeof kontekst.send !== 'function') {
    throw new Error('WorldV2 əlfəcin handler üçün send funksiyası yoxdur.');
  }

  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function'
      ? kontekst.nowMs()
      : Date.now(),
  });
}

function neticeTypeAl(type) {
  return type.replace(/_request$/, '_result');
}

function elfecinMutasiyasiniTetbiqEt(state, type, msg, playerId, nowMs) {
  const stateId = stateIdAl(state);
  if (stateId <= 0) {
    return {
      success: false,
      deyisdi: false,
      errorCode: 'WORLDV2_PLACEMENT_MISSING',
      message: 'Oyunçunun Dövlət xəritəsi yerləşməsi tapılmadı.',
    };
  }

  const targetPlayerId = metnAl(msg && msg.targetPlayerId, 128);
  const targetAcar = targetPlayerId.toLowerCase();
  if (!targetPlayerId) {
    return {
      success: false,
      deyisdi: false,
      errorCode: 'WORLDV2_ELFECIN_TARGET_REQUIRED',
      message: 'Əlfəcin üçün hədəf oyunçu ID-si tələb olunur.',
    };
  }

  if (targetAcar === metnAl(playerId, 128).toLowerCase()) {
    return {
      success: false,
      deyisdi: false,
      errorCode: 'WORLDV2_ELFECIN_SELF_NOT_ALLOWED',
      message: 'Öz baza üçün əlfəcin tələb olunmur.',
    };
  }

  const acar = elfecinAcariHazirla(stateId, targetPlayerId);
  const movcudlar = butunElfecinleriNormallasdir(state);
  const evvelkiImza = JSON.stringify(movcudlar);

  if (type === WORLDV2_ELFECIN_REMOVE) {
    const yeniler = movcudlar.filter(item => item.elfecinId !== acar);
    state.worldV2Elfecinler = yeniler;

    return {
      success: true,
      deyisdi: evvelkiImza !== JSON.stringify(yeniler),
      action: 'remove',
      stateId,
      targetPlayerId,
    };
  }

  if (type !== WORLDV2_ELFECIN_ADD) {
    return {
      success: false,
      deyisdi: false,
      errorCode: 'WORLDV2_ELFECIN_UNKNOWN_MUTATION',
      message: 'Naməlum WorldV2 əlfəcin əməliyyatı.',
    };
  }

  const x = reqemAl(msg && msg.x);
  const y = reqemAl(msg && msg.y);
  if (!koordinatEtibarlidir(x, y)) {
    return {
      success: false,
      deyisdi: false,
      errorCode: 'WORLDV2_ELFECIN_COORDINATE_INVALID',
      message: 'Əlfəcin koordinatı 0..1200 aralığında olmalıdır.',
    };
  }

  const index = movcudlar.findIndex(item => item.elfecinId === acar);
  if (index < 0 && movcudlar.length >= WORLDV2_ELFECIN_LIMIT) {
    return {
      success: false,
      deyisdi: false,
      errorCode: 'WORLDV2_ELFECIN_LIMIT_REACHED',
      message: `Maksimum ${WORLDV2_ELFECIN_LIMIT} əlfəcin saxlamaq olar.`,
    };
  }

  const indi = Math.max(0, tamEded(nowMs)) || Date.now();
  const evvelki = index >= 0 ? movcudlar[index] : null;
  const yeni = {
    elfecinId: acar,
    stateId,
    targetPlayerId,
    x,
    y,
    basliq: metnAl(msg && msg.basliq, 80),
    yaradilibMs: evvelki && evvelki.yaradilibMs > 0
      ? evvelki.yaradilibMs
      : indi,
    yenilenibMs: indi,
  };

  if (index >= 0) {
    movcudlar[index] = yeni;
  }
  else {
    movcudlar.push(yeni);
  }

  state.worldV2Elfecinler = movcudlar;

  return {
    success: true,
    deyisdi: evvelkiImza !== JSON.stringify(movcudlar),
    action: 'add',
    stateId,
    targetPlayerId,
    elfecin: kopyala(yeni),
  };
}

function worldV2ElfecinHandleriYarat({
  stateBerpaOlunub = defaultStateBerpaOlunub,
  stateBerpaEt = defaultStateBerpaEt,
  stateMutasiyaEt = defaultStateMutasiyaEt,
} = {}) {
  return async function dovletXeriteWorldV2ElfecinMesajiniEmalEt(kontekst) {
    const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
    if (!MESAJLAR.has(type)) return false;

    const resultType = neticeTypeAl(type);
    const playerId = metnAl(
      kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
      128,
    ).toLowerCase();

    if (!playerId) {
      cavabGonder(kontekst, resultType, {
        success: false,
        errorCode: 'WORLDV2_AUTH_REQUIRED',
        message: 'WorldV2 əlfəcinləri üçün autentifikasiya tələb olunur.',
        elfecinler: [],
      });
      return true;
    }

    try {
      if (typeof kontekst.getOrCreatePlayerState !== 'function') {
        throw new Error('getOrCreatePlayerState kontekstdə yoxdur.');
      }

      if (typeof stateBerpaOlunub === 'function' &&
          !stateBerpaOlunub(playerId) &&
          typeof stateBerpaEt === 'function') {
        await stateBerpaEt(kontekst, playerId);
      }

      const state = kontekst.getOrCreatePlayerState(playerId);
      const stateId = stateIdAl(state);
      if (stateId <= 0) {
        cavabGonder(kontekst, resultType, {
          success: false,
          playerId,
          errorCode: 'WORLDV2_PLACEMENT_MISSING',
          message: 'Oyunçunun Dövlət xəritəsi yerləşməsi tapılmadı.',
          elfecinler: [],
        });
        return true;
      }

      if (type === WORLDV2_ELFECIN_LIST) {
        cavabGonder(kontekst, resultType, {
          success: true,
          playerId,
          stateId,
          elfecinler: cariDovletElfecinleriniHazirla(state, stateId),
        });
        return true;
      }

      const nowMs = typeof kontekst.nowMs === 'function'
        ? kontekst.nowMs()
        : Date.now();

      const mutasiyaNeticesi = await stateMutasiyaEt(
        playerId,
        state,
        async kilidliState => elfecinMutasiyasiniTetbiqEt(
          kilidliState,
          type,
          kontekst.msg,
          playerId,
          nowMs,
        ),
      );

      if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
        cavabGonder(kontekst, resultType, {
          success: false,
          playerId,
          stateId,
          errorCode: mutasiyaNeticesi && mutasiyaNeticesi.errorCode
            ? mutasiyaNeticesi.errorCode
            : 'WORLDV2_ELFECIN_MUTATION_FAILED',
          message: mutasiyaNeticesi && mutasiyaNeticesi.message
            ? mutasiyaNeticesi.message
            : 'WorldV2 əlfəcin əməliyyatı tamamlanmadı.',
          elfecinler: cariDovletElfecinleriniHazirla(state, stateId),
        });
        return true;
      }

      cavabGonder(kontekst, resultType, {
        success: true,
        playerId,
        stateId,
        action: mutasiyaNeticesi.action || '',
        targetPlayerId: mutasiyaNeticesi.targetPlayerId || '',
        elfecin: mutasiyaNeticesi.elfecin || null,
        elfecinler: cariDovletElfecinleriniHazirla(state, stateId),
      });
    }
    catch (xeta) {
      console.error('[DÖVLƏT XƏRİTƏSİ WORLDV2 ƏLFƏCİN]', xeta);

      cavabGonder(kontekst, resultType, {
        success: false,
        playerId,
        errorCode: 'WORLDV2_ELFECIN_SERVER_ERROR',
        message: 'WorldV2 əlfəcin əməliyyatı serverdə tamamlanmadı.',
        elfecinler: [],
      });
    }

    return true;
  };
}

const dovletXeriteWorldV2ElfecinMesajiniEmalEt = worldV2ElfecinHandleriYarat();

module.exports = {
  WORLDV2_ELFECIN_LIST,
  WORLDV2_ELFECIN_ADD,
  WORLDV2_ELFECIN_REMOVE,
  WORLDV2_ELFECIN_LIMIT,
  WORLDV2_MAX_KOORDINAT,
  MESAJLAR,
  stateIdAl,
  koordinatEtibarlidir,
  elfecinAcariHazirla,
  elfecinElementiniNormallasdir,
  butunElfecinleriNormallasdir,
  cariDovletElfecinleriniHazirla,
  elfecinMutasiyasiniTetbiqEt,
  worldV2ElfecinHandleriYarat,
  dovletXeriteWorldV2ElfecinMesajiniEmalEt,
};
