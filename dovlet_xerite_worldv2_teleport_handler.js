"use strict";

const {
  DOVLET_XERITESI_V2,
  koordinatEtibarlidir,
} = require("./dovlet_xerite_worldv2_qaydalari");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub,
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt,
} = require("./oyun_state_mutasiya_postgres");
const {
  dovletBazalariniBirbasaPostgresdenAlClient,
  dovletBazaKeshiniTemizle,
} = require("./dovlet_baza_kataloqu_postgres");
const {
  worldV2ResurslariniAl,
} = require("./dovlet_xerite_worldv2_resurs_provider");

const WORLDV2_TELEPORT_SORGU = "state_map_v2_base_teleport_request";
const WORLDV2_TELEPORT_CAVAB = "state_map_v2_base_teleport_result";
const WORLDV2_TELEPORT_SERHED_PAYI = 4;
const WORLDV2_TELEPORT_BAZA_MIN_MESAFE = 8;
const WORLDV2_TELEPORT_RESURS_MIN_MESAFE = 7;
const WORLDV2_TELEPORT_PREZIDENT_MIN_MESAFE = 45;
const WORLDV2_TELEPORT_STATE_KILIDI = "worldv2_baza_teleport_state_v1";

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function tamEdedAl(deyer) {
  const reqem = Number(deyer);
  return Number.isInteger(reqem) ? reqem : null;
}

function mesafeKvadrati(x1, y1, x2, y2) {
  const dx = Number(x1) - Number(x2);
  const dy = Number(y1) - Number(y2);
  return (dx * dx) + (dy * dy);
}

function bazaKoordinatiniAl(baza) {
  if (!baza || typeof baza !== "object") return null;
  const x = Number(baza.x != null ? baza.x : baza.baseX);
  const y = Number(
    baza.y != null
      ? baza.y
      : (baza.z != null ? baza.z : baza.baseZ),
  );
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function teleportYeriYoxla({
  playerId,
  x,
  y,
  cariX,
  cariY,
  bases = [],
  resources = [],
} = {}) {
  if (!koordinatEtibarlidir(x, y) ||
      !Number.isInteger(Number(x)) ||
      !Number.isInteger(Number(y))) {
    return {
      success: false,
      errorCode: "WORLDV2_TELEPORT_COORDINATE_INVALID",
      message: "Teleport koordinatı xəritə sərhədində tam ədəd olmalıdır.",
    };
  }

  const tx = Number(x);
  const ty = Number(y);
  const min = DOVLET_XERITESI_V2.minimumKoordinat + WORLDV2_TELEPORT_SERHED_PAYI;
  const max = DOVLET_XERITESI_V2.maksimumKoordinat - WORLDV2_TELEPORT_SERHED_PAYI;

  if (tx < min || tx > max || ty < min || ty > max) {
    return {
      success: false,
      errorCode: "WORLDV2_TELEPORT_BORDER_BLOCKED",
      message: "Baza xəritə sərhədinə bu qədər yaxın yerləşdirilə bilməz.",
    };
  }

  if (Number.isFinite(Number(cariX)) && Number.isFinite(Number(cariY)) &&
      tx === Number(cariX) && ty === Number(cariY)) {
    return {
      success: false,
      errorCode: "WORLDV2_TELEPORT_ALREADY_THERE",
      message: "Bazanız artıq bu koordinatdadır.",
    };
  }

  if (mesafeKvadrati(
    tx,
    ty,
    DOVLET_XERITESI_V2.prezidentMerkezi.x,
    DOVLET_XERITESI_V2.prezidentMerkezi.y,
  ) < WORLDV2_TELEPORT_PREZIDENT_MIN_MESAFE ** 2) {
    return {
      success: false,
      errorCode: "WORLDV2_TELEPORT_RESERVED_ZONE",
      message: "Prezident mərkəzi və müdafiə sahəsi teleport üçün qorunur.",
    };
  }

  const normalizedPlayerId = metnAl(playerId, 128).toLowerCase();
  for (const baza of Array.isArray(bases) ? bases : []) {
    const bazaPlayerId = metnAl(baza && baza.playerId, 128).toLowerCase();
    if (!bazaPlayerId || bazaPlayerId === normalizedPlayerId) continue;

    const koordinat = bazaKoordinatiniAl(baza);
    if (koordinat && mesafeKvadrati(tx, ty, koordinat.x, koordinat.y) <
        WORLDV2_TELEPORT_BAZA_MIN_MESAFE ** 2) {
      return {
        success: false,
        errorCode: "WORLDV2_TELEPORT_BASE_OCCUPIED",
        message: "Seçilən koordinat başqa bazaya çox yaxındır.",
      };
    }
  }

  for (const resurs of Array.isArray(resources) ? resources : []) {
    const rx = Number(resurs && resurs.x);
    const ry = Number(resurs && (resurs.y != null ? resurs.y : resurs.z));
    if (!Number.isFinite(rx) || !Number.isFinite(ry)) continue;

    if (mesafeKvadrati(tx, ty, rx, ry) <
        WORLDV2_TELEPORT_RESURS_MIN_MESAFE ** 2) {
      return {
        success: false,
        errorCode: "WORLDV2_TELEPORT_RESOURCE_OCCUPIED",
        message: "Seçilən koordinat resurs sahəsinə çox yaxındır.",
      };
    }
  }

  return { success: true, x: tx, y: ty };
}

function gonder(kontekst, melumat) {
  if (!kontekst || typeof kontekst.send !== "function") {
    throw new Error("WorldV2 teleport handler üçün send funksiyası tələb olunur.");
  }

  kontekst.send(kontekst.ws, {
    type: WORLDV2_TELEPORT_CAVAB,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === "function"
      ? kontekst.nowMs()
      : Date.now(),
  });
}

function worldPlacementAl(state) {
  const placement = state && state.worldPlacement;
  const stateId = tamEdedAl(placement && placement.stateId);
  const baseX = Number(placement && placement.baseX);
  const baseZ = Number(placement && placement.baseZ);

  if (!placement || stateId === null || stateId <= 0 ||
      !Number.isFinite(baseX) || !Number.isFinite(baseZ)) {
    return null;
  }

  return { placement, stateId, baseX, baseZ };
}

async function standartStateBerpaEt(kontekst, playerId) {
  return await oyunStateIniBerpaEt(kontekst, playerId);
}

async function standartStateMutasiyaEt(playerId, state, emeliyyat) {
  return await oyuncuStateMutasiyasiniPostgresIleIcraEt(
    playerId,
    state,
    emeliyyat,
  );
}

async function standartBazalariKilidliAl(client, stateId) {
  return await dovletBazalariniBirbasaPostgresdenAlClient(client, stateId);
}

async function standartResurslariAl(stateId, bases, nowMs) {
  return await worldV2ResurslariniAl(stateId, bases, nowMs);
}

function worldV2TeleportHandleriYarat({
  stateBerpaOlunub = oyuncuStateBerpaOlunub,
  stateBerpaEt = standartStateBerpaEt,
  stateMutasiyaEt = standartStateMutasiyaEt,
  bazalariKilidliAl = standartBazalariKilidliAl,
  resurslariAl = standartResurslariAl,
  bazaKeshiniTemizle = dovletBazaKeshiniTemizle,
} = {}) {
  return async function dovletXeriteWorldV2TeleportMesajiniEmalEt(kontekst) {
    const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
    if (type !== WORLDV2_TELEPORT_SORGU) return false;

    const playerId = metnAl(
      kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
      128,
    );

    if (!playerId) {
      gonder(kontekst, {
        success: false,
        errorCode: "WORLDV2_AUTH_REQUIRED",
        message: "Baza teleportu üçün autentifikasiya tələb olunur.",
      });
      return true;
    }

    const x = tamEdedAl(kontekst && kontekst.msg && kontekst.msg.x);
    const y = tamEdedAl(kontekst && kontekst.msg && kontekst.msg.y);
    const requestedStateId = tamEdedAl(
      kontekst && kontekst.msg && kontekst.msg.stateId,
    );

    if (x === null || y === null || !koordinatEtibarlidir(x, y)) {
      gonder(kontekst, {
        success: false,
        playerId,
        stateId: requestedStateId || 0,
        x: x || 0,
        y: y || 0,
        errorCode: "WORLDV2_TELEPORT_COORDINATE_INVALID",
        message: "Teleport koordinatı etibarsızdır.",
      });
      return true;
    }

    try {
      if (!stateBerpaOlunub(playerId))
        await stateBerpaEt(kontekst, playerId);

      if (typeof kontekst.getOrCreatePlayerState !== "function")
        throw new Error("getOrCreatePlayerState kontekstdə yoxdur.");

      const state = kontekst.getOrCreatePlayerState(playerId);
      const ilkPlacement = worldPlacementAl(state);
      if (!ilkPlacement) {
        gonder(kontekst, {
          success: false,
          playerId,
          stateId: requestedStateId || 0,
          x,
          y,
          errorCode: "WORLDV2_PLACEMENT_MISSING",
          message: "Oyunçunun Dövlət xəritəsi yerləşməsi tapılmadı.",
        });
        return true;
      }

      if (requestedStateId === null || requestedStateId !== ilkPlacement.stateId) {
        gonder(kontekst, {
          success: false,
          playerId,
          stateId: ilkPlacement.stateId,
          x,
          y,
          errorCode: "WORLDV2_TELEPORT_STATE_MISMATCH",
          message: "Baza yalnız öz Dövlətiniz daxilində köçürülə bilər.",
        });
        return true;
      }

      const nowMs = typeof kontekst.nowMs === "function"
        ? Math.max(0, Math.trunc(Number(kontekst.nowMs()) || 0))
        : Date.now();

      const netice = await stateMutasiyaEt(
        playerId,
        state,
        async (kilidliState, transactionKonteksti = {}) => {
          const placement = worldPlacementAl(kilidliState);
          if (!placement || placement.stateId !== requestedStateId) {
            return {
              deyisdi: false,
              success: false,
              errorCode: "WORLDV2_TELEPORT_STATE_MISMATCH",
              message: "Dövlət yerləşməsi dəyişdiyi üçün teleport dayandırıldı.",
            };
          }

          const client = transactionKonteksti.client;
          if (!client || typeof client.query !== "function") {
            throw new Error("WorldV2 teleport transaction client-i yoxdur.");
          }

          // Fərqli oyunçuların eyni anda eyni boş koordinatı seçməsi bu
          // Dövlət səviyyəli transaction kilidi ilə seriallaşdırılır.
          await client.query(
            "SELECT pg_advisory_xact_lock(hashtext($1))",
            [WORLDV2_TELEPORT_STATE_KILIDI + ":" + placement.stateId],
          );

          const bazaPaketi = await bazalariKilidliAl(client, placement.stateId);
          const bases = Array.isArray(bazaPaketi && bazaPaketi.bases)
            ? bazaPaketi.bases
            : [];
          const resursPaketi = await resurslariAl(
            placement.stateId,
            bases,
            nowMs,
          );
          const resources = Array.isArray(resursPaketi && resursPaketi.resources)
            ? resursPaketi.resources
            : [];

          const yoxlama = teleportYeriYoxla({
            playerId,
            x,
            y,
            cariX: placement.baseX,
            cariY: placement.baseZ,
            bases,
            resources,
          });

          if (!yoxlama.success)
            return { ...yoxlama, deyisdi: false };

          placement.placement.baseX = x;
          placement.placement.baseZ = y;
          placement.placement.lastTeleportAtMs = nowMs;

          if (typeof kontekst.updateServerTime === "function")
            kontekst.updateServerTime(kilidliState);

          return {
            deyisdi: true,
            success: true,
            stateId: placement.stateId,
            x,
            y,
            message: "Baza yeni koordinata köçürüldü.",
          };
        },
      );

      const cavab = {
        success: !!(netice && netice.success),
        playerId,
        stateId: requestedStateId,
        x,
        y,
        errorCode: netice && netice.errorCode ? netice.errorCode : "",
        message: netice && netice.message
          ? netice.message
          : "Teleport serverdə tamamlanmadı.",
      };

      if (cavab.success) {
        bazaKeshiniTemizle(requestedStateId);
        gonder(kontekst, cavab);

        if (typeof kontekst.makeClientState === "function") {
          kontekst.send(kontekst.ws, {
            type: "state",
            playerId,
            serverTimeUnixMs: nowMs,
            payloadJson: JSON.stringify(kontekst.makeClientState(state)),
          });
        }
      } else {
        gonder(kontekst, cavab);
      }
    }
    catch (xeta) {
      console.error("[DÖVLƏT XƏRİTƏSİ WORLDV2 TELEPORT]", xeta);
      gonder(kontekst, {
        success: false,
        playerId,
        stateId: requestedStateId || 0,
        x,
        y,
        errorCode: "WORLDV2_TELEPORT_FAILED",
        message: "Baza teleportu serverdə tamamlanmadı.",
      });
    }

    return true;
  };
}

const dovletXeriteWorldV2TeleportMesajiniEmalEt =
  worldV2TeleportHandleriYarat();

module.exports = {
  WORLDV2_TELEPORT_SORGU,
  WORLDV2_TELEPORT_CAVAB,
  WORLDV2_TELEPORT_SERHED_PAYI,
  WORLDV2_TELEPORT_BAZA_MIN_MESAFE,
  WORLDV2_TELEPORT_RESURS_MIN_MESAFE,
  WORLDV2_TELEPORT_PREZIDENT_MIN_MESAFE,
  teleportYeriYoxla,
  worldV2TeleportHandleriYarat,
  dovletXeriteWorldV2TeleportMesajiniEmalEt,
};
