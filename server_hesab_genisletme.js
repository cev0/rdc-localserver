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

function metnAl(deyer, maksimum = 512) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function uygunProvayderiTap(cavab) {
  const hesab =
    cavab &&
    cavab.account &&
    typeof cavab.account === "object"
      ? cavab.account
      : null;

  const provayderler =
    hesab && Array.isArray(hesab.providers)
      ? hesab.providers
      : Array.isArray(cavab && cavab.providers)
        ? cavab.providers
        : [];

  if (provayderler.length === 0) {
    return null;
  }

  // Google girişi serverdə imza/audience/issuer yoxlamasından keçəndən
  // sonra provider cədvəlinə yazılır. Əvvəl Google-u seçirik.
  const google = provayderler.find(x =>
    x &&
    metnAl(x.provider, 32).toLowerCase() === "google" &&
    metnAl(x.email, 320)
  );

  if (google) {
    return google;
  }

  // Digər provayderlərdə yalnız təsdiqlənmiş e-poçta güvənirik.
  return provayderler.find(x =>
    x &&
    x.emailVerified === true &&
    metnAl(x.email, 320)
  ) || null;
}

function hesabCavabiniProvayderdenTamamla(cavab) {
  if (
    !cavab ||
    typeof cavab !== "object" ||
    cavab.success !== true
  ) {
    return cavab;
  }

  if (
    cavab.type !== "account_info_result" &&
    cavab.type !== "account_provider_login_result" &&
    cavab.type !== "account_provider_link_result"
  ) {
    return cavab;
  }

  const provayderSetri = uygunProvayderiTap(cavab);

  if (!provayderSetri) {
    return cavab;
  }

  const provayder =
    metnAl(provayderSetri.provider, 32).toLowerCase();

  const provayderEmail =
    metnAl(provayderSetri.email, 320).toLowerCase();

  if (!provayderEmail) {
    return cavab;
  }

  const hesab =
    cavab.account && typeof cavab.account === "object"
      ? cavab.account
      : null;

  const cariEsasEmail = metnAl(
    cavab.primaryEmail ||
    (hesab && hesab.primaryEmail) ||
    "",
    320
  ).toLowerCase();

  const esasEmailBosdur = !cariEsasEmail;
  const eyniEmaildir =
    cariEsasEmail && cariEsasEmail === provayderEmail;

  // Google provider sətri yalnız server Google ID tokenini uğurla
  // yoxladıqdan sonra yaranır. Digər provayderlərdə ayrıca verified flag lazımdır.
  const provayderEtibarlidir =
    provayder === "google" ||
    provayderSetri.emailVerified === true;

  if (esasEmailBosdur) {
    cavab.primaryEmail = provayderEmail;

    if (hesab) {
      hesab.primaryEmail = provayderEmail;
    }
  }

  if (
    provayderEtibarlidir &&
    (esasEmailBosdur || eyniEmaildir)
  ) {
    cavab.emailVerified = true;

    if (hesab) {
      hesab.emailVerified = true;
    }
  }

  return cavab;
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

require("./server");
