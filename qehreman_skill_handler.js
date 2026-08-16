"use strict";

const {
  qehremanSkilliniAc,
  qehremanSkilliniYukselt,
  qehremanSkillMelumatiniHazirla
} = require("./qehreman_skill_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const MESAJLAR = new Set([
  "hero_skill_info_request",
  "hero_skill_unlock_request",
  "hero_skill_upgrade_request"
]);

function metn(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function gonder(k, type, data) {
  k.send(k.ws, { type, ...data, serverTimeUnixMs: k.nowMs() });
}

function yedekAl(state) {
  return {
    heroes: kopyala(state.heroes),
    resources: kopyala(state.resources),
    heroSkillMaterialsVar: Object.prototype.hasOwnProperty.call(state, "heroSkillMaterials"),
    heroSkillMaterials: kopyala(state.heroSkillMaterials)
  };
}

function yedeyiBerpaEt(state, yedek) {
  state.heroes = kopyala(yedek.heroes);
  state.resources = kopyala(yedek.resources);
  if (yedek.heroSkillMaterialsVar) state.heroSkillMaterials = kopyala(yedek.heroSkillMaterials);
  else delete state.heroSkillMaterials;
}

function qehremanSkillMutasiyasiniTetbiqEt(state, type, msg) {
  const heroId = metn(msg && msg.heroId);
  const slotIndex = Math.trunc(Number(msg && msg.slotIndex) || 0);
  const yedek = yedekAl(state);

  let netice;
  try {
    netice = type === "hero_skill_unlock_request"
      ? qehremanSkilliniAc(state, heroId, slotIndex)
      : qehremanSkilliniYukselt(state, heroId, slotIndex);
  }
  catch (e) {
    yedeyiBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      message: "Qəhrəman skill əməliyyatı hesablana bilmədi.",
      daxiliXeta: e && e.message ? e.message : String(e)
    };
  }

  if (!netice || netice.success !== true) {
    yedeyiBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      message: netice && netice.message ? netice.message : "Qəhrəman skill əməliyyatı mümkün deyil.",
      netice: kopyala(netice)
    };
  }

  return { success: true, deyisdi: true, netice: kopyala(netice) };
}

async function qehremanSkillMesajiniEmalEt(kontekst) {
  const type = metn(kontekst && kontekst.type);
  if (!MESAJLAR.has(type)) return false;

  const resultType = type.replace("_request", "_result");
  const playerId = metn(kontekst && kontekst.ws && kontekst.ws._authedPlayerId);
  const heroId = metn(kontekst && kontekst.msg && kontekst.msg.heroId);

  if (!playerId) {
    gonder(kontekst, resultType, { success: false, message: "Autentifikasiya tələb olunur." });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) await oyunStateIniBerpaEt(kontekst, playerId);
    const state = kontekst.getOrCreatePlayerState(playerId);

    if (type === "hero_skill_info_request") {
      const info = qehremanSkillMelumatiniHazirla(state, heroId);
      gonder(kontekst, resultType, {
        success: info.success === true,
        playerId,
        ...(info.success === true ? { info, payloadJson: JSON.stringify(info) } : { message: info.message })
      });
      return true;
    }

    const mutasiya = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => qehremanSkillMutasiyasiniTetbiqEt(kilidliState, type, kontekst.msg)
    );

    if (!mutasiya || mutasiya.success !== true) {
      if (mutasiya && mutasiya.daxiliXeta) console.error("[QEHRAMAN_SKILL]", mutasiya.daxiliXeta);
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: mutasiya && mutasiya.message ? mutasiya.message : "Qəhrəman skill əməliyyatı mümkün deyil.",
        details: mutasiya && mutasiya.netice ? mutasiya.netice : undefined
      });
      return true;
    }

    const info = qehremanSkillMelumatiniHazirla(state, heroId);
    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...(mutasiya.netice || {}),
      info,
      payloadJson: JSON.stringify(info)
    });
  }
  catch (e) {
    console.error("[QEHRAMAN_SKILL]", e);
    gonder(kontekst, resultType, { success: false, playerId, message: "Qəhrəman skill əməliyyatı tamamlanmadı." });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  qehremanSkillMutasiyasiniTetbiqEt,
  qehremanSkillMesajiniEmalEt
};
