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

const esasHesabLoginMesajiniEmalEt =
  hesabLoginModulu.hesabLoginMesajiniEmalEt;

if (typeof esasHesabLoginMesajiniEmalEt !== "function") {
  throw new Error(
    "hesab_login_handler.js daxilində hesabLoginMesajiniEmalEt tapılmadı."
  );
}

hesabLoginModulu.hesabLoginMesajiniEmalEt = async function(kontekst) {
  const provayderIdareEmalOlundu =
    await hesabProvayderIdareMesajiniEmalEt(kontekst);

  if (provayderIdareEmalOlundu) {
    return true;
  }

  const elaveEmalOlundu =
    await hesabElaveMesajiniEmalEt(kontekst);

  if (elaveEmalOlundu) {
    return true;
  }

  return await esasHesabLoginMesajiniEmalEt(kontekst);
};

require("./server");
