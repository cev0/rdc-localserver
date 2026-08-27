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
const WORLDV2_BAXILAN_OBYEKT_SORGU = "state_map_v2_view_objects_request";
const WORLDV2_BAXILAN_OBYEKT_CAVAB = "state_map_v2_view_objects_result";
const WORLDV2_RESURS_VIZUAL_CAVAB = "state_map_v2_resource_visuals_result";

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function musbetTamEdedAl(deyer, fallback = 0) {
  const reqem = Number(deyer);
  return Number.isFinite(reqem) && reqem > 0
    ? Math.trunc(reqem)
    : fallback;
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
    kontekst && kontekst.msg && kontekst.msg.viewedStateId,
  );

  return Number.isInteger(reqem) && reqem > 0
    ? reqem
    : 0;
}

function istenilenResursSayiniAl(kontekst) {
  const ws = kontekst && kontekst.ws;
  const msg = kontekst && kontekst.msg;
  const mesajdaki = musbetTamEdedAl(
    msg && msg.requestedResourceCount,
    0,
  );

  if (mesajdaki > 0) {
    // Vizual-only startup sorğusu sonrakı tam obyekt sorğularının sayını dəyişməsin.
    if (ws && !(msg && msg.resourceVisualOnly === true)) {
      ws._worldV2RequestedResourceCount = mesajdaki;
    }
    return mesajdaki;
  }

  return musbetTamEdedAl(
    ws && ws._worldV2RequestedResourceCount,
    0,
  );
}

function resursNovKodunuAl(resourceId) {
  switch (metnAl(resourceId, 32).toLowerCase()) {
    case "food": return 0;
    case "water": return 1;
    case "wood": return 2;
    case "iron": return 3;
    case "fuel": return 4;
    default: return -1;
  }
}

function worldV2ResursVizualPaketiHazirla(resurslar) {
  const paket = {
    say: 0,
    i: [],
    r: [],
    l: [],
    x: [],
    y: [],
    s: [],
  };

  if (!Array.isArray(resurslar) || resurslar.length === 0) {
    return paket;
  }

  for (const resurs of resurslar) {
    if (!resurs || typeof resurs !== "object") continue;

    const index = musbetTamEdedAl(resurs.index, 0);
    const level = musbetTamEdedAl(resurs.level, 0);
    const spawnSerial = musbetTamEdedAl(resurs.spawnSerial, 0);
    const novKodu = resursNovKodunuAl(resurs.resourceId);
    const x = Number(resurs.x);
    const y = Number(resurs.y);

    if (
      index <= 0 ||
      level <= 0 || level > 10 ||
      spawnSerial <= 0 ||
      novKodu < 0 ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      continue;
    }

    paket.i.push(index);
    paket.r.push(novKodu);
    paket.l.push(level);
    paket.x.push(Math.round(x));
    paket.y.push(Math.round(y));
    paket.s.push(spawnSerial);
  }

  paket.say = paket.i.length;
  return paket;
}

async function standartDovletBazalariniAl(stateId, nowMs) {
  const {
    dovletBazalariniAl,
  } = require("./dovlet_baza_kataloqu_postgres");

  return await dovletBazalariniAl(stateId, nowMs);
}

async function standartDovletResurslariniAl(
  stateId,
  bases,
  nowMs,
  requestedResourceCount = 0,
) {
  const {
    worldV2ResurslariniAl,
  } = require("./dovlet_xerite_worldv2_resurs_provider");

  return await worldV2ResurslariniAl(
    stateId,
    bases,
    nowMs,
    musbetTamEdedAl(requestedResourceCount, 0),
  );
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
  dovletResurslariniAl = standartDovletResurslariniAl,
  stateBerpaOlunub = standartStateBerpaOlunub,
  stateBerpaEt = standartStateBerpaEt,
  dovletAcilibmiFn = dovletAcilibmi,
} = {}) {
  if (typeof dovletBazalariniAl !== "function") {
    throw new Error(
      "WorldV2 production handler üçün dovletBazalariniAl tələb olunur.",
    );
  }

  if (typeof dovletResurslariniAl !== "function") {
    throw new Error(
      "WorldV2 production handler üçün dovletResurslariniAl tələb olunur.",
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
    if (
      await dovletXeriteWorldV2QlobalProductionMesajiniEmalEt(kontekst)
    ) {
      return true;
    }

    const type = metnAl(
      kontekst && kontekst.type,
      128,
    ).toLowerCase();

    const evObyektSorqusudur = type === WORLDV2_OBYEKT_SORGU;
    const baxilanObyektSorqusudur = type === WORLDV2_BAXILAN_OBYEKT_SORGU;

    if (!evObyektSorqusudur && !baxilanObyektSorqusudur) {
      return false;
    }

    const sorquBaslangicMs = Date.now();
    const ws = kontekst && kontekst.ws;
    const yalnizResursVizual = !!(
      kontekst &&
      kontekst.msg &&
      kontekst.msg.resourceVisualOnly === true
    );

    let aktivSorquAcari = "";
    let aktivSorquSahibidir = false;

    const normalCavabType = baxilanObyektSorqusudur
      ? WORLDV2_BAXILAN_OBYEKT_CAVAB
      : WORLDV2_OBYEKT_CAVAB;

    const cavabType = yalnizResursVizual
      ? WORLDV2_RESURS_VIZUAL_CAVAB
      : normalCavabType;

    const playerId = metnAl(
      ws && ws._authedPlayerId,
      128,
    );

    if (!playerId) {
      gonder(kontekst, cavabType, {
        success: false,
        errorCode: "WORLDV2_AUTH_REQUIRED",
        message: "WorldV2 Dövlət xəritəsi üçün autentifikasiya tələb olunur.",
      });
      return true;
    }

    try {
      if (typeof kontekst.getOrCreatePlayerState !== "function") {
        throw new Error("getOrCreatePlayerState kontekstdə yoxdur.");
      }

      if (
        typeof stateBerpaOlunub === "function" &&
        !stateBerpaOlunub(playerId) &&
        typeof stateBerpaEt === "function"
      ) {
        await stateBerpaEt(kontekst, playerId);
      }

      const state = kontekst.getOrCreatePlayerState(playerId);
      const homeStateId = stateIdAl(state);

      if (homeStateId <= 0) {
        gonder(kontekst, cavabType, {
          success: false,
          playerId,
          errorCode: "WORLDV2_PLACEMENT_MISSING",
          message: "Oyunçunun Dövlət xəritəsi yerləşməsi tapılmadı.",
        });
        return true;
      }

      const nowMs = typeof kontekst.nowMs === "function"
        ? kontekst.nowMs()
        : Date.now();

      let viewedStateId = homeStateId;

      if (baxilanObyektSorqusudur) {
        viewedStateId = baxilanStateIdAl(kontekst);

        if (viewedStateId <= 0) {
          gonder(kontekst, cavabType, {
            success: false,
            playerId,
            homeStateId,
            errorCode: "WORLDV2_VIEW_INVALID",
            message: "Baxılan Dövlət ID-si etibarsızdır.",
            readOnlyView: true,
            persistentPlacementMutated: false,
          });
          return true;
        }

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
            message: `Dövlət #${viewedStateId} hələ açılmayıb.`,
            readOnlyView: true,
            persistentPlacementMutated: false,
          });
          return true;
        }
      }

      const requestedResourceCount = istenilenResursSayiniAl(kontekst);

      if (ws) {
        if (!(ws._worldV2AktivObyektSorqulari instanceof Set)) {
          ws._worldV2AktivObyektSorqulari = new Set();
        }

        const namizedAcar = [
          cavabType,
          viewedStateId,
          requestedResourceCount,
        ].join(":");

        if (ws._worldV2AktivObyektSorqulari.has(namizedAcar)) {
          console.log("[WORLDV2 DUBLİKAT SORĞU BLOKLANDI]", {
            playerId,
            stateId: viewedStateId,
            requestedResourceCount,
            readOnlyView: baxilanObyektSorqusudur,
            resourceVisualOnly: yalnizResursVizual,
          });
          return true;
        }

        ws._worldV2AktivObyektSorqulari.add(namizedAcar);
        aktivSorquAcari = namizedAcar;
        aktivSorquSahibidir = true;
      }

      console.log("[WORLDV2 RESURS SORĞU]", {
        playerId,
        stateId: viewedStateId,
        requestedResourceCount,
        readOnlyView: baxilanObyektSorqusudur,
        resourceVisualOnly: yalnizResursVizual,
      });

      const bazaBaslangicMs = Date.now();
      const kataloqNeticesi = await dovletBazalariniAl(viewedStateId, nowMs);
      const serverBazaMs = Date.now() - bazaBaslangicMs;

      const bazalar = kataloqNeticesi && Array.isArray(kataloqNeticesi.bases)
        ? kataloqNeticesi.bases
        : [];

      const resursBaslangicMs = Date.now();
      const resursNeticesi = await dovletResurslariniAl(
        viewedStateId,
        bazalar,
        nowMs,
        requestedResourceCount,
      );
      const serverResursMs = Date.now() - resursBaslangicMs;

      const resurslar = resursNeticesi && Array.isArray(resursNeticesi.resources)
        ? resursNeticesi.resources
        : [];

      const provisionedResourceCount =
        resursNeticesi && Number.isFinite(Number(resursNeticesi.provisionedResourceCount))
          ? Math.max(0, Math.trunc(Number(resursNeticesi.provisionedResourceCount)))
          : 0;

      const physicalCapacityReached =
        !!(resursNeticesi && resursNeticesi.physicalCapacityReached === true);

      if (yalnizResursVizual) {
        const vizualBaslangicMs = Date.now();
        const vizual = worldV2ResursVizualPaketiHazirla(resurslar);
        const serverVizualMs = Date.now() - vizualBaslangicMs;
        const serverHazirlamaMs = Date.now() - sorquBaslangicMs;
        const vaxtMesaji =
          "WorldV2VisualTiming|baza=" + serverBazaMs +
          "|resurs=" + serverResursMs +
          "|vizual=" + serverVizualMs +
          "|hazirlama=" + serverHazirlamaMs;

        const gonderBaslangicMs = Date.now();
        gonder(kontekst, cavabType, {
          success: true,
          playerId,
          homeStateId,
          viewedStateId,
          stateId: viewedStateId,
          requestedResourceCount,
          activeResourceCount: vizual.say,
          provisionedResourceCount,
          physicalCapacityReached,
          readOnlyView: baxilanObyektSorqusudur,
          persistentPlacementMutated: false,
          message: vaxtMesaji,
          serverBazaMs,
          serverResursMs,
          serverVizualMs,
          serverHazirlamaMs,
          say: vizual.say,
          i: vizual.i,
          r: vizual.r,
          l: vizual.l,
          x: vizual.x,
          y: vizual.y,
          s: vizual.s,
        });

        const serverGonderMs = Date.now() - gonderBaslangicMs;
        const serverTotalMs = Date.now() - sorquBaslangicMs;

        console.log("[WORLDV2 RESURS VİZUAL NƏTİCƏ]", {
          playerId,
          stateId: viewedStateId,
          requestedResourceCount,
          activeResourceCount: vizual.say,
          physicalCapacityReached,
          serverBazaMs,
          serverResursMs,
          serverVizualMs,
          serverGonderMs,
          serverTotalMs,
        });

        return true;
      }

      const activeResourceCount =
        resursNeticesi && Number.isFinite(Number(resursNeticesi.activeResourceCount))
          ? Math.max(0, Math.trunc(Number(resursNeticesi.activeResourceCount)))
          : resurslar.length;

      const payloadBaslangicMs = Date.now();
      const info = worldV2ObyektPayloadHazirla({
        stateId: viewedStateId,
        requestingPlayerId: playerId,
        bases: bazalar,
        resources: resurslar,
        serverTimeUnixMs: nowMs,
      });
      const serverPayloadMs = Date.now() - payloadBaslangicMs;

      const gonderBaslangicMs = Date.now();
      const serverHazirlamaMs = Date.now() - sorquBaslangicMs;
      const vaxtMesaji =
        "WorldV2Timing|baza=" + serverBazaMs +
        "|resurs=" + serverResursMs +
        "|payload=" + serverPayloadMs +
        "|hazirlama=" + serverHazirlamaMs;

      gonder(kontekst, cavabType, {
        success: true,
        playerId,
        homeStateId,
        viewedStateId,
        stateId: viewedStateId,
        requestedResourceCount,
        activeResourceCount,
        provisionedResourceCount,
        physicalCapacityReached,
        readOnlyView: baxilanObyektSorqusudur,
        persistentPlacementMutated: false,
        message: vaxtMesaji,
        serverBazaMs,
        serverResursMs,
        serverPayloadMs,
        serverHazirlamaMs,
        info,
      });

      const serverGonderMs = Date.now() - gonderBaslangicMs;
      const serverTotalMs = Date.now() - sorquBaslangicMs;

      console.log("[WORLDV2 RESURS NƏTİCƏ]", {
        playerId,
        stateId: viewedStateId,
        requestedResourceCount,
        activeResourceCount,
        provisionedResourceCount,
        physicalCapacityReached,
        serverBazaMs,
        serverResursMs,
        serverPayloadMs,
        serverGonderMs,
        serverTotalMs,
      });
    }
    catch (xeta) {
      console.error("[DÖVLƏT XƏRİTƏSİ WORLDV2 PRODUCTION]", xeta);

      gonder(kontekst, cavabType, {
        success: false,
        playerId,
        errorCode: "WORLDV2_OBJECTS_READ_FAILED",
        message: "WorldV2 obyekt layer-i serverdən alına bilmədi.",
        readOnlyView: baxilanObyektSorqusudur,
        persistentPlacementMutated: false,
      });
    }
    finally {
      if (
        aktivSorquSahibidir &&
        ws &&
        ws._worldV2AktivObyektSorqulari instanceof Set &&
        aktivSorquAcari
      ) {
        ws._worldV2AktivObyektSorqulari.delete(aktivSorquAcari);
      }
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
  WORLDV2_RESURS_VIZUAL_CAVAB,
  metnAl,
  musbetTamEdedAl,
  stateIdAl,
  baxilanStateIdAl,
  istenilenResursSayiniAl,
  resursNovKodunuAl,
  worldV2ResursVizualPaketiHazirla,
  standartDovletBazalariniAl,
  standartDovletResurslariniAl,
  standartStateBerpaOlunub,
  standartStateBerpaEt,
  worldV2ProductionObyektHandleriYarat,
  dovletXeriteWorldV2ObyektProductionMesajiniEmalEt,
};