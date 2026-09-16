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

const {
  hesabCavabiniProvayderdenTamamla
} = require("./hesab_provayder_cavab_uygunlugu");

const esasHesabLoginMesajiniEmalEt =
  hesabLoginModulu.hesabLoginMesajiniEmalEt;

if (typeof esasHesabLoginMesajiniEmalEt !== "function") {
  throw new Error(
    "hesab_login_handler.js daxilində hesabLoginMesajiniEmalEt tapılmadı."
  );
}

function metnAl(deyer, maksimum = 512) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function kontekstiCavabTamamlayiciIleHazirla(kontekst) {
  if (
    !kontekst ||
    typeof kontekst.send !== "function"
  ) {
    return kontekst;
  }

  const esasSend = kontekst.send;

  return {
    ...kontekst,
    send: (ws, cavab) => {
      hesabCavabiniProvayderdenTamamla(cavab);
      esasSend(ws, cavab);
    }
  };
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
  const tamamlanmisKontekst =
    kontekstiCavabTamamlayiciIleHazirla(kontekst);

  const provayderIdareEmalOlundu =
    await hesabProvayderIdareMesajiniEmalEt(tamamlanmisKontekst);

  if (provayderIdareEmalOlundu) {
    return true;
  }

  // Köhnə provayder hesabları üçün də account_info-dan əvvəl
  // PostgreSQL-də təsdiq statusunu əsas hesabla sinxronlayırıq.
  if (
    tamamlanmisKontekst &&
    tamamlanmisKontekst.type === "account_info_request"
  ) {
    await provayderTesdiqiniTehlukesizSinxronEt(tamamlanmisKontekst);
  }

  const elaveEmalOlundu =
    await hesabElaveMesajiniEmalEt(tamamlanmisKontekst);

  if (elaveEmalOlundu) {
    // Provayder girişi uğurla bitəndən sonra statusu DB-də daimi saxla.
    if (
      tamamlanmisKontekst &&
      tamamlanmisKontekst.type === "account_provider_login_request"
    ) {
      await provayderTesdiqiniTehlukesizSinxronEt(tamamlanmisKontekst);
    }

    return true;
  }

  return await esasHesabLoginMesajiniEmalEt(tamamlanmisKontekst);
};

// server.js yüklənməzdən əvvəl əhali log qoruyucusunu aktiv et.
// Eyni əhali dəyərləri background tick-lərdə təkrar loglanmayacaq.
require("./ehali_log_qoruyucusu");

// Dövlət 2 əvvəlki müvəqqəti inteqrasiya testindən qalmışdı.
// Server source-u yüklənməzdən əvvəl yeni hesabları Dövlət 1-ə bağlayan
// və köhnə test State 2 hesablarını növbəti girişdə Dövlət 1-ə keçirən patch-i tətbiq et.
const {
  dovlet1YeniOyuncuQaydasiniTetbiqEt
} = require("./dovlet1_yeni_oyuncu_patch");
dovlet1YeniOyuncuQaydasiniTetbiqEt();

require("./server");
