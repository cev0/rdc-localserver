"use strict";

// ============================================================
// MISSİYA + QƏHRƏMAN + KƏŞFİYYAT + DÖYÜŞ SERVER GİRİŞ NÖQTƏSİ
// ------------------------------------------------------------
// Mövcud hesab wrapper-ını dəyişmədən:
// 1. missiya mesajlarını
// 2. qəhrəman recruit mesajlarını
// 3. qəhrəman EXP / tutorial skill mesajlarını
// 4. tutorial kəşfiyyat mesajlarını
// 5. tutorial düşmən mövqeyi mesajlarını
// 6. tutorial döyüş başlanğıcı mesajlarını
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

const {
  kesfiyyatMesajiniEmalEt
} = require("./kesfiyyat_handler");

const {
  dusmenMovqeyiMesajiniEmalEt
} = require("./dusmen_movqeyi_handler");

const {
  doyusMesajiniEmalEt
} = require("./doyus_handler");

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

  const kesfiyyatEmalOlundu =
    await kesfiyyatMesajiniEmalEt(kontekst);

  if (kesfiyyatEmalOlundu) {
    return true;
  }

  const dusmenMovqeyiEmalOlundu =
    await dusmenMovqeyiMesajiniEmalEt(kontekst);

  if (dusmenMovqeyiEmalOlundu) {
    return true;
  }

  const doyusEmalOlundu =
    await doyusMesajiniEmalEt(kontekst);

  if (doyusEmalOlundu) {
    return true;
  }

  return await esasHesabLoginMesajiniEmalEt(kontekst);
};

// Hesab/provider wrapper bundan sonra yüklənir və öz mövcud axınını qoruyur.
require("./server_hesab_genisletme");
