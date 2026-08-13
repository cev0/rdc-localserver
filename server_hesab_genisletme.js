"use strict";

// ============================================================
// HESAB SERVER GENİŞLƏTMƏ GİRİŞ NÖQTƏSİ
// ------------------------------------------------------------
// Mövcud server.js və hesab_login_handler.js fayllarını pozmadan
// əlavə hesab mesajlarını modul şəkildə əvvəlcə emal edir.
// Sonra mövcud login handler öz normal axını ilə işləyir.
// ============================================================

const hesabLoginModulu = require("./hesab_login_handler");

const {
  hesabProvayderIdareMesajiniEmalEt
} = require("./hesab_provayder_idare_handler");

const {
  hesabElaveMesajiniEmalEt
} = require("./hesab_elave_handler");

const {
  provayderTesdiqiniEsasHesabaSinxronEt
} = require("./hesab_provayder_tesdiq_sinxronu");

const esasHesabLoginMesajiniEmalEt =
  hesabLoginModulu.hesabLoginMesajiniEmalEt;

if (typeof esasHesabLoginMesajiniEmalEt !== "function") {
  throw new Error(
    "hesab_login_handler.js daxilində hesabLoginMesajiniEmalEt tapılmadı."
  );
}

async function provayderTesdiqiniTehlukesizSinxronEt(kontekst) {
  const playerId =
    kontekst &&
    kontekst.ws &&
    typeof kontekst.ws._authedPlayerId === "string"
      ? kontekst.ws._authedPlayerId.trim()
      : "";

  if (!playerId) {
    return;
  }

  try {
    const netice =
      await provayderTesdiqiniEsasHesabaSinxronEt(playerId);

    if (netice && netice.success === false) {
      console.warn(
        "[PROVAYDER_TESDIQ_SINXRON] Sinxronlama uğursuz oldu:",
        {
          playerId,
          message: netice.message || "Naməlum xəta"
        }
      );
    }
  }
  catch (xeta) {
    console.error(
      "[PROVAYDER_TESDIQ_SINXRON] Gözlənilməz xəta:",
      xeta
    );
  }
}

hesabLoginModulu.hesabLoginMesajiniEmalEt = async function(kontekst) {
  const provayderIdareEmalOlundu =
    await hesabProvayderIdareMesajiniEmalEt(kontekst);

  if (provayderIdareEmalOlundu) {
    return true;
  }

  // Köhnə provayder hesabları üçün də account_info-dan əvvəl
  // PostgreSQL-də təsdiq statusunu əsas hesabla sinxronlayırıq.
  if (
    kontekst &&
    kontekst.type === "account_info_request"
  ) {
    await provayderTesdiqiniTehlukesizSinxronEt(kontekst);
  }

  const elaveEmalOlundu =
    await hesabElaveMesajiniEmalEt(kontekst);

  if (elaveEmalOlundu) {
    // Provayder girişi uğurla bitəndən sonra statusu DB-də daimi saxla.
    if (
      kontekst &&
      kontekst.type === "account_provider_login_request"
    ) {
      await provayderTesdiqiniTehlukesizSinxronEt(kontekst);
    }

    return true;
  }

  return await esasHesabLoginMesajiniEmalEt(kontekst);
};

require("./server");
