"use strict";

const { expItemIstifadeEt } = require("./qehreman_exp_sistemi");
const { missiyaServerHadisesiniQeydEt } = require("./missiya_hadise_korpu");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function tamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function kopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

function qehremaniTap(state, heroId) {
  const acar = metnAl(heroId, 128).toLowerCase();
  if (!acar || !state || !Array.isArray(state.heroes)) return null;

  return state.heroes.find(qehreman =>
    qehreman && metnAl(qehreman.heroId, 128).toLowerCase() === acar
  ) || null;
}

function tutorialSkilliniTeminEt(qehreman) {
  if (!qehreman || typeof qehreman !== "object") return null;

  if (!Array.isArray(qehreman.skills)) {
    qehreman.skills = [];
  }

  let skill = qehreman.skills.find(x => x && tamEded(x.slotIndex) === 1);

  if (!skill) {
    skill = { slotIndex: 1, isUnlocked: true, skillLevel: 1 };
    qehreman.skills.push(skill);
  }

  skill.slotIndex = 1;
  skill.isUnlocked = true;
  skill.skillLevel = Math.max(1, tamEded(skill.skillLevel) || 1);
  return skill;
}

function tutorialSkilliniArtir(state, heroId) {
  const qehreman = qehremaniTap(state, heroId);

  if (!qehreman) {
    return { success: false, message: "Qəhrəman oyunçuya məxsus deyil." };
  }

  const skill = tutorialSkilliniTeminEt(qehreman);
  if (!skill) {
    return { success: false, message: "Tutorial skill state yaradıla bilmədi." };
  }

  if (skill.skillLevel >= 2) {
    return {
      success: true,
      message: "Tutorial skill upgrade artıq tamamlanıb.",
      heroId: metnAl(qehreman.heroId, 128).toLowerCase(),
      slotIndex: 1,
      oldLevel: skill.skillLevel,
      newLevel: skill.skillLevel,
      alreadyUpgraded: true,
      tutorialFreeUpgrade: true,
      spentResources: []
    };
  }

  const kohneSeviye = skill.skillLevel;
  skill.skillLevel = 2;

  return {
    success: true,
    message: "Qəhrəmanın ilk bacarığı inkişaf etdirildi.",
    heroId: metnAl(qehreman.heroId, 128).toLowerCase(),
    slotIndex: 1,
    oldLevel: kohneSeviye,
    newLevel: 2,
    alreadyUpgraded: false,
    tutorialFreeUpgrade: true,
    spentResources: []
  };
}

function skillMissiyaHadisesiVar(state) {
  const say = state && state.missions && state.missions.eventCounters
    ? Number(state.missions.eventCounters.qehreman_bacarigi_artdi)
    : 0;
  return Number.isFinite(say) && say > 0;
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
      ? tutorialSkilliniArtir(state, heroId)
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

    if (skillSorqusudur && !skillMissiyaHadisesiVar(state)) {
      await missiyaServerHadisesiniQeydEt(
        playerId,
        state,
        "qehreman_bacarigi_artdi",
        1
      );
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
