"use strict";

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");
const {
  pvpQorumaMelumatiniAl
} = require("./pvp_qoruma_sistemi");
const {
  shieldItemKataloqunuAl,
  shieldIteminiAktivEt
} = require("./pvp_shield_item_sistemi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function gonder(k, type, data) {
  k.send(k.ws, { type, ...data, serverTimeUnixMs: k.nowMs() });
}

async function stateHazirla(kontekst, playerId) {
  if (!oyuncuStateBerpaOlunub(playerId)) {
    await oyunStateIniBerpaEt(kontekst, playerId);
  }
  return kontekst.getOrCreatePlayerState(playerId);
}

async function pvpShieldMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (type !== "pvp_shield_info_request" && type !== "pvp_shield_activate_request") return false;

  const playerId = metnAl(kontekst && kontekst.ws && kontekst.ws._authedPlayerId, 128);
  const resultType = type === "pvp_shield_info_request"
    ? "pvp_shield_info_result"
    : "pvp_shield_activate_result";

  if (!playerId) {
    gonder(kontekst, resultType, { success: false, message: "PvP qalxanı üçün autentifikasiya tələb olunur." });
    return true;
  }

  try {
    const state = await stateHazirla(kontekst, playerId);
    const now = kontekst.nowMs();

    if (type === "pvp_shield_info_request") {
      const info = {
        protection: pvpQorumaMelumatiniAl(state, now),
        items: shieldItemKataloqunuAl(state)
      };
      gonder(kontekst, resultType, { success: true, playerId, info, payloadJson: JSON.stringify(info) });
      return true;
    }

    const itemId = metnAl(kontekst && kontekst.msg && kontekst.msg.itemId, 64);
    const netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => shieldIteminiAktivEt(kilidliState, itemId, now)
    );

    if (!netice || netice.success !== true) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        blocker: netice && netice.blocker ? netice.blocker : "",
        message: netice && netice.message ? netice.message : "Qoruma qalxanı aktivləşdirilmədi.",
        shieldUntilMs: netice && netice.shieldUntilMs ? netice.shieldUntilMs : 0,
        remainingMs: netice && netice.remainingMs ? netice.remainingMs : 0
      });
      return true;
    }

    const info = {
      activation: netice,
      protection: pvpQorumaMelumatiniAl(state, now),
      items: shieldItemKataloqunuAl(state)
    };
    gonder(kontekst, resultType, { success: true, playerId, info, payloadJson: JSON.stringify(info) });
    gonder(kontekst, "state", { playerId, payloadJson: JSON.stringify(kontekst.makeClientState(state)) });
  }
  catch (xeta) {
    console.error("[PVP_SHIELD]", xeta);
    gonder(kontekst, resultType, { success: false, playerId, message: "PvP qalxanı serverdə yenilənmədi." });
  }

  return true;
}

module.exports = { pvpShieldMesajiniEmalEt };
