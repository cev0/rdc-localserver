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
  formasiyaMelumatiniHazirla,
  formasiyaTeyinEt
} = require("./konvoy_formasiya_sistemi");

const {
  konvoyMesguldur
} = require("./konvoy_mesgul_sistemi");

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const KONVOY_MESAJLARI = new Set([
  "convoy_info_request",
  "convoy_hero_assign_request",
  "convoy_hero_remove_request",
  "convoy_troops_set_request",
  "convoy_formation_set_request"
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
  if (type === "convoy_formation_set_request") return "convoy_formation_set_result";
  return "convoy_troops_set_result";
}

function konvoyMutasiyasiniTetbiqEt(state, type, msg, nowMs = Date.now()) {
  const konvoyId = metnAl(msg && msg.konvoyId, 64);
  const heroId = metnAl(msg && msg.heroId, 128);

  const mesgul = konvoyMesguldur(state, konvoyId, nowMs);
  if (mesgul.mesguldur) {
    return {
      success: false,
      deyisdi: false,
      busyReason: mesgul.sebeb,
      mission: mesgul.mission,
      message: mesgul.message
    };
  }

  let netice;

  if (type === "convoy_hero_assign_request") {
    netice = qehremaniKonvoyaYerlesdir(state, konvoyId, heroId);
  }
  else if (type === "convoy_hero_remove_request") {
    netice = qehremaniKonvoydanCixar(state, konvoyId, heroId);
  }
  else if (type === "convoy_formation_set_request") {
    const siralar = msg && msg.siralar;
    netice = formasiyaTeyinEt(state, konvoyId, siralar);
  }
  else if (type === "convoy_troops_set_request") {
    // Legacy Unity müqaviləsi hələlik saxlanılır. Yeni UI
    // `convoy_formation_set_request` istifadə etməlidir.
    const troops = msg && msg.troops;
    netice = konvoyQosunlariniTeyinEt(state, konvoyId, troops);
  }
  else {
    return {
      success: false,
      deyisdi: false,
      message: "Naməlum konvoy mutation mesajı göndərilib."
    };
  }

  if (!netice || netice.success !== true) {
    return {
      success: false,
      deyisdi: false,
      message: netice && netice.message
        ? netice.message
        : "Konvoy mutation-u tətbiq edilə bilmədi."
    };
  }

  return {
    success: true,
    deyisdi: true,
    netice
  };
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
      const formationInfo = formasiyaMelumatiniHazirla(state);
      const info = {
        ...heroInfo,
        troopInfo,
        formationInfo
      };

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => {
        return konvoyMutasiyasiniTetbiqEt(
          kilidliState,
          type,
          kontekst.msg,
          kontekst.nowMs()
        );
      }
    );

    if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: mutasiyaNeticesi && mutasiyaNeticesi.message
          ? mutasiyaNeticesi.message
          : "Konvoy mutation-u tamamlanmadı.",
        busyReason: mutasiyaNeticesi && mutasiyaNeticesi.busyReason
          ? mutasiyaNeticesi.busyReason
          : undefined,
        mission: mutasiyaNeticesi && mutasiyaNeticesi.mission
          ? mutasiyaNeticesi.mission
          : undefined
      });
      return true;
    }

    const netice = mutasiyaNeticesi.netice || {};

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
  konvoyMutasiyasiniTetbiqEt,
  konvoyMesajiniEmalEt
};
