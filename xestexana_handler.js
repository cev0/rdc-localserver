"use strict";

const {
  xestexanaMelumatiniHazirla,
  sagaltmaPreviewHazirla,
  yaralilariSagalt
} = require("./xestexana_sistemi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "xestexana_info_request",
  "xestexana_sagaltma_preview_request",
  "xestexana_sagaltma_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

async function xestexanaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const resultType = type.replace(/_request$/, "_result");
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Xəstəxana əməliyyatı üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);

    if (type === "xestexana_info_request") {
      const info = xestexanaMelumatiniHazirla(state);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    const birlikler = Array.isArray(kontekst.msg && kontekst.msg.birlikler)
      ? kontekst.msg.birlikler
      : [];

    if (type === "xestexana_sagaltma_preview_request") {
      const preview = sagaltmaPreviewHazirla(state, birlikler);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        preview,
        payloadJson: JSON.stringify(preview)
      });
      return true;
    }

    const evvelki = JSON.parse(JSON.stringify({
      xestexana: state.xestexana || null,
      resources: state.resources || null,
      army: state.army || null
    }));

    const result = yaralilariSagalt(state, birlikler, kontekst.nowMs());

    if (!result || result.success !== true) {
      state.xestexana = evvelki.xestexana;
      state.resources = evvelki.resources;
      state.army = evvelki.army;
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: result && result.message ? result.message : "Sağaltma mümkün deyil.",
        preview: result && result.preview ? result.preview : undefined
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.xestexana = evvelki.xestexana;
      state.resources = evvelki.resources;
      state.army = evvelki.army;
      throw xeta;
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...result,
      payloadJson: JSON.stringify(result)
    });
  }
  catch (xeta) {
    console.error("[XESTEXANA]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Xəstəxana əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  xestexanaMesajiniEmalEt
};
