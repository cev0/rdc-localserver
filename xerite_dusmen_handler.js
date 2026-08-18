"use strict";

const {
  dusmenSiyahisiniAl,
  dusmenMelumatiniAl
} = require("./xerite_dusmen_sistemi");
const {
  resursNodeSiyahisiniAl
} = require("./xerite_resurs_toplama_sistemi");
const {
  dusmenMovqeyiAl,
  resursMovqeyiAl
} = require("./xerite_movqe_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "world_enemy_info_request",
  "world_enemy_detail_request",
  "world_targets_info_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function dusmenHedefiniHazirla(stateId, dusmen) {
  if (!dusmen || typeof dusmen !== "object") return null;

  const movqe = dusmenMovqeyiAl(stateId, tamEded(dusmen.index)) || {};
  const enemyId = metnAl(dusmen.enemyId, 128);

  if (!enemyId) return null;

  return {
    targetType: "enemy",
    targetId: enemyId,
    enemyId,
    stateId,
    index: tamEded(dusmen.index),
    zoneId: metnAl(movqe.zoneId || dusmen.zoneId, 64),
    level: tamEded(dusmen.level),
    enemyType: metnAl(dusmen.enemyType, 64),
    power: tamEded(dusmen.power),
    x: Number(movqe.x) || 0,
    z: Number(movqe.z) || 0,
    status: metnAl(dusmen.status, 32),
    available: dusmen.available === true,
    respawnAtMs: tamEded(dusmen.respawnAtMs)
  };
}

function resursHedefiniHazirla(stateId, node) {
  if (!node || typeof node !== "object") return null;

  const movqe = resursMovqeyiAl(stateId, tamEded(node.index)) || {};
  const nodeId = metnAl(node.nodeId, 128);

  if (!nodeId) return null;

  return {
    targetType: "resource",
    targetId: nodeId,
    nodeId,
    stateId,
    index: tamEded(node.index),
    zoneId: metnAl(node.zoneId || movqe.zoneId, 64),
    resourceId: metnAl(node.resourceId, 64),
    level: tamEded(node.level),
    x: Number(movqe.x) || 0,
    z: Number(movqe.z) || 0,
    fullAmount: Math.max(0, Number(node.amount) || 0),
    remainingAmount: Math.max(0, Number(node.remainingAmount) || 0),
    gatherSeconds: tamEded(node.gatherSeconds),
    available: node.available === true,
    occupiedByPlayerId: metnAl(node.occupiedByPlayerId, 128),
    occupiedByConvoyId: metnAl(node.occupiedByConvoyId, 64),
    occupiedUntilMs: tamEded(node.occupiedUntilMs),
    respawnAtMs: tamEded(node.respawnAtMs),
    presidentCenter: movqe.presidentCenter === true || node.zoneId === "president_center"
  };
}

async function birlesmisHedefMelumatiniHazirla(stateId, nowMs) {
  const [dusmenMelumati, resursMelumati] = await Promise.all([
    dusmenSiyahisiniAl(stateId, nowMs),
    resursNodeSiyahisiniAl(stateId, nowMs)
  ]);

  const enemies = Array.isArray(dusmenMelumati && dusmenMelumati.items)
    ? dusmenMelumati.items
        .map(x => dusmenHedefiniHazirla(stateId, x))
        .filter(Boolean)
    : [];

  const resources = Array.isArray(resursMelumati && resursMelumati.items)
    ? resursMelumati.items
        .map(x => resursHedefiniHazirla(stateId, x))
        .filter(Boolean)
    : [];

  return {
    version: 1,
    stateId,
    resources,
    enemies
  };
}

async function xeriteDusmenMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const resultType = type.replace(/_request$/, "_result");
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Düşmən xəritəsi üçün autentifikasiya tələb olunur."
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

    if (type === "world_targets_info_request") {
      const info = await birlesmisHedefMelumatiniHazirla(stateId, nowMs);

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    if (type === "world_enemy_detail_request") {
      const enemyId = metnAl(kontekst.msg && kontekst.msg.enemyId, 128);
      const enemy = await dusmenMelumatiniAl(stateId, enemyId, nowMs);

      if (!enemy) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          message: "Düşmən tapılmadı."
        });
        return true;
      }

      const movqe = dusmenMovqeyiAl(stateId, enemy.index) || {};
      const info = {
        ...enemy,
        x: Number(movqe.x) || 0,
        z: Number(movqe.z) || 0,
        zoneId: movqe.zoneId || enemy.zoneId,
        recommendedPower: Math.max(0, Math.trunc(Number(enemy.power) || 0)),
        possibleReward: enemy.reward ? { ...enemy.reward } : {},
        attackable: enemy.available === true,
        respawnRemainingMs: enemy.available === true
          ? 0
          : Math.max(0, Number(enemy.respawnAtMs || 0) - nowMs)
      };

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    const info = await dusmenSiyahisiniAl(stateId, nowMs);
    gonder(kontekst, resultType, {
      success: true,
      playerId,
      info,
      payloadJson: JSON.stringify(info)
    });
  }
  catch (xeta) {
    console.error("[WORLD_ENEMY]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Düşmən xəritəsi məlumatı alınmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  birlesmisHedefMelumatiniHazirla,
  xeriteDusmenMesajiniEmalEt
};