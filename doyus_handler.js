"use strict";

const {
  doyusMelumatiniHazirla,
  tutorialDoyusunaBasla,
  tutorialDoyusunuNeticelendir
} = require("./konvoy_doyus_korpu");

const {
  tutorialDoyusMukafatiniAl
} = require("./doyus_mukafat_sistemi");

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const DOYUS_MESAJLARI = new Set([
  "battle_info_request",
  "battle_start_request",
  "battle_resolve_request",
  "battle_reward_claim_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function kopyala(deyer) {
  if (deyer === undefined) return undefined;
  if (deyer === null) return null;
  return JSON.parse(JSON.stringify(deyer));
}

function neticeTipiniAl(type) {
  if (type === "battle_start_request") return "battle_start_result";
  if (type === "battle_resolve_request") return "battle_resolve_result";
  if (type === "battle_reward_claim_request") return "battle_reward_claim_result";
  return "battle_info_result";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function saheniYedekle(state, acar) {
  return {
    varIdi: Object.prototype.hasOwnProperty.call(state, acar),
    deyer: kopyala(state[acar])
  };
}

function saheniBerpaEt(state, acar, yedek) {
  if (yedek && yedek.varIdi) state[acar] = kopyala(yedek.deyer);
  else delete state[acar];
}

function tutorialDoyusYedeyiniAl(state) {
  return {
    doyus: saheniYedekle(state, "doyus"),
    resources: saheniYedekle(state, "resources")
  };
}

function tutorialDoyusYedeyiniBerpaEt(state, yedek) {
  if (!state || !yedek) return;
  saheniBerpaEt(state, "doyus", yedek.doyus);
  saheniBerpaEt(state, "resources", yedek.resources);
}

function tutorialDoyusImzasi(state) {
  return JSON.stringify({
    doyus: state && state.doyus,
    resources: state && state.resources
  });
}

function doyusReadStateKopyasi(state) {
  return kopyala(state) || {};
}

function tutorialDoyusMutasiyasiniTetbiqEt(
  state,
  type,
  nowMs = Date.now()
) {
  const yedek = tutorialDoyusYedeyiniAl(state);
  const evvelkiImza = tutorialDoyusImzasi(state);
  let netice;

  try {
    if (type === "battle_start_request") {
      netice = tutorialDoyusunaBasla(state, nowMs);
    }
    else if (type === "battle_resolve_request") {
      netice = tutorialDoyusunuNeticelendir(state, nowMs);
    }
    else if (type === "battle_reward_claim_request") {
      netice = tutorialDoyusMukafatiniAl(state);
    }
    else {
      return {
        success: false,
        deyisdi: false,
        message: "Naməlum tutorial döyüş mutation sorğusu."
      };
    }
  }
  catch (xeta) {
    tutorialDoyusYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      message: "Döyüş nəticəsi hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta)
    };
  }

  if (!netice || netice.success !== true) {
    tutorialDoyusYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      netice: netice && typeof netice === "object" ? kopyala(netice) : null,
      message: netice && netice.message
        ? netice.message
        : "Döyüş əməliyyatı mümkün deyil."
    };
  }

  return {
    success: true,
    deyisdi: evvelkiImza !== tutorialDoyusImzasi(state),
    netice: kopyala(netice)
  };
}

async function doyusMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!DOYUS_MESAJLARI.has(type)) return false;

  const resultType = neticeTipiniAl(type);
  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId, 128);

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Döyüş üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    if (type === "battle_info_request") {
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info: doyusMelumatiniHazirla(
          doyusReadStateKopyasi(state),
          kontekst.nowMs()
        )
      });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => {
        return tutorialDoyusMutasiyasiniTetbiqEt(
          kilidliState,
          type,
          kontekst.nowMs()
        );
      }
    );

    if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
      console.error("[DOYUS] Mutation hesablanma xətası:", {
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
          : (netice.message || "Döyüş əməliyyatı mümkün deyil."),
        info: doyusMelumatiniHazirla(
          doyusReadStateKopyasi(state),
          kontekst.nowMs()
        )
      });
      return true;
    }

    const netice = mutasiyaNeticesi.netice || {};

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...netice,
      info: doyusMelumatiniHazirla(
        doyusReadStateKopyasi(state),
        kontekst.nowMs()
      )
    });
  }
  catch (xeta) {
    console.error("[DOYUS]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Döyüş əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  DOYUS_MESAJLARI,
  tutorialDoyusMutasiyasiniTetbiqEt,
  doyusMesajiniEmalEt
};
