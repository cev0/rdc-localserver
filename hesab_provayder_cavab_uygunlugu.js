"use strict";

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

  // Google provider sətri yalnız server token imzasını, audience və issuer-i
  // uğurla yoxladıqdan sonra saxlanılır. Buna görə Google birinci seçilir.
  const google = provayderler.find(x =>
    x &&
    metnAl(x.provider, 32).toLowerCase() === "google" &&
    metnAl(x.email, 320)
  );

  if (google) {
    return google;
  }

  // Digər provayderlər üçün ayrıca verified flag tələb olunur.
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

module.exports = {
  uygunProvayderiTap,
  hesabCavabiniProvayderdenTamamla
};
