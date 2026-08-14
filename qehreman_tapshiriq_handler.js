"use strict";

const {
  tapshiriqMelumatiniHazirla,
  texnologiyaQehremaniTeyinEt,
  texnologiyaQehremaniniCixar
} = require("./qehreman_tapshiriq_sistemi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "hero_assignment_info_request",
  "technology_hero_assign_request",
  "technology_hero_remove_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function gonder(k, type, data) {
  k.send(k.ws, { type, ...data, serverTimeUnixMs: k.nowMs() });
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

    const evvelki = JSON.parse(JSON.stringify(state.qehremanTapshiriqlari || null));
    const heroId = metnAl(kontekst.msg && kontekst.msg.heroId);
    const netice = type === "technology_hero_assign_request"
      ? texnologiyaQehremaniTeyinEt(state, heroId, metnAl(kontekst.msg && kontekst.msg.instituteInstanceId))
      : texnologiyaQehremaniniCixar(state, heroId);

    if (!netice.success) {
      state.qehremanTapshiriqlari = evvelki;
      gonder(kontekst, resultType, { success: false, playerId, message: netice.message });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    } catch (e) {
      state.qehremanTapshiriqlari = evvelki;
      throw e;
    }

    const info = tapshiriqMelumatiniHazirla(state);
    gonder(kontekst, resultType, { success: true, playerId, ...netice, info, payloadJson: JSON.stringify(info) });
  } catch (e) {
    console.error("[QEHRAMAN_TAPSHIRIQ]", e);
    gonder(kontekst, resultType, { success: false, playerId, message: "Qəhrəman təyinat əməliyyatı tamamlanmadı." });
  }

  return true;
}

module.exports = { MESAJLAR, qehremanTapshiriqMesajiniEmalEt };
