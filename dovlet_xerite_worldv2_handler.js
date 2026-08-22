'use strict';

const {
  DOVLET_XERITESI_V2,
  koordinatEtibarlidir,
} = require('./dovlet_xerite_worldv2_qaydalari');

const {
  WORLDV2_MESAJ_NOVLERI,
  worldV2BaslangicPayloadHazirla,
} = require('./dovlet_xerite_worldv2_payload');

const {
  serhedKecidiniYoxla,
} = require('./dovlet_xerite_worldv2_serhed_xidmeti');

const {
  prezidentMelumatiniHazirla,
} = require('./dovlet_xerite_worldv2_prezident_adapteri');

const {
  qlobalDovletlerPayloadHazirla,
} = require('./dovlet_xerite_worldv2_qlobal_payload');

const {
  dovletPlanliVaxtlariniAl,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const {
  stateRuntimeUyğunluğunuYoxla,
} = require('./dovlet_xerite_worldv2_runtime_guard');

const WORLDV2_XETA_KODLARI = Object.freeze({
  AUTH_TELEB_OLUNUR: 'WORLDV2_AUTH_REQUIRED',
  STATE_YOXDUR: 'WORLDV2_STATE_MISSING',
  MOVQE_YOXDUR: 'WORLDV2_PLACEMENT_MISSING',
  TOPOLOGIYA_YOXDUR: 'WORLDV2_TOPOLOGY_MISSING',
  OBYEKTLER_HAZIR_DEYIL: 'WORLDV2_OBJECTS_NOT_CONNECTED',
  DAXILI_XETA: 'WORLDV2_INTERNAL_ERROR',
});

const WORLDV2_EMAL_OLUNAN_MESAJLAR = new Set([
  WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU,
  WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU,
  WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU,
  WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_SORGU,
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum)
    : '';
}

function gonder(kontekst, type, melumat) {
  if (!kontekst || typeof kontekst.send !== 'function') {
    throw new Error('WorldV2 handler üçün kontekst.send funksiyası tələb olunur.');
  }

  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === 'function'
      ? kontekst.nowMs()
      : Date.now(),
  });
}

function neticeNovunuAl(sorguNovu) {
  switch (sorguNovu) {
    case WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_SORGU:
      return WORLDV2_MESAJ_NOVLERI.XERITE_MELUMATI_CAVAB;
    case WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU:
      return WORLDV2_MESAJ_NOVLERI.OBYEKTLER_CAVAB;
    case WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU:
      return WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_CAVAB;
    case WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_SORGU:
      return WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_CAVAB;
    default:
      return 'state_map_v2_error';
  }
}

function playerIdAl(kontekst) {
  return metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128,
  );
}

function oyunStateIniAl(kontekst, playerId) {
  if (!kontekst || typeof kontekst.getOrCreatePlayerState !== 'function') {
    throw new Error('WorldV2 handler üçün getOrCreatePlayerState tələb olunur.');
  }

  const state = kontekst.getOrCreatePlayerState(playerId);
  if (!state || typeof state !== 'object') {
    const xeta = new Error('Oyunçu state-i tapılmadı.');
    xeta.code = WORLDV2_XETA_KODLARI.STATE_YOXDUR;
    throw xeta;
  }

  return state;
}

function worldPlacementAl(state) {
  const wp = state && state.worldPlacement;
  if (!wp || typeof wp !== 'object') {
    const xeta = new Error('Oyunçunun Dövlət xəritəsi mövqeyi yoxdur.');
    xeta.code = WORLDV2_XETA_KODLARI.MOVQE_YOXDUR;
    throw xeta;
  }

  const stateId = Number(wp.stateId);
  const baseX = Number(wp.baseX);
  const baseZ = Number(wp.baseZ);

  if (!Number.isInteger(stateId) || stateId <= 0) {
    const xeta = new Error('Oyunçunun Dövlət ID-si etibarsızdır.');
    xeta.code = WORLDV2_XETA_KODLARI.MOVQE_YOXDUR;
    throw xeta;
  }

  if (!koordinatEtibarlidir(baseX, baseZ)) {
    const xeta = new Error(
      `Oyunçunun baza koordinatı WorldV2 sərhədindən kənardır: ${wp.baseX}:${wp.baseZ}`,
    );
    xeta.code = WORLDV2_XETA_KODLARI.MOVQE_YOXDUR;
    throw xeta;
  }

  return { stateId, baseX, baseZ };
}

function qonsulariServerStatusuIleHazirla(topologiyaXeritesi, stateId, nowMs) {
  if (!(topologiyaXeritesi instanceof Map)) {
    const xeta = new Error('WorldV2 Dövlət topologiyası hələ konfiqurasiya edilməyib.');
    xeta.code = WORLDV2_XETA_KODLARI.TOPOLOGIYA_YOXDUR;
    throw xeta;
  }

  const netice = {};

  for (const istiqamet of DOVLET_XERITESI_V2.serhedIstiqametleri) {
    const kecid = serhedKecidiniYoxla({
      topologiyaXeritesi,
      currentStateId: stateId,
      istiqamet,
      nowMs,
    });

    netice[istiqamet] = {
      stateId: kecid.neighborStateId,
      status: kecid.status,
    };
  }

  return netice;
}

function prezidentPayloadGirisiniHazirla(stateRuntime, stateId, nowMs) {
  const plan = dovletPlanliVaxtlariniAl(stateId, nowMs);

  const runtime = stateRuntime && typeof stateRuntime === 'object'
    ? stateRuntime
    : {
        stateId,
        centerUnlockAtMs: plan.presidentUnlockAtMs || 0,
        centerBuilding: {
          x: DOVLET_XERITESI_V2.prezidentMerkezi.x,
          z: DOVLET_XERITESI_V2.prezidentMerkezi.y,
          unlockAtMs: plan.presidentUnlockAtMs || 0,
        },
      };

  const prezident = prezidentMelumatiniHazirla(runtime, nowMs);

  return {
    unlocked: prezident.acilib,
    active: prezident.acilib,
    presidentPlayerId: prezident.presidentPlayerId,
    presidentAllianceId: prezident.presidentAllianceId,
    unlockAtUnixMs: prezident.unlockAtMs,
  };
}

/**
 * Ayrı WorldV2 WebSocket handler factory-si.
 *
 * Hazırda qəsdən server.js-ə qoşulmur. İnteqrasiya zamanı dependency-lər
 * mövcud authoritative server funksiyalarından veriləcək.
 */
function worldV2HandleriYarat({
  topologiyaXeritesi = null,
  stateRuntimeAl = async () => null,
  qlobalMetadataAl = async () => [],
} = {}) {
  if (typeof stateRuntimeAl !== 'function') {
    throw new Error('stateRuntimeAl funksiya olmalıdır.');
  }
  if (typeof qlobalMetadataAl !== 'function') {
    throw new Error('qlobalMetadataAl funksiya olmalıdır.');
  }

  return async function dovletXeriteWorldV2MesajiniEmalEt(kontekst) {
    const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
    if (!WORLDV2_EMAL_OLUNAN_MESAJLAR.has(type)) return false;

    const resultType = neticeNovunuAl(type);
    const playerId = playerIdAl(kontekst);

    if (!playerId) {
      gonder(kontekst, resultType, {
        success: false,
        errorCode: WORLDV2_XETA_KODLARI.AUTH_TELEB_OLUNUR,
        message: 'WorldV2 Dövlət xəritəsi üçün autentifikasiya tələb olunur.',
      });
      return true;
    }

    try {
      const nowMs = typeof kontekst.nowMs === 'function'
        ? kontekst.nowMs()
        : Date.now();

      if (type === WORLDV2_MESAJ_NOVLERI.QLOBAL_DOVLETLER_SORGU) {
        const metadata = await qlobalMetadataAl(nowMs, kontekst);
        const info = qlobalDovletlerPayloadHazirla({ nowMs, metadata });

        gonder(kontekst, resultType, {
          success: true,
          playerId,
          info,
          payloadJson: JSON.stringify(info),
        });
        return true;
      }

      const state = oyunStateIniAl(kontekst, playerId);
      const placement = worldPlacementAl(state);

      if (type === WORLDV2_MESAJ_NOVLERI.OBYEKTLER_SORGU) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          stateId: placement.stateId,
          errorCode: WORLDV2_XETA_KODLARI.OBYEKTLER_HAZIR_DEYIL,
          message: 'WorldV2 obyekt layer-i hələ production placement sisteminə qoşulmayıb.',
        });
        return true;
      }

      if (type === WORLDV2_MESAJ_NOVLERI.SERHED_KECIDI_SORGU) {
        const istiqamet = metnAl(
          kontekst && kontekst.msg && kontekst.msg.direction,
          32,
        ).toLowerCase();

        const info = serhedKecidiniYoxla({
          topologiyaXeritesi,
          currentStateId: placement.stateId,
          istiqamet,
          nowMs,
        });

        // Bu mərhələdə yalnız authoritative eligibility check edilir.
        // Oyunçu stateId/base koordinatı dəyişdirilmir.
        gonder(kontekst, resultType, {
          success: true,
          playerId,
          checkedOnly: true,
          mutatedPlayerState: false,
          info,
          payloadJson: JSON.stringify(info),
        });
        return true;
      }

      const qonsular = qonsulariServerStatusuIleHazirla(
        topologiyaXeritesi,
        placement.stateId,
        nowMs,
      );

      const xamStateRuntime = await stateRuntimeAl(
        placement.stateId,
        nowMs,
        kontekst,
      );

      // Dependency başqa Dövlətin runtime-ını qaytararsa Prezident və digər
      // authoritative metadata client payload-ına qarışmamalıdır.
      const stateRuntime = stateRuntimeUyğunluğunuYoxla(
        xamStateRuntime,
        placement.stateId,
      );

      const prezident = prezidentPayloadGirisiniHazirla(
        stateRuntime,
        placement.stateId,
        nowMs,
      );

      const info = worldV2BaslangicPayloadHazirla({
        stateId: placement.stateId,
        playerId,
        baseX: placement.baseX,
        baseZ: placement.baseZ,
        qonsular,
        prezident,
        serverTimeUnixMs: nowMs,
      });

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info),
      });
    } catch (xeta) {
      const errorCode = metnAl(xeta && xeta.code, 128)
        || WORLDV2_XETA_KODLARI.DAXILI_XETA;

      gonder(kontekst, resultType, {
        success: false,
        playerId,
        errorCode,
        message: metnAl(xeta && xeta.message, 300)
          || 'WorldV2 Dövlət xəritəsi sorğusu tamamlanmadı.',
      });
    }

    return true;
  };
}

module.exports = {
  WORLDV2_XETA_KODLARI,
  WORLDV2_EMAL_OLUNAN_MESAJLAR,
  metnAl,
  neticeNovunuAl,
  playerIdAl,
  oyunStateIniAl,
  worldPlacementAl,
  qonsulariServerStatusuIleHazirla,
  prezidentPayloadGirisiniHazirla,
  worldV2HandleriYarat,
};
