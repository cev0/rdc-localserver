"use strict";

const { resursNodeSiyahisiniAl } = require("./xerite_resurs_toplama_sistemi");
const { dusmenSiyahisiniAl } = require("./xerite_dusmen_sistemi");
const { resursMovqeyiAl, dusmenMovqeyiAl } = require("./xerite_movqe_sistemi");
const {
  PVP_KAMP_STATUSU,
  dovletAktivKonvoylariniAl
} = require("./dovlet_konvoy_runtime_postgres");
const {
  dovletBazalariniAl,
  dovletBazasiniAl
} = require("./dovlet_baza_kataloqu_postgres");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "state_map_objects_request",
  "state_base_detail_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function publicMetnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

function stateIdAl(state) {
  return Math.max(
    1,
    Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1)
  );
}

function publicBazaDetaliniHazirla(baza, requestingPlayerId) {
  const requester = metnAl(requestingPlayerId, 128);
  const target = metnAl(baza && baza.playerId, 128);
  const isSelf = requester && target && requester === target;

  return {
    targetType: "player_base",
    playerId: target,
    stateId: Math.max(1, Math.trunc(Number(baza && baza.stateId) || 1)),
    x: Number(baza && baza.x) || 0,
    z: Number(baza && baza.z) || 0,
    baseX: Number(baza && baza.baseX) || 0,
    baseZ: Number(baza && baza.baseZ) || 0,
    zoneId: metnAl(baza && baza.zoneId, 64),
    distanceToCenter: Math.max(0, Math.trunc(Number(baza && baza.distanceToCenter) || 0)),
    hqLevel: Math.max(0, Math.trunc(Number(baza && baza.hqLevel) || 0)),
    completedBuildingCount: Math.max(
      0,
      Math.trunc(Number(baza && baza.completedBuildingCount) || 0)
    ),
    publicPower: Number.isFinite(Number(baza && baza.publicPower))
      ? Math.max(0, Math.trunc(Number(baza.publicPower)))
      : null,
    commanderName: publicMetnAl(baza && baza.commanderName, 64),
    allianceName: publicMetnAl(baza && baza.allianceName, 80),
    allianceId: null,
    isSelf,
    pvp: {
      enabled: false,
      canAttack: false,
      reason: isSelf ? "self_base" : "pvp_not_enabled"
    }
  };
}

async function autentifikasiyaVeStateHazirla(kontekst, resultType) {
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Dövlət xəritəsi üçün autentifikasiya tələb olunur."
    });
    return null;
  }

  if (!oyuncuStateBerpaOlunub(playerId)) {
    await oyunStateIniBerpaEt(kontekst, playerId);
  }

  const state = kontekst.getOrCreatePlayerState(playerId);
  return {
    playerId,
    state,
    stateId: stateIdAl(state)
  };
}

async function dovletBazaDetaliSorqusunuEmalEt(kontekst) {
  const hazir = await autentifikasiyaVeStateHazirla(
    kontekst,
    "state_base_detail_result"
  );
  if (!hazir) return true;

  const targetPlayerId = metnAl(
    kontekst && kontekst.msg && kontekst.msg.targetPlayerId,
    128
  );

  if (!targetPlayerId) {
    gonder(kontekst, "state_base_detail_result", {
      success: false,
      playerId: hazir.playerId,
      message: "Baza məlumatı üçün targetPlayerId tələb olunur."
    });
    return true;
  }

  const baza = await dovletBazasiniAl(
    hazir.stateId,
    targetPlayerId,
    kontekst.nowMs()
  );

  if (!baza) {
    gonder(kontekst, "state_base_detail_result", {
      success: false,
      playerId: hazir.playerId,
      targetPlayerId,
      message: "Hədəf baza cari Dövlətdə tapılmadı."
    });
    return true;
  }

  const detail = publicBazaDetaliniHazirla(baza, hazir.playerId);

  gonder(kontekst, "state_base_detail_result", {
    success: true,
    playerId: hazir.playerId,
    targetPlayerId,
    detail,
    payloadJson: JSON.stringify(detail)
  });

  return true;
}

async function dovletXeriteObyektleriSorqusunuEmalEt(kontekst) {
  const hazir = await autentifikasiyaVeStateHazirla(
    kontekst,
    "state_map_objects_result"
  );
  if (!hazir) return true;

  const { playerId, stateId } = hazir;
  const nowMs = kontekst.nowMs();

  const [resursNeticesi, dusmenNeticesi, konvoyNeticesi, bazaNeticesi] = await Promise.all([
    resursNodeSiyahisiniAl(stateId, nowMs),
    dusmenSiyahisiniAl(stateId, nowMs),
    dovletAktivKonvoylariniAl(stateId, nowMs),
    dovletBazalariniAl(stateId, nowMs)
  ]);

  const resources = (resursNeticesi.items || []).map(item => {
    const movqe = resursMovqeyiAl(stateId, item.index) || {};
    return {
      ...item,
      x: Number(movqe.x) || 0,
      z: Number(movqe.z) || 0,
      zoneId: movqe.zoneId || item.zoneId,
      presidentCenter: movqe.presidentCenter === true || item.zoneId === "president_center"
    };
  });

  const enemies = (dusmenNeticesi.items || []).map(item => {
    const movqe = dusmenMovqeyiAl(stateId, item.index) || {};
    return {
      ...item,
      x: Number(movqe.x) || 0,
      z: Number(movqe.z) || 0,
      zoneId: movqe.zoneId || item.zoneId,
      recommendedPower: Math.max(0, Math.trunc(Number(item.power) || 0)),
      possibleReward: item.reward ? { ...item.reward } : {}
    };
  });

  const publicKonvoylar = (konvoyNeticesi.items || []).map(item => ({
    ...item,
    isSelf: metnAl(item && item.playerId, 128) === playerId
  }));

  const camps = publicKonvoylar
    .filter(item => metnAl(item && item.status, 64) === PVP_KAMP_STATUSU)
    .map(item => ({
      objectType: "pvp_camp",
      campId: metnAl(item && item.publicId, 220),
      playerId: metnAl(item && item.playerId, 128),
      convoyId: metnAl(item && item.convoyId, 64),
      targetPlayerId: metnAl(item && item.targetPlayerId, 128),
      stateId: Math.max(1, Math.trunc(Number(item && item.stateId) || stateId)),
      x: Number(item && item.x) || Number(item && item.targetX) || 0,
      z: Number(item && item.z) || Number(item && item.targetZ) || 0,
      status: PVP_KAMP_STATUSU,
      reason: metnAl(item && item.campReason, 64) || "target_relocated",
      originalTargetX: Number(item && item.targetX) || 0,
      originalTargetZ: Number(item && item.targetZ) || 0,
      isSelf: item && item.isSelf === true,
      campDurationConfigured: false,
      campReturnRuleConfigured: false
    }));

  const convoys = publicKonvoylar.filter(
    item => metnAl(item && item.status, 64) !== PVP_KAMP_STATUSU
  );

  const bases = (bazaNeticesi.bases || []).map(item => ({
    ...item,
    isSelf: metnAl(item && item.playerId, 128) === playerId
  }));

  const info = {
    version: 6,
    stateId,
    map: {
      width: 1024,
      height: 1024,
      centerX: 512,
      centerZ: 512
    },
    bases,
    resources,
    enemies,
    convoys,
    camps
  };

  gonder(kontekst, "state_map_objects_result", {
    success: true,
    playerId,
    info,
    payloadJson: JSON.stringify(info)
  });

  return true;
}

async function dovletXeriteKataloqMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  try {
    if (type === "state_base_detail_request") {
      return await dovletBazaDetaliSorqusunuEmalEt(kontekst);
    }

    return await dovletXeriteObyektleriSorqusunuEmalEt(kontekst);
  }
  catch (xeta) {
    console.error("[DOVLET_XERITE_KATALOQ]", xeta);
    const resultType = type === "state_base_detail_request"
      ? "state_base_detail_result"
      : "state_map_objects_result";

    gonder(kontekst, resultType, {
      success: false,
      playerId: metnAl(
        kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
        128
      ),
      message: type === "state_base_detail_request"
        ? "Baza məlumatı alına bilmədi."
        : "Dövlət xəritəsi obyektləri alına bilmədi."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  dovletXeriteKataloqMesajiniEmalEt
};
