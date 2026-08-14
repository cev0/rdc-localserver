"use strict";

const { resursNodeSiyahisiniAl } = require("./xerite_resurs_toplama_sistemi");
const { dusmenSiyahisiniAl } = require("./xerite_dusmen_sistemi");
const { resursMovqeyiAl, dusmenMovqeyiAl } = require("./xerite_movqe_sistemi");
const {
  PVP_KAMP_STATUSU,
  dovletAktivKonvoylariniAl
} = require("./dovlet_konvoy_runtime_postgres");
const { dovletBazalariniAl } = require("./dovlet_baza_kataloqu_postgres");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "state_map_static_request",
  "state_map_dynamic_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
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
    tamEded(state && state.worldPlacement && state.worldPlacement.stateId) || 1
  );
}

async function hazirla(kontekst, resultType) {
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
    stateId: stateIdAl(state)
  };
}

function resurslariHazirla(stateId, items) {
  return (items || []).map(item => {
    const movqe = resursMovqeyiAl(stateId, item.index) || {};
    return {
      ...item,
      x: Number(movqe.x) || 0,
      z: Number(movqe.z) || 0,
      zoneId: movqe.zoneId || item.zoneId,
      presidentCenter: movqe.presidentCenter === true || item.zoneId === "president_center"
    };
  });
}

function dusmenleriHazirla(stateId, items) {
  return (items || []).map(item => {
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
}

function publicKonvoylariHazirla(playerId, items) {
  return (items || []).map(item => ({
    ...item,
    isSelf: metnAl(item && item.playerId, 128) === playerId
  }));
}

function campHazirla(item, stateId) {
  return {
    objectType: "pvp_camp",
    campId: metnAl(item && item.publicId, 220),
    playerId: metnAl(item && item.playerId, 128),
    convoyId: metnAl(item && item.convoyId, 64),
    targetPlayerId: metnAl(item && item.targetPlayerId, 128),
    stateId: Math.max(1, tamEded(item && item.stateId) || stateId),
    x: Number(item && item.x) || Number(item && item.targetX) || 0,
    z: Number(item && item.z) || Number(item && item.targetZ) || 0,
    status: PVP_KAMP_STATUSU,
    reason: metnAl(item && item.campReason, 64) || "target_relocated",
    originalTargetX: Number(item && item.targetX) || 0,
    originalTargetZ: Number(item && item.targetZ) || 0,
    isSelf: item && item.isSelf === true,
    campDurationConfigured: false,
    campReturnRuleConfigured: false
  };
}

async function statikLayeriGonder(kontekst, hazir) {
  const { playerId, stateId } = hazir;
  const nowMs = kontekst.nowMs();

  const [resursNeticesi, dusmenNeticesi, bazaNeticesi] = await Promise.all([
    resursNodeSiyahisiniAl(stateId, nowMs),
    dusmenSiyahisiniAl(stateId, nowMs),
    dovletBazalariniAl(stateId, nowMs)
  ]);

  const info = {
    version: 1,
    layer: "static",
    stateId,
    map: {
      width: 1024,
      height: 1024,
      centerX: 512,
      centerZ: 512
    },
    bases: (bazaNeticesi.bases || []).map(item => ({
      ...item,
      isSelf: metnAl(item && item.playerId, 128) === playerId
    })),
    resources: resurslariHazirla(stateId, resursNeticesi.items),
    enemies: dusmenleriHazirla(stateId, dusmenNeticesi.items)
  };

  gonder(kontekst, "state_map_static_result", {
    success: true,
    playerId,
    info,
    payloadJson: JSON.stringify(info)
  });
}

async function dinamikLayeriGonder(kontekst, hazir) {
  const { playerId, stateId } = hazir;
  const nowMs = kontekst.nowMs();
  const konvoyNeticesi = await dovletAktivKonvoylariniAl(stateId, nowMs);
  const publicItems = publicKonvoylariHazirla(playerId, konvoyNeticesi.items);

  const camps = publicItems
    .filter(item => metnAl(item && item.status, 64) === PVP_KAMP_STATUSU)
    .map(item => campHazirla(item, stateId));
  const convoys = publicItems.filter(
    item => metnAl(item && item.status, 64) !== PVP_KAMP_STATUSU
  );

  const info = {
    version: 1,
    layer: "dynamic",
    stateId,
    convoys,
    camps
  };

  gonder(kontekst, "state_map_dynamic_result", {
    success: true,
    playerId,
    info,
    payloadJson: JSON.stringify(info)
  });
}

async function dovletXeriteLayerMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const resultType = type === "state_map_static_request"
    ? "state_map_static_result"
    : "state_map_dynamic_result";

  try {
    const hazir = await hazirla(kontekst, resultType);
    if (!hazir) return true;

    if (type === "state_map_static_request") {
      await statikLayeriGonder(kontekst, hazir);
    }
    else {
      await dinamikLayeriGonder(kontekst, hazir);
    }
  }
  catch (xeta) {
    console.error("[DOVLET_XERITE_LAYER]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId: metnAl(
        kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
        128
      ),
      message: "Dövlət xəritə layer-i alına bilmədi."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  dovletXeriteLayerMesajiniEmalEt
};
