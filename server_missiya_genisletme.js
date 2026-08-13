"use strict";

// ============================================================
// MISSİYA + QƏHRƏMAN RECRUIT + EXP SERVER GİRİŞ NÖQTƏSİ
// ------------------------------------------------------------
// Mövcud hesab wrapper-ını dəyişmədən:
// 1. missiya mesajlarını
// 2. qəhrəman recruit mesajlarını
// 3. qəhrəman EXP item istifadəsini
// hesab/login handler zəncirinə əlavə edir.
// ============================================================

const hesabLoginModulu = require("./hesab_login_handler");

const {
  missiyaMesajiniEmalEt
} = require("./missiya_handler");

// Vacib: override recruit sistemindən əvvəl yüklənməlidir.
require("./qehreman_recruit_qayda_override");

const {
  qehremanRecruitMesajiniEmalEt
} = require("./qehreman_recruit_handler");

const {
  qehremanExpMesajiniEmalEt
} = require("./qehreman_exp_handler");

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

  const recruitEmalOlundu =
    await qehremanRecruitMesajiniEmalEt(kontekst);

  if (recruitEmalOlundu) {
    return true;
  }

  const expEmalOlundu =
    await qehremanExpMesajiniEmalEt(kontekst);

  if (expEmalOlundu) {
    return true;
  }

  return await esasHesabLoginMesajiniEmalEt(kontekst);
};

// Hesab/provider wrapper bundan sonra yüklənir və öz mövcud axınını qoruyur.
require("./server_hesab_genisletme");
