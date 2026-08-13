"use strict";

const { expItemIstifadeEt } = require("./qehreman_exp_sistemi");
const { tutorialSkilliniArtir } = require("./qehreman_skill_sistemi");
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
  const type = kontekst && kontekst.type;
  const expSorqusudur = type === "hero_exp_item_use_request";
  const skillSorqusudur = type === "hero_tutorial_skill_upgrade_request";

  if (!expSorqusudur && !skillSorqusudur) return false;

  const resultType = skillSorqusudur
    ? "hero_tutorial_skill_upgrade_result"
    : "hero_exp_item_use_result";

  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId, 128);
  if (!playerId) {
    kontekst.send(kontekst.ws, {
      type: resultType,
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
    const heroId = metnAl(kontekst.msg && kontekst.msg.heroId, 128).toLowerCase();

    const netice = skillSorqusudur
      ? tutorialSkilliniArtir(state, heroId, 1)
      : expItemIstifadeEt(
          state,
          heroId,
          metnAl(kontekst.msg && kontekst.msg.rewardId, 128).toLowerCase(),
          Math.max(1, Math.trunc(Number(kontekst.msg && kontekst.msg.count) || 1)),
          kontekst.nowMs()
        );

    if (!netice.success) {
      kontekst.send(kontekst.ws, {
        type: resultType,
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
      type: resultType,
      success: true,
      playerId,
      ...netice,
      serverTimeUnixMs: kontekst.nowMs()
    });
  }
  catch (xeta) {
    console.error("[QEHRAMAN_PROGRESS]", xeta);
    kontekst.send(kontekst.ws, {
      type: resultType,
      success: false,
      playerId,
      message: "Qəhrəman inkişaf əməliyyatı tamamlanmadı.",
      serverTimeUnixMs: kontekst.nowMs()
    });
  }

  return true;
}

module.exports = { qehremanExpMesajiniEmalEt };
