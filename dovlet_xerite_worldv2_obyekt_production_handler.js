"use strict";

const {
  worldV2ObyektPayloadHazirla,
} = require("./dovlet_xerite_worldv2_obyekt_payload");

const {
  dovletXeriteWorldV2QlobalProductionMesajiniEmalEt,
} = require("./dovlet_xerite_worldv2_qlobal_production_handler");

const {
  dovletAcilibmi,
} = require("./dovlet_xerite_worldv2_lifecycle_adapteri");

const WORLDV2_OBYEKT_SORGU = "state_map_v2_objects_request";
const WORLDV2_OBYEKT_CAVAB = "state_map_v2_objects_result";

// YENİ: başqa Dövlətə read-only baxış zamanı həmin Dövlətin obyekt feed-i.
const WORLDV2_BAXILAN_OBYEKT_SORGU = "state_map_v2_view_objects_request";
const WORLDV2_BAXILAN_OBYEKT_CAVAB = "state_map_v2_view_objects_result";

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function gonder(kontekst, type, melumat) {
  if (!kontekst || typeof kontekst.send !== "function") {
    throw new Error(
      "WorldV2 production handler üçün send funksiyası tələb olunur.",
    );
  }

  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs:
      typeof kontekst.nowMs === "function"
        ? kontekst.nowMs()
        : Date.now(),
  });
}

function stateIdAl(state) {
  const reqem = Number(
    state && state.worldPlacement && state.worldPlacement.stateId,
  );

  return Number.isInteger(reqem) && reqem > 0
    ? reqem
    : 0;
}

function baxilanStateIdAl(kontekst) {
  const reqem = Number(
    kontekst &&
    kontekst.msg &&
    kontekst.msg.viewedStateId,
  );

  return Number.isInteger(reqem) && reqem > 0
    ? reqem
    : 0;
}

async function standartDovletBazalariniAl(stateId, nowMs) {
  // PostgreSQL modulu yalnız həqiqi production sorğusu gələndə yüklənir.
  const {
    dovletBazalariniAl,
  } = require("./dovlet_baza_kataloqu_postgres");

  return await dovletBazalariniAl(stateId, nowMs);
}

function standartStateBerpaOlunub(playerId) {
  const {
    oyuncuStateBerpaOlunub,
  } = require("./oyun_state_daimilik_korpu");

  return oyuncuStateBerpaOlunub(playerId);
}

async function standartStateBerpaEt(kontekst, playerId) {
  const {
    oyunStateIniBerpaEt,
  } = require("./oyun_state_daimilik_korpu");

  return await oyunStateIniBerpaEt(kontekst, playerId);
}

function worldV2ProductionObyektHandleriYarat({
  dovletBazalariniAl = standartDovletBazalariniAl,
  stateBerpaOlunub = standartStateBerpaOlunub,
  stateBerpaEt = standartStateBerpaEt,
  dovletAcilibmiFn = dovletAcilibmi,
} = {}) {
  if (typeof dovletBazalariniAl !== "function") {
    throw new Error(
      "WorldV2 production handler üçün dovletBazalariniAl tələb olunur.",
    );
  }

  if (typeof dovletAcilibmiFn !== "function") {
    throw new Error(
      "WorldV2 production handler üçün dovletAcilibmiFn tələb olunur.",
    );
  }

  return async function dovletXeriteWorldV2ObyektProductionMesajiniEmalEt(
    kontekst,
  ) {
    // Qlobal Dövlət siyahısı da eyni WorldV2 production routing nöqtəsindən keçir.
    if (
      await dovletXeriteWorldV2QlobalProductionMesajiniEmalEt(kontekst)
    ) {
      return true;
    }

    const type = metnAl(
      kontekst && kontekst.type,
      128,
    ).toLowerCase();

    const evObyektSorqusudur =
      type === WORLDV2_OBYEKT_SORGU;

    const baxilanObyektSorqusudur =
      type === WORLDV2_BAXILAN_OBYEKT_SORGU;

    if (!evObyektSorqusudur && !baxilanObyektSorqusudur) {
      return false;
    }

    const cavabType = baxilanObyektSorqusudur
      ? WORLDV2_BAXILAN_OBYEKT_CAVAB
      : WORLDV2_OBYEKT_CAVAB;

    const playerId = metnAl(
      kontekst &&
      kontekst.ws &&
      kontekst.ws._authedPlayerId,
      128,
    );

    if (!playerId) {
      gonder(kontekst, cavabType, {
        success: false,
        errorCode: "WORLDV2_AUTH_REQUIRED",
        message:
          "WorldV2 Dövlət xəritəsi üçün autentifikasiya tələb olunur.",
      });
      return true;
    }

    try {
      if (
        typeof kontekst.getOrCreatePlayerState !== "function"
      ) {
        throw new Error(
          "getOrCreatePlayerState kontekstdə yoxdur.",
        );
      }

      if (
        typeof stateBerpaOlunub === "function" &&
        !stateBerpaOlunub(playerId) &&
        typeof stateBerpaEt === "function"
      ) {
        await stateBerpaEt(kontekst, playerId);
      }

      const state =
        kontekst.getOrCreatePlayerState(playerId);

      // Persistent authoritative Ev Dövlət.
      const homeStateId = stateIdAl(state);

      if (homeStateId <= 0) {
        gonder(kontekst, cavabType, {
          success: false,
          playerId,
          errorCode: "WORLDV2_PLACEMENT_MISSING",
          message:
            "Oyunçunun Dövlət xəritəsi yerləşməsi tapılmadı.",
        });
        return true;
      }

      const nowMs =
        typeof kontekst.nowMs === "function"
          ? kontekst.nowMs()
          : Date.now();

      // Normal obyekt request əvvəlki kimi yalnız Ev Dövlət üçündür.
      // Read-only request isə serverin təsdiqlədiyi başqa Dövlət üçün ola bilər.
      let viewedStateId = homeStateId;

      if (baxilanObyektSorqusudur) {
        viewedStateId = baxilanStateIdAl(kontekst);

        if (viewedStateId <= 0) {
          gonder(kontekst, cavabType, {
            success: false,
            playerId,
            homeStateId,
            errorCode: "WORLDV2_VIEW_INVALID",
            message:
              "Baxılan Dövlət ID-si etibarsızdır.",
            readOnlyView: true,
            persistentPlacementMutated: false,
          });
          return true;
        }

        // Öz Dövlət həmişə oxuna bilər.
        // Başqa Dövlət isə yalnız lifecycle-a görə açıqdırsa oxunur.
        if (
          viewedStateId !== homeStateId &&
          !dovletAcilibmiFn(viewedStateId, nowMs)
        ) {
          gonder(kontekst, cavabType, {
            success: false,
            playerId,
            homeStateId,
            viewedStateId,
            errorCode: "WORLDV2_VIEW_STATE_LOCKED",
            message:
              `Dövlət #${viewedStateId} hələ açılmayıb.`,
            readOnlyView: true,
            persistentPlacementMutated: false,
          });
          return true;
        }
      }

      const kataloqNeticesi =
        await dovletBazalariniAl(
          viewedStateId,
          nowMs,
        );

      const bazalar =
        kataloqNeticesi &&
        Array.isArray(kataloqNeticesi.bases)
          ? kataloqNeticesi.bases
          : [];

      const info = worldV2ObyektPayloadHazirla({
        stateId: viewedStateId,
        requestingPlayerId: playerId,
        bases: bazalar,
        serverTimeUnixMs: nowMs,
      });

      gonder(kontekst, cavabType, {
        success: true,
        playerId,

        // Persistent yerləşmə.
        homeStateId,

        // Hazırda render üçün oxunan Dövlət.
        viewedStateId,

        // Köhnə client üçün stateId saxlanılır.
        stateId: viewedStateId,

        readOnlyView: baxilanObyektSorqusudur,
        persistentPlacementMutated: false,

        info,
        payloadJson: JSON.stringify(info),
      });
    }
    catch (xeta) {
      console.error(
        "[DÖVLƏT XƏRİTƏSİ WORLDV2 PRODUCTION]",
        xeta,
      );

      gonder(kontekst, cavabType, {
        success: false,
        playerId,
        errorCode: "WORLDV2_OBJECTS_READ_FAILED",
        message:
          "WorldV2 baza layer-i serverdən alına bilmədi.",
        readOnlyView: baxilanObyektSorqusudur,
        persistentPlacementMutated: false,
      });
    }

    return true;
  };
}

const dovletXeriteWorldV2ObyektProductionMesajiniEmalEt =
  worldV2ProductionObyektHandleriYarat();

module.exports = {
  WORLDV2_OBYEKT_SORGU,
  WORLDV2_OBYEKT_CAVAB,

  WORLDV2_BAXILAN_OBYEKT_SORGU,
  WORLDV2_BAXILAN_OBYEKT_CAVAB,

  metnAl,
  stateIdAl,
  baxilanStateIdAl,

  standartDovletBazalariniAl,
  standartStateBerpaOlunub,
  standartStateBerpaEt,

  worldV2ProductionObyektHandleriYarat,
  dovletXeriteWorldV2ObyektProductionMesajiniEmalEt,
};
