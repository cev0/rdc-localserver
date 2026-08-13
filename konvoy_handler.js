"use strict";

const {
  konvoyMelumatiniHazirla,
  qehremaniKonvoyaYerlesdir,
  qehremaniKonvoydanCixar
} = require("./konvoy_sistemi");

const {
  konvoyQosunMelumatiniHazirla,
  konvoyQosunlariniTeyinEt
} = require("./konvoy_qosun_sistemi");

const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const KONVOY_MESAJLARI = new Set([
  "convoy_info_request",
  "convoy_hero_assign_request",
  "convoy_hero_remove_request",
  "convoy_troops_set_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function neticeTipiniAl(type) {
  if (type === "convoy_info_request") return "convoy_info_result";
  if (type === "convoy_hero_assign_request") return "convoy_hero_assign_result";
  if (type === "convoy_hero_remove_request") return "convoy_hero_remove_result";
  return "convoy_troops_set_result";
}

async function konvoyMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!KONVOY_MESAJLARI.has(type)) return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  const resultType = neticeTipiniAl(type);

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Konvoy əməliyyatı üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);

    if (type === "convoy_info_request") {
      const heroInfo = konvoyMelumatiniHazirla(state);
      const troopInfo = konvoyQosunMelumatiniHazirla(state);
      const info = {
        ...heroInfo,
        troopInfo
      };

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    const evvelkiKonvoylar = JSON.parse(JSON.stringify(state.konvoylar || {}));
    const konvoyId = metnAl(kontekst.msg && kontekst.msg.konvoyId, 64);
    const heroId = metnAl(kontekst.msg && kontekst.msg.heroId, 128);

    let netice;

    if (type === "convoy_hero_assign_request") {
      netice = qehremaniKonvoyaYerlesdir(state, konvoyId, heroId);
    }
    else if (type === "convoy_hero_remove_request") {
      netice = qehremaniKonvoydanCixar(state, konvoyId, heroId);
    }
    else {
      const troops = kontekst.msg && kontekst.msg.troops;
      netice = konvoyQosunlariniTeyinEt(state, konvoyId, troops);
    }

    if (!netice.success) {
      state.konvoylar = evvelkiKonvoylar;
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: netice.message
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.konvoylar = evvelkiKonvoylar;
      throw xeta;
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...netice,
      payloadJson: JSON.stringify(netice)
    });
  }
  catch (xeta) {
    console.error("[KONVOY]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Konvoy əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  KONVOY_MESAJLARI,
  konvoyMesajiniEmalEt
};
