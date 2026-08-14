"use strict";

const { resursNodeSiyahisiniAl } = require("./xerite_resurs_toplama_sistemi");
const { dusmenSiyahisiniAl } = require("./xerite_dusmen_sistemi");
const { resursMovqeyiAl, dusmenMovqeyiAl } = require("./xerite_movqe_sistemi");
const { dovletAktivKonvoylariniAl } = require("./dovlet_konvoy_runtime_postgres");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

async function dovletXeriteKataloqMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (type !== "state_map_objects_request") return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, "state_map_objects_result", {
      success: false,
      message: "Dövlət xəritəsi üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const stateId = Math.max(
      1,
      Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1)
    );
    const nowMs = kontekst.nowMs();

    const [resursNeticesi, dusmenNeticesi, konvoyNeticesi] = await Promise.all([
      resursNodeSiyahisiniAl(stateId, nowMs),
      dusmenSiyahisiniAl(stateId, nowMs),
      dovletAktivKonvoylariniAl(stateId, nowMs)
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

    const convoys = (konvoyNeticesi.items || []).map(item => ({
      ...item,
      isSelf: metnAl(item && item.playerId, 128) === playerId
    }));

    const info = {
      version: 2,
      stateId,
      map: {
        width: 1024,
        height: 1024,
        centerX: 512,
        centerZ: 512
      },
      resources,
      enemies,
      convoys
    };

    gonder(kontekst, "state_map_objects_result", {
      success: true,
      playerId,
      info,
      payloadJson: JSON.stringify(info)
    });
  }
  catch (xeta) {
    console.error("[DOVLET_XERITE_KATALOQ]", xeta);
    gonder(kontekst, "state_map_objects_result", {
      success: false,
      playerId,
      message: "Dövlət xəritəsi obyektləri alına bilmədi."
    });
  }

  return true;
}

module.exports = {
  dovletXeriteKataloqMesajiniEmalEt
};
