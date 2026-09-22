"use strict";

const {
  kesfiyyatMelumatiniHazirla,
  tutorialKesfiyyataBasla,
  tutorialKesfiyyatiTamamla
} = require("./kesfiyyat_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const KESFIYYAT_MESAJLARI = new Set([
  "scout_info_request",
  "scout_start_request",
  "scout_complete_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function kopyala(deyer) {
  if (deyer === undefined) return undefined;
  if (deyer === null) return null;
  return JSON.parse(JSON.stringify(deyer));
}

function resultTipiniAl(type) {
  if (type === "scout_start_request") return "scout_start_result";
  if (type === "scout_complete_request") return "scout_complete_result";
  return "scout_info_result";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function kesfiyyatYedeyiniAl(state) {
  return {
    varIdi: Object.prototype.hasOwnProperty.call(state, "kesfiyyat"),
    deyer: kopyala(state.kesfiyyat)
  };
}

function kesfiyyatYedeyiniBerpaEt(state, yedek) {
  if (!state || !yedek) return;

  if (yedek.varIdi) {
    state.kesfiyyat = kopyala(yedek.deyer);
  }
  else {
    delete state.kesfiyyat;
  }
}

function kesfiyyatImzasi(state) {
  return JSON.stringify(state && state.kesfiyyat);
}

function kesfiyyatReadStateKopyasi(state) {
  return kopyala(state) || {};
}

function kesfiyyatMutasiyasiniTetbiqEt(
  state,
  type,
  nowMs = Date.now()
) {
  const startSorqusudur = type === "scout_start_request";
  const completeSorqusudur = type === "scout_complete_request";

  if (!startSorqusudur && !completeSorqusudur) {
    return {
      success: false,
      deyisdi: false,
      message: "Naməlum kəşfiyyat mutation sorğusu."
    };
  }

  const yedek = kesfiyyatYedeyiniAl(state);
  const evvelkiImza = kesfiyyatImzasi(state);
  let netice;

  try {
    netice = startSorqusudur
      ? tutorialKesfiyyataBasla(state, nowMs)
      : tutorialKesfiyyatiTamamla(state, nowMs);
  }
  catch (xeta) {
    kesfiyyatYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      message: "Kəşfiyyat nəticəsi hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta)
    };
  }

  if (!netice || netice.success !== true) {
    kesfiyyatYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      netice: netice && typeof netice === "object" ? kopyala(netice) : null,
      message: netice && netice.message
        ? netice.message
        : "Kəşfiyyat əməliyyatı mümkün deyil."
    };
  }

  return {
    success: true,
    deyisdi: evvelkiImza !== kesfiyyatImzasi(state),
    netice: kopyala(netice)
  };
}

async function kesfiyyatMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!KESFIYYAT_MESAJLARI.has(type)) return false;

  const resultType = resultTipiniAl(type);
  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId, 128);

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Kəşfiyyat üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);

    if (type === "scout_info_request") {
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info: kesfiyyatMelumatiniHazirla(
          kesfiyyatReadStateKopyasi(state),
          kontekst.nowMs()
        )
      });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => {
        return kesfiyyatMutasiyasiniTetbiqEt(
          kilidliState,
          type,
          kontekst.nowMs()
        );
      }
    );

    if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
      console.error("[KESFIYYAT] Mutation hesablanma xətası:", {
        playerId,
        message: mutasiyaNeticesi.daxiliXeta
      });
    }

    if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
      const netice = mutasiyaNeticesi && mutasiyaNeticesi.netice
        ? mutasiyaNeticesi.netice
        : {};

      gonder(kontekst, resultType, {
        success: false,
        playerId,
        ...netice,
        message: mutasiyaNeticesi && mutasiyaNeticesi.message
          ? mutasiyaNeticesi.message
          : (netice.message || "Kəşfiyyat əməliyyatı mümkün deyil.")
      });
      return true;
    }

    const netice = mutasiyaNeticesi.netice || {};

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...netice
    });
  }
  catch (xeta) {
    console.error("[KESFIYYAT]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Kəşfiyyat əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  KESFIYYAT_MESAJLARI,
  kesfiyyatMutasiyasiniTetbiqEt,
  kesfiyyatMesajiniEmalEt
};
