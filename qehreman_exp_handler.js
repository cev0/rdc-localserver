"use strict";

const { expItemIstifadeEt } = require("./qehreman_exp_sistemi");
const { missiyaServerHadisesiniQeydEt } = require("./missiya_hadise_korpu");
const {
  requestIdAl,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
} = require("./server_sorqu_idempotentliyi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const oyuncuKilidleri = new Map();

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function tamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function kopyala(deyer) {
  if (deyer === undefined) return undefined;
  if (deyer === null) return null;
  return JSON.parse(JSON.stringify(deyer));
}

async function oyuncuKilidiIleIcraEt(playerId, emeliyyat) {
  const evvelki = oyuncuKilidleri.get(playerId) || Promise.resolve();
  let kilidiAc;
  const cari = new Promise(resolve => {
    kilidiAc = resolve;
  });

  oyuncuKilidleri.set(playerId, cari);
  await evvelki;

  try {
    return await emeliyyat();
  }
  finally {
    kilidiAc();
    if (oyuncuKilidleri.get(playerId) === cari) {
      oyuncuKilidleri.delete(playerId);
    }
  }
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

function progressYedeyiniAl(state) {
  return {
    heroesVarIdi: Object.prototype.hasOwnProperty.call(state, "heroes"),
    heroes: kopyala(state.heroes),
    heroRecruitVarIdi: Object.prototype.hasOwnProperty.call(state, "heroRecruit"),
    heroRecruit: kopyala(state.heroRecruit),
    idempotentlikVarIdi: Object.prototype.hasOwnProperty.call(
      state,
      "serverSorquIdempotentliyi"
    ),
    serverSorquIdempotentliyi: kopyala(state.serverSorquIdempotentliyi),
    serverTimeVarIdi: Object.prototype.hasOwnProperty.call(state, "serverTimeUnixMs"),
    serverTimeUnixMs: state.serverTimeUnixMs
  };
}

function progressYedeyiniBerpaEt(state, yedek) {
  if (!state || !yedek) return;

  if (yedek.heroesVarIdi) state.heroes = kopyala(yedek.heroes);
  else delete state.heroes;

  if (yedek.heroRecruitVarIdi) state.heroRecruit = kopyala(yedek.heroRecruit);
  else delete state.heroRecruit;

  if (yedek.idempotentlikVarIdi) {
    state.serverSorquIdempotentliyi = kopyala(yedek.serverSorquIdempotentliyi);
  }
  else {
    delete state.serverSorquIdempotentliyi;
  }

  if (yedek.serverTimeVarIdi) state.serverTimeUnixMs = yedek.serverTimeUnixMs;
  else delete state.serverTimeUnixMs;
}

function qehremanProgressMutasiyasiniTetbiqEt(
  state,
  type,
  msg,
  nowMs = Date.now(),
  asililiqlar = null
) {
  const expSorqusudur = type === "hero_exp_item_use_request";
  const skillSorqusudur = type === "hero_tutorial_skill_upgrade_request";

  if (!expSorqusudur && !skillSorqusudur) {
    return {
      success: false,
      deyisdi: false,
      message: "Naməlum qəhrəman inkişaf sorğusu."
    };
  }

  const heroId = metnAl(msg && msg.heroId, 128).toLowerCase();
  const rewardId = metnAl(msg && msg.rewardId, 128).toLowerCase();
  const count = Math.max(1, Math.trunc(Number(msg && msg.count) || 1));
  const requestId = expSorqusudur
    ? requestIdAl(msg && msg.requestId)
    : "";
  const requestPayload = expSorqusudur
    ? { heroId, rewardId, count }
    : null;

  if (expSorqusudur) {
    const tekrar = tekrarNeticesiniTap(
      state,
      "qehreman_exp_item_istifadesi",
      requestId,
      requestPayload
    );

    if (tekrar.conflict) {
      return {
        success: false,
        deyisdi: false,
        requestId,
        idempotentReplay: false,
        message: tekrar.message || "requestId ziddiyyəti yarandı."
      };
    }

    if (tekrar.replay) {
      const replayNetice = tekrar.result && typeof tekrar.result === "object"
        ? kopyala(tekrar.result)
        : {};

      return {
        success: true,
        deyisdi: false,
        requestId,
        idempotentReplay: true,
        netice: replayNetice,
        missionHadisesiLazimdir: false
      };
    }
  }

  const yedek = progressYedeyiniAl(state);
  const expIcraEt = asililiqlar && typeof asililiqlar.expItemIstifadeEt === "function"
    ? asililiqlar.expItemIstifadeEt
    : expItemIstifadeEt;
  const skillIcraEt = asililiqlar && typeof asililiqlar.tutorialSkilliniArtir === "function"
    ? asililiqlar.tutorialSkilliniArtir
    : tutorialSkilliniArtir;

  let netice;
  try {
    netice = skillSorqusudur
      ? skillIcraEt(state, heroId)
      : expIcraEt(state, heroId, rewardId, count, nowMs);
  }
  catch (xeta) {
    progressYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      requestId,
      idempotentReplay: false,
      message: "Qəhrəman inkişaf nəticəsi hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta)
    };
  }

  if (!netice || netice.success !== true) {
    progressYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      requestId,
      idempotentReplay: false,
      message: netice && netice.message
        ? netice.message
        : "Qəhrəman inkişaf əməliyyatı mümkün deyil."
    };
  }

  const serverVaxtiniYenile = asililiqlar && typeof asililiqlar.updateServerTime === "function"
    ? asililiqlar.updateServerTime
    : null;

  if (serverVaxtiniYenile) {
    serverVaxtiniYenile(state);
  }
  else {
    state.serverTimeUnixMs = Number(nowMs) || Date.now();
  }

  if (expSorqusudur) {
    ugurluNeticeniQeydEt(
      state,
      "qehreman_exp_item_istifadesi",
      requestId,
      requestPayload,
      netice,
      nowMs
    );
  }

  return {
    success: true,
    deyisdi: true,
    requestId,
    idempotentReplay: false,
    netice: kopyala(netice),
    missionHadisesiLazimdir:
      skillSorqusudur && !skillMissiyaHadisesiVar(state)
  };
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

    await oyuncuKilidiIleIcraEt(playerId, async () => {
      const canliState = kontekst.getOrCreatePlayerState(playerId);
      const now = kontekst.nowMs();

      const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
        playerId,
        canliState,
        async kilidliState => {
          return qehremanProgressMutasiyasiniTetbiqEt(
            kilidliState,
            type,
            kontekst.msg,
            now,
            {
              updateServerTime: typeof kontekst.updateServerTime === "function"
                ? kontekst.updateServerTime
                : null
            }
          );
        }
      );

      if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
        if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
          console.error("[QEHRAMAN_PROGRESS] Hesablama xətası:", {
            playerId,
            message: mutasiyaNeticesi.daxiliXeta
          });
        }

        kontekst.send(kontekst.ws, {
          type: resultType,
          success: false,
          playerId,
          requestId: mutasiyaNeticesi && mutasiyaNeticesi.requestId
            ? mutasiyaNeticesi.requestId
            : (expSorqusudur
                ? requestIdAl(kontekst.msg && kontekst.msg.requestId)
                : ""),
          idempotentReplay: false,
          message: mutasiyaNeticesi && mutasiyaNeticesi.message
            ? mutasiyaNeticesi.message
            : "Qəhrəman inkişaf əməliyyatı mümkün deyil.",
          serverTimeUnixMs: kontekst.nowMs()
        });
        return;
      }

      if (
        mutasiyaNeticesi.missionHadisesiLazimdir === true &&
        !skillMissiyaHadisesiVar(canliState)
      ) {
        await missiyaServerHadisesiniQeydEt(
          playerId,
          canliState,
          "qehreman_bacarigi_artdi",
          1
        );
      }

      kontekst.send(kontekst.ws, {
        type: resultType,
        success: true,
        playerId,
        requestId: mutasiyaNeticesi.requestId || "",
        idempotentReplay: mutasiyaNeticesi.idempotentReplay === true,
        ...(mutasiyaNeticesi.netice || {}),
        serverTimeUnixMs: kontekst.nowMs()
      });
    });
  }
  catch (xeta) {
    console.error("[QEHRAMAN_PROGRESS]", xeta);
    kontekst.send(kontekst.ws, {
      type: resultType,
      success: false,
      playerId,
      requestId: expSorqusudur ? requestIdAl(kontekst.msg && kontekst.msg.requestId) : "",
      idempotentReplay: false,
      message: "Qəhrəman inkişaf əməliyyatı tamamlanmadı.",
      serverTimeUnixMs: kontekst.nowMs()
    });
  }

  return true;
}

module.exports = {
  qehremanProgressMutasiyasiniTetbiqEt,
  qehremanExpMesajiniEmalEt
};
