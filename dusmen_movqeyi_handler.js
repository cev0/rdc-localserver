"use strict";

const {
  dusmenMovqeyiMelumatiniHazirla,
  tutorialDusmenMovqeyiniAskarla
} = require("./dusmen_movqeyi_sistemi");

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const DUSMEN_MOVQEYI_MESAJLARI = new Set([
  "enemy_position_info_request",
  "enemy_position_inspect_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function kopyala(deyer) {
  if (deyer === undefined) return undefined;
  if (deyer === null) return null;
  return JSON.parse(JSON.stringify(deyer));
}

function neticeTipiniAl(type) {
  return type === "enemy_position_inspect_request"
    ? "enemy_position_inspect_result"
    : "enemy_position_info_result";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function dusmenMovqeyiReadStateKopyasi(state) {
  return kopyala(state) || {};
}

function dusmenMovqeyiYedeyiniAl(state) {
  return {
    varIdi: Object.prototype.hasOwnProperty.call(state, "dusmenMovqeleri"),
    deyer: kopyala(state.dusmenMovqeleri)
  };
}

function dusmenMovqeyiYedeyiniBerpaEt(state, yedek) {
  if (!state || !yedek) return;

  if (yedek.varIdi) {
    state.dusmenMovqeleri = kopyala(yedek.deyer);
  }
  else {
    delete state.dusmenMovqeleri;
  }
}

function dusmenMovqeyiImzasi(state) {
  return JSON.stringify(state && state.dusmenMovqeleri);
}

function dusmenMovqeyiMutasiyasiniTetbiqEt(
  state,
  nowMs = Date.now()
) {
  const yedek = dusmenMovqeyiYedeyiniAl(state);
  const evvelkiImza = dusmenMovqeyiImzasi(state);
  let netice;

  try {
    netice = tutorialDusmenMovqeyiniAskarla(
      state,
      nowMs
    );
  }
  catch (xeta) {
    dusmenMovqeyiYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      message: "Düşmən mövqeyi nəticəsi hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta)
    };
  }

  if (!netice || netice.success !== true) {
    dusmenMovqeyiYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      netice: netice && typeof netice === "object" ? kopyala(netice) : null,
      message: netice && netice.message
        ? netice.message
        : "Düşmən mövqeyi əməliyyatı mümkün deyil."
    };
  }

  return {
    success: true,
    deyisdi: evvelkiImza !== dusmenMovqeyiImzasi(state),
    netice: kopyala(netice)
  };
}

async function dusmenMovqeyiMesajiniEmalEt(kontekst) {
  const type = metnAl(
    kontekst && kontekst.type,
    128
  );

  if (!DUSMEN_MOVQEYI_MESAJLARI.has(type)) {
    return false;
  }

  const resultType = neticeTipiniAl(type);
  const playerId = metnAl(
    kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Düşmən mövqeyi üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(
        kontekst,
        playerId
      );
    }

    const state =
      kontekst.getOrCreatePlayerState(playerId);

    if (type === "enemy_position_info_request") {
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info: dusmenMovqeyiMelumatiniHazirla(
          dusmenMovqeyiReadStateKopyasi(state)
        )
      });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => {
        return dusmenMovqeyiMutasiyasiniTetbiqEt(
          kilidliState,
          kontekst.nowMs()
        );
      }
    );

    if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
      console.error("[DUSMEN_MOVQEYI] Mutation hesablanma xətası:", {
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
          : (netice.message || "Düşmən mövqeyi əməliyyatı mümkün deyil.")
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
    console.error("[DUSMEN_MOVQEYI]", xeta);

    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Düşmən mövqeyi əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  DUSMEN_MOVQEYI_MESAJLARI,
  dusmenMovqeyiMutasiyasiniTetbiqEt,
  dusmenMovqeyiMesajiniEmalEt
};
