"use strict";

const {
  resursHesabatiStateTeminEt,
  resursHesabatiSiyahisiniHazirla,
  resursHesabatiDetaliHazirla,
  resursHesabatiniOxunmusEt,
  resursHesabatiniFavoritEt,
  resursHesabatiniSil
} = require("./resurs_hesabati_sistemi");

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const MESAJLAR = new Set([
  "resurs_hesabatlari_getir_request",
  "resurs_hesabati_detal_request",
  "resurs_hesabati_oxu_request",
  "resurs_hesabati_favorit_request",
  "resurs_hesabati_sil_request"
]);

function metnAl(deyer, maksimum = 220) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function kopyala(deyer) {
  return deyer == null
    ? null
    : JSON.parse(JSON.stringify(deyer));
}

function gonder(kontekst, type, data) {
  kontekst.send(kontekst.ws, {
    type,
    ...data,
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
  if (yedek && yedek.varIdi) {
    state[acar] = kopyala(yedek.deyer);
  }
  else {
    delete state[acar];
  }
}

function hesabatMutasiyaImzasi(state) {
  return JSON.stringify(state && state.resursHesabatlari);
}

function hesabatReadStateKopyasi(state) {
  return kopyala(state) || {};
}

function siyahiNeticesiniHazirla(state, limit = 50) {
  const readState = hesabatReadStateKopyasi(state);
  const hesabatState = resursHesabatiStateTeminEt(readState);
  const hesabatlar = resursHesabatiSiyahisiniHazirla(readState, limit);
  const umumiSay = Array.isArray(hesabatState.items)
    ? hesabatState.items.length
    : 0;
  const oxunmamisSay = Array.isArray(hesabatState.items)
    ? hesabatState.items.filter(x => x && x.oxunub !== true).length
    : 0;

  return {
    success: true,
    xetaKodu: "",
    mesaj: "Resurs hesabatları gətirildi.",
    umumiSay,
    oxunmamisSay,
    hesabatlar
  };
}

function resursHesabatiMutasiyasiniTetbiqEt(
  state,
  type,
  msg,
  nowMs = Date.now()
) {
  const hesabatId = metnAl(msg && msg.hesabatId, 220);
  const yedek = saheniYedekle(state, "resursHesabatlari");
  const evvelkiImza = hesabatMutasiyaImzasi(state);
  let result;

  try {
    if (type === "resurs_hesabati_oxu_request") {
      result = resursHesabatiniOxunmusEt(
        state,
        hesabatId,
        nowMs
      );
    }
    else if (type === "resurs_hesabati_favorit_request") {
      result = resursHesabatiniFavoritEt(
        state,
        hesabatId,
        msg && msg.favoritdir === true,
        nowMs
      );
    }
    else if (type === "resurs_hesabati_sil_request") {
      result = resursHesabatiniSil(
        state,
        hesabatId
      );
    }
    else {
      return {
        success: false,
        deyisdi: false,
        message: "Naməlum resurs hesabatı mutation sorğusu."
      };
    }
  }
  catch (xeta) {
    saheniBerpaEt(state, "resursHesabatlari", yedek);

    return {
      success: false,
      deyisdi: false,
      message: "Resurs hesabatı əməliyyatı hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message
        ? xeta.message
        : String(xeta)
    };
  }

  if (!result || result.success !== true) {
    saheniBerpaEt(state, "resursHesabatlari", yedek);

    return {
      success: false,
      deyisdi: false,
      result: result && typeof result === "object"
        ? kopyala(result)
        : null,
      message: result && result.message
        ? result.message
        : "Resurs hesabatı əməliyyatı tamamlanmadı."
    };
  }

  return {
    success: true,
    deyisdi: evvelkiImza !== hesabatMutasiyaImzasi(state),
    result: kopyala(result)
  };
}

async function resursHesabatiMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128).toLowerCase();
  if (!MESAJLAR.has(type)) return false;

  const resultType = type.replace(/_request$/, "_result");
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  ).toLowerCase();

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      playerId: "",
      payloadJson: JSON.stringify({
        success: false,
        xetaKodu: "AUTH_REQUIRED",
        mesaj: "Resurs hesabatları üçün autentifikasiya tələb olunur.",
        umumiSay: 0,
        oxunmamisSay: 0,
        hesabatlar: []
      })
    });
    return true;
  }

  const mesajPlayerId = metnAl(
    kontekst && kontekst.msg && kontekst.msg.playerId,
    128
  ).toLowerCase();

  if (mesajPlayerId && mesajPlayerId !== playerId) {
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      payloadJson: JSON.stringify({
        success: false,
        xetaKodu: "IDENTITY_MISMATCH",
        mesaj: "Sorğudakı oyunçu ID-si aktiv sessiya ilə uyğun deyil.",
        umumiSay: 0,
        oxunmamisSay: 0,
        hesabatlar: []
      })
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);

    if (type === "resurs_hesabatlari_getir_request") {
      const netice = siyahiNeticesiniHazirla(
        state,
        kontekst.msg && kontekst.msg.limit
      );

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        payloadJson: JSON.stringify(netice)
      });

      console.log("[RESURS_HESABATI] Persistent hesabat siyahısı göndərildi:", {
        playerId,
        say: netice.hesabatlar.length,
        umumiSay: netice.umumiSay,
        oxunmamisSay: netice.oxunmamisSay
      });

      return true;
    }

    const hesabatId = metnAl(
      kontekst.msg && kontekst.msg.hesabatId,
      220
    );

    if (type === "resurs_hesabati_detal_request") {
      const hesabat = resursHesabatiDetaliHazirla(
        hesabatReadStateKopyasi(state),
        hesabatId
      );

      gonder(kontekst, resultType, {
        success: !!hesabat,
        playerId,
        hesabat,
        message: hesabat ? "" : "Resurs hesabatı tapılmadı.",
        payloadJson: JSON.stringify(hesabat)
      });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => {
        return resursHesabatiMutasiyasiniTetbiqEt(
          kilidliState,
          type,
          kontekst.msg,
          kontekst.nowMs()
        );
      }
    );

    if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
      console.error("[RESURS_HESABATI] Mutation hesablanma xətası:", {
        playerId,
        message: mutasiyaNeticesi.daxiliXeta
      });
    }

    if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: mutasiyaNeticesi && mutasiyaNeticesi.message
          ? mutasiyaNeticesi.message
          : "Resurs hesabatı əməliyyatı tamamlanmadı."
      });
      return true;
    }

    const result = mutasiyaNeticesi.result || {};
    const siyahi = siyahiNeticesiniHazirla(state, 50);

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...result,
      umumiSay: siyahi.umumiSay,
      oxunmamisSay: siyahi.oxunmamisSay,
      payloadJson: JSON.stringify(result)
    });
  }
  catch (xeta) {
    console.error("[RESURS_HESABATI]", xeta);

    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Resurs hesabatı əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  resursHesabatiMutasiyasiniTetbiqEt,
  resursHesabatiMesajiniEmalEt
};