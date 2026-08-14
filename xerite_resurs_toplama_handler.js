"use strict";

const {
  resursNodeSiyahisiniAl,
  toplamaniBaslat,
  bitmisToplamalariPendingEt,
  pendingMukafatiAl,
  toplamaMelumatiniHazirla
} = require("./xerite_resurs_toplama_sistemi");
const { hereketMsPerXana } = require("./konvoy_emeliyyat_sistemi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "map_resource_info_request",
  "convoy_gather_start_request",
  "convoy_gather_status_request",
  "convoy_gather_claim_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}
function gonder(k, type, data) {
  k.send(k.ws, { type, ...data, serverTimeUnixMs: k.nowMs() });
}

function aktivKonvoyEmeliyyati(state, convoyId) {
  const id = metnAl(convoyId, 64);
  const active = state && state.konvoyEmeliyyatlari && state.konvoyEmeliyyatlari.activeByConvoy;
  return id && active && typeof active === "object" && active[id] ? active[id] : null;
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
      const stateId = Math.max(1, Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1));
      const info = await resursNodeSiyahisiniAl(stateId, nowMs);
      gonder(kontekst, resultType, { success: true, playerId, info, payloadJson: JSON.stringify(info) });
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
  } catch (xeta) {
    console.error("[XERITE_RESURS_TOPLAMA]", xeta);
    gonder(kontekst, resultType, { success: false, playerId, message: "Xəritə resurs əməliyyatı tamamlanmadı." });
  }

  return true;
}

module.exports = { MESAJLAR, xeriteResursToplamaMesajiniEmalEt };
