"use strict";

const { expItemIstifadeEt } = require("./qehreman_exp_sistemi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function kopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

async function qehremanExpMesajiniEmalEt(kontekst) {
  if (!kontekst || kontekst.type !== "hero_exp_item_use_request") return false;

  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId, 128);
  if (!playerId) {
    kontekst.send(kontekst.ws, {
      type: "hero_exp_item_use_result",
      success: false,
      message: "Autentifikasiya tələb olunur.",
      serverTimeUnixMs: kontekst.nowMs()
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const kohneHeroes = kopyala(state.heroes || []);
    const kohneRecruit = kopyala(state.heroRecruit || {});

    const netice = expItemIstifadeEt(
      state,
      metnAl(kontekst.msg && kontekst.msg.heroId, 128).toLowerCase(),
      metnAl(kontekst.msg && kontekst.msg.rewardId, 128).toLowerCase(),
      Math.max(1, Math.trunc(Number(kontekst.msg && kontekst.msg.count) || 1)),
      kontekst.nowMs()
    );

    if (!netice.success) {
      kontekst.send(kontekst.ws, {
        type: "hero_exp_item_use_result",
        success: false,
        playerId,
        message: netice.message,
        serverTimeUnixMs: kontekst.nowMs()
      });
      return true;
    }

    if (typeof kontekst.updateServerTime === "function") {
      kontekst.updateServerTime(state);
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.heroes = kohneHeroes;
      state.heroRecruit = kohneRecruit;
      throw xeta;
    }

    kontekst.send(kontekst.ws, {
      type: "hero_exp_item_use_result",
      success: true,
      playerId,
      ...netice,
      serverTimeUnixMs: kontekst.nowMs()
    });
  }
  catch (xeta) {
    console.error("[QEHRAMAN_EXP]", xeta);
    kontekst.send(kontekst.ws, {
      type: "hero_exp_item_use_result",
      success: false,
      playerId,
      message: "EXP dəyişikliyi tamamlanmadı.",
      serverTimeUnixMs: kontekst.nowMs()
    });
  }

  return true;
}

module.exports = { qehremanExpMesajiniEmalEt };
