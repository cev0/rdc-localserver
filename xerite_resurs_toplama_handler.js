"use strict";

const {
  resursNodeSiyahisiniAl,
  toplamaniBaslat,
  bitmisToplamalariPendingEt,
  pendingMukafatiAl,
  toplamaMelumatiniHazirla
} = require("./xerite_resurs_toplama_sistemi");
const {
  hereketMsPerXana,
  hereketMuddetiniHesabla
} = require("./konvoy_emeliyyat_sistemi");
const { resursMovqeyiAl } = require("./xerite_movqe_sistemi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "map_resource_info_request",
  "map_resource_detail_request",
  "convoy_gather_start_request",
  "convoy_gather_status_request",
  "convoy_gather_claim_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function gonder(k, type, data) {
  k.send(k.ws, { type, ...data, serverTimeUnixMs: k.nowMs() });
}

function aktivKonvoyEmeliyyati(state, convoyId) {
  const id = metnAl(convoyId, 64);
  const active = state && state.konvoyEmeliyyatlari && state.konvoyEmeliyyatlari.activeByConvoy;
  return id && active && typeof active === "object" && active[id] ? active[id] : null;
}

function dovletIdAl(state) {
  return Math.max(
    1,
    Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1)
  );
}

function bazaMovqeyiAl(state) {
  return {
    x: Number(state && state.worldPlacement && state.worldPlacement.baseX) || 0,
    z: Number(state && state.worldPlacement && state.worldPlacement.baseZ) || 0
  };
}

async function resursDetaliHazirla(state, playerId, nodeId, nowMs) {
  const stateId = dovletIdAl(state);
  const siyahi = await resursNodeSiyahisiniAl(stateId, nowMs);
  const id = metnAl(nodeId, 128);
  const node = (siyahi.items || []).find(x => x && metnAl(x.nodeId, 128) === id) || null;
  if (!node) return null;

  const movqe = resursMovqeyiAl(stateId, node.index) || {};
  const baza = bazaMovqeyiAl(state);
  const x = Number(movqe.x) || 0;
  const z = Number(movqe.z) || 0;
  const oneWayTravelMs = hereketMuddetiniHesabla(baza.x, baza.z, x, z);
  const gatherDurationMs = Math.max(0, tamEded(node.gatherSeconds) * 1000);
  const occupiedUntilMs = tamEded(node.occupiedUntilMs);
  const respawnAtMs = tamEded(node.respawnAtMs);
  const occupied = !!metnAl(node.occupiedByPlayerId, 128);
  const remainingAmount = Math.max(0, Number(node.remainingAmount) || 0);
  const available = node.available === true;

  return {
    version: 1,
    nodeId: node.nodeId,
    stateId,
    resourceId: node.resourceId,
    level: tamEded(node.level),
    zoneId: movqe.zoneId || node.zoneId,
    presidentCenter: movqe.presidentCenter === true || node.zoneId === "president_center",
    x,
    z,
    fullAmount: Math.max(0, Number(node.amount) || 0),
    remainingAmount,
    gatherSeconds: tamEded(node.gatherSeconds),
    gatherDurationMs,
    respawnSeconds: tamEded(node.respawnSeconds),
    available,
    collectable: available,
    occupied,
    occupiedByPlayerId: node.occupiedByPlayerId || "",
    occupiedByConvoyId: node.occupiedByConvoyId || "",
    occupiedBySelf: occupied && metnAl(node.occupiedByPlayerId, 128) === metnAl(playerId, 128),
    occupiedUntilMs,
    occupiedRemainingMs: occupied ? Math.max(0, occupiedUntilMs - nowMs) : 0,
    respawnAtMs,
    respawning: !available && !occupied && respawnAtMs > nowMs,
    respawnRemainingMs: respawnAtMs > nowMs ? Math.max(0, respawnAtMs - nowMs) : 0,
    possibleReward: {
      resourceId: node.resourceId,
      amount: remainingAmount
    },
    estimatedOneWayTravelMs: oneWayTravelMs,
    estimatedGatherMs: gatherDurationMs,
    estimatedReturnTravelMs: oneWayTravelMs,
    estimatedFullOperationMs: oneWayTravelMs + gatherDurationMs + oneWayTravelMs,
    operationRequest: {
      targetType: "resource",
      targetId: node.nodeId
    }
  };
}

async function xeriteResursToplamaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const playerId = metnAl(kontekst && kontekst.ws && kontekst.ws._authedPlayerId, 128);
  const resultType = type.replace(/_request$/, "_result");

  if (!playerId) {
    gonder(kontekst, resultType, { success: false, message: "Autentifikasiya tələb olunur." });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) await oyunStateIniBerpaEt(kontekst, playerId);
    const state = kontekst.getOrCreatePlayerState(playerId);
    const nowMs = kontekst.nowMs();

    bitmisToplamalariPendingEt(state, nowMs);

    if (type === "map_resource_info_request") {
      const stateId = dovletIdAl(state);
      const info = await resursNodeSiyahisiniAl(stateId, nowMs);
      gonder(kontekst, resultType, { success: true, playerId, info, payloadJson: JSON.stringify(info) });
      return true;
    }

    if (type === "map_resource_detail_request") {
      const info = await resursDetaliHazirla(
        state,
        playerId,
        metnAl(kontekst.msg && kontekst.msg.nodeId, 128),
        nowMs
      );

      gonder(kontekst, resultType, {
        success: !!info,
        playerId,
        info,
        message: info ? "" : "Resurs node-u tapılmadı.",
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    if (type === "convoy_gather_status_request") {
      const info = toplamaMelumatiniHazirla(state, nowMs);
      await oyunStateIniYaddaSaxla(playerId, state);
      gonder(kontekst, resultType, { success: true, playerId, info, payloadJson: JSON.stringify(info) });
      return true;
    }

    if (type === "convoy_gather_start_request") {
      if (hereketMsPerXana() > 0) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          message: "Birbaşa toplama start endpoint-i deaktivdir. convoy_operation_start_request istifadə olunmalıdır."
        });
        return true;
      }

      const result = await toplamaniBaslat(
        state,
        playerId,
        metnAl(kontekst.msg && kontekst.msg.convoyId, 64),
        metnAl(kontekst.msg && kontekst.msg.nodeId, 128),
        nowMs
      );

      if (!result || result.success !== true) {
        gonder(kontekst, resultType, { success: false, playerId, message: result && result.message ? result.message : "Toplama başlamadı." });
        return true;
      }

      await oyunStateIniYaddaSaxla(playerId, state);
      gonder(kontekst, resultType, { success: true, playerId, ...result, payloadJson: JSON.stringify(result) });
      return true;
    }

    const rewardId = metnAl(kontekst.msg && kontekst.msg.rewardId, 200);

    if (hereketMsPerXana() > 0) {
      const pending = state && state.xeriteToplama && Array.isArray(state.xeriteToplama.pendingRewards)
        ? state.xeriteToplama.pendingRewards.find(x => x && metnAl(x.rewardId, 200) === rewardId)
        : null;
      const operation = pending ? aktivKonvoyEmeliyyati(state, pending.convoyId) : null;

      if (operation && operation.status && operation.status !== "idle") {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          message: "Toplama mükafatı konvoy bazaya qayıtdıqdan sonra götürülə bilər.",
          convoyStatus: operation.status,
          returnEndsAtMs: Number(operation.returnEndsAtMs) || 0
        });
        return true;
      }
    }

    const result = pendingMukafatiAl(state, rewardId);
    if (result.success === true) await oyunStateIniYaddaSaxla(playerId, state);
    gonder(kontekst, resultType, {
      success: result.success === true,
      playerId,
      message: result.message || "",
      reward: result.reward || null,
      newAmount: result.newAmount,
      info: toplamaMelumatiniHazirla(state, nowMs),
      payloadJson: JSON.stringify(result)
    });
  }
  catch (xeta) {
    console.error("[XERITE_RESURS_TOPLAMA]", xeta);
    gonder(kontekst, resultType, { success: false, playerId, message: "Xəritə resurs əməliyyatı tamamlanmadı." });
  }

  return true;
}

module.exports = { MESAJLAR, xeriteResursToplamaMesajiniEmalEt };
