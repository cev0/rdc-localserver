"use strict";

const {
  tapshiriqMelumatiniHazirla,
  texnologiyaQehremaniTeyinEt,
  texnologiyaQehremaniniCixar,
  inkisafQehremaniTeyinEt,
  inkisafQehremaniniCixar
} = require("./qehreman_tapshiriq_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const MESAJLAR = new Set([
  "hero_assignment_info_request",
  "technology_hero_assign_request",
  "technology_hero_remove_request",
  "development_hero_assign_request",
  "development_hero_remove_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function kopyala(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return JSON.parse(JSON.stringify(v));
}

function gonder(k, type, data) {
  k.send(k.ws, { type, ...data, serverTimeUnixMs: k.nowMs() });
}

function tapshiriqYedeyiniAl(state) {
  return {
    varIdi: Object.prototype.hasOwnProperty.call(state, "qehremanTapshiriqlari"),
    deyer: kopyala(state.qehremanTapshiriqlari)
  };
}

function tapshiriqYedeyiniBerpaEt(state, yedek) {
  if (!state || !yedek) return;
  if (yedek.varIdi) state.qehremanTapshiriqlari = kopyala(yedek.deyer);
  else delete state.qehremanTapshiriqlari;
}

function qehremanTapshiriqMutasiyasiniTetbiqEt(state, type, msg) {
  const yedek = tapshiriqYedeyiniAl(state);
  const heroId = metnAl(msg && msg.heroId);

  let netice;
  try {
    if (type === "technology_hero_assign_request") {
      netice = texnologiyaQehremaniTeyinEt(state, heroId, metnAl(msg && msg.instituteInstanceId));
    }
    else if (type === "technology_hero_remove_request") {
      netice = texnologiyaQehremaniniCixar(state, heroId);
    }
    else if (type === "development_hero_assign_request") {
      netice = inkisafQehremaniTeyinEt(state, heroId, metnAl(msg && msg.buildingInstanceId));
    }
    else if (type === "development_hero_remove_request") {
      netice = inkisafQehremaniniCixar(state, heroId);
    }
    else {
      return { success: false, deyisdi: false, message: "Naməlum qəhrəman təyinat sorğusu." };
    }
  }
  catch (xeta) {
    tapshiriqYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      message: "Qəhrəman təyinat nəticəsi hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta)
    };
  }

  if (!netice || netice.success !== true) {
    tapshiriqYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      message: netice && netice.message ? netice.message : "Qəhrəman təyinat əməliyyatı mümkün deyil."
    };
  }

  return { success: true, deyisdi: true, netice: kopyala(netice) };
}

async function qehremanTapshiriqMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type);
  if (!MESAJLAR.has(type)) return false;

  const playerId = metnAl(kontekst && kontekst.ws && kontekst.ws._authedPlayerId);
  const resultType = type.replace("_request", "_result");
  if (!playerId) {
    gonder(kontekst, resultType, { success: false, message: "Autentifikasiya tələb olunur." });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) await oyunStateIniBerpaEt(kontekst, playerId);
    const state = kontekst.getOrCreatePlayerState(playerId);

    if (type === "hero_assignment_info_request") {
      const info = tapshiriqMelumatiniHazirla(state);
      gonder(kontekst, resultType, { success: true, playerId, info, payloadJson: JSON.stringify(info) });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => qehremanTapshiriqMutasiyasiniTetbiqEt(kilidliState, type, kontekst.msg)
    );

    if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
      if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
        console.error("[QEHRAMAN_TAPSHIRIQ] Hesablama xətası:", { playerId, message: mutasiyaNeticesi.daxiliXeta });
      }
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: mutasiyaNeticesi && mutasiyaNeticesi.message ? mutasiyaNeticesi.message : "Qəhrəman təyinat əməliyyatı mümkün deyil."
      });
      return true;
    }

    const info = tapshiriqMelumatiniHazirla(state);
    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...(mutasiyaNeticesi.netice || {}),
      info,
      payloadJson: JSON.stringify(info)
    });
  }
  catch (e) {
    console.error("[QEHRAMAN_TAPSHIRIQ]", e);
    gonder(kontekst, resultType, { success: false, playerId, message: "Qəhrəman təyinat əməliyyatı tamamlanmadı." });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  qehremanTapshiriqMutasiyasiniTetbiqEt,
  qehremanTapshiriqMesajiniEmalEt
};
