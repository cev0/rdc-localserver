"use strict";

// ============================================================
// MISSİYA SERVER GENİŞLƏTMƏ GİRİŞ NÖQTƏSİ
// ------------------------------------------------------------
// Mövcud hesab wrapper-ını dəyişmədən missiya mesajlarını
// hesab/login handler zəncirinə əlavə edir.
// ============================================================

const hesabLoginModulu = require("./hesab_login_handler");

const {
  missiyaMesajiniEmalEt
} = require("./missiya_handler");

const esasHesabLoginMesajiniEmalEt =
  hesabLoginModulu.hesabLoginMesajiniEmalEt;

if (typeof esasHesabLoginMesajiniEmalEt !== "function") {
  throw new Error(
    "hesab_login_handler.js daxilində hesabLoginMesajiniEmalEt tapılmadı."
  );
}

hesabLoginModulu.hesabLoginMesajiniEmalEt = async function(kontekst) {
  const missiyaEmalOlundu =
    await missiyaMesajiniEmalEt(kontekst);

  if (missiyaEmalOlundu) {
    return true;
  }

  return await esasHesabLoginMesajiniEmalEt(kontekst);
};

// Hesab/provider wrapper bundan sonra yüklənir və öz mövcud axınını qoruyur.
require("./server_hesab_genisletme");
