"use strict";

const {
  provayderMelumatiniYoxla
} = require("./hesab_provayder_yoxlayici");

const {
  provayderLoginHesabiniHazirla
} = require("./hesab_provayder_postgres");

const {
  provayderiHesabdanAyir
} = require("./hesab_provayder_idare_postgres");

function metnAl(deyer, maksimum = 512) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

function aktivHesabSessiyasiVar(ws) {
  return Boolean(
    ws &&
    ws._authedPlayerId &&
    ws._authKind === "account" &&
    ws._accountSessionId
  );
}

function authXetasiGonder(kontekst, cavabTipi) {
  const { ws, send, nowMs } = kontekst;

  send(ws, {
    type: cavabTipi,
    success: false,
    message: "Bu əməliyyat üçün aktiv hesab sessiyası tələb olunur.",
    serverTimeUnixMs: nowMs()
  });
}

async function provayderBagla(kontekst) {
  const { msg, ws, send, nowMs } = kontekst;

  if (!aktivHesabSessiyasiVar(ws)) {
    authXetasiGonder(
      kontekst,
      "account_provider_link_result"
    );
    return true;
  }

  const provider = metnAl(msg && msg.provider, 32).toLowerCase();
  let yoxlama;

  try {
    yoxlama = await provayderMelumatiniYoxla(
      provider,
      msg || {}
    );
  }
  catch (xeta) {
    console.error("[PROVAYDER_BAGLA] Token yoxlama xətası:", xeta);

    send(ws, {
      type: "account_provider_link_result",
      success: false,
      provider,
      message: "Provayder yoxlanarkən server xətası baş verdi.",
      serverTimeUnixMs: nowMs()
    });
    return true;
  }

  if (!yoxlama || yoxlama.success !== true) {
    send(ws, {
      type: "account_provider_link_result",
      success: false,
      provider,
      notConfigured: yoxlama && yoxlama.notConfigured === true,
      temporary: yoxlama && yoxlama.temporary === true,
      message: yoxlama && yoxlama.message
        ? yoxlama.message
        : "Provayder giriş məlumatı təsdiqlənmədi.",
      serverTimeUnixMs: nowMs()
    });
    return true;
  }

  try {
    const netice = await provayderLoginHesabiniHazirla({
      provider: yoxlama.provider,
      providerUserId: yoxlama.providerUserId,
      email: yoxlama.email,
      emailVerified: yoxlama.emailVerified,
      displayName: yoxlama.displayName,
      currentPlayerId: metnAl(ws._authedPlayerId, 128),
      currentAuthKind: metnAl(ws._authKind, 32),
      mode: "link"
    });

    send(ws, {
      type: "account_provider_link_result",
      success: netice && netice.success === true,
      provider: yoxlama.provider || provider,
      providerAlreadyUsed:
        netice && netice.providerAlreadyUsed === true,
      account: netice && netice.account
        ? netice.account
        : null,
      message: netice && netice.message
        ? netice.message
        : "Provayder hesaba bağlana bilmədi.",
      serverTimeUnixMs: nowMs()
    });
  }
  catch (xeta) {
    console.error("[PROVAYDER_BAGLA] Server xətası:", xeta);

    send(ws, {
      type: "account_provider_link_result",
      success: false,
      provider,
      message: "Provayder hesaba bağlanarkən server xətası baş verdi.",
      serverTimeUnixMs: nowMs()
    });
  }

  return true;
}

async function provayderAyir(kontekst) {
  const { msg, ws, send, nowMs } = kontekst;

  if (!aktivHesabSessiyasiVar(ws)) {
    authXetasiGonder(
      kontekst,
      "account_provider_unlink_result"
    );
    return true;
  }

  const provider = metnAl(msg && msg.provider, 32).toLowerCase();

  try {
    const netice = await provayderiHesabdanAyir(
      metnAl(ws._authedPlayerId, 128),
      provider
    );

    send(ws, {
      type: "account_provider_unlink_result",
      success: netice && netice.success === true,
      provider: netice && netice.provider
        ? netice.provider
        : provider,
      notLinked: netice && netice.notLinked === true,
      wouldLockAccount:
        netice && netice.wouldLockAccount === true,
      account: netice && netice.account
        ? netice.account
        : null,
      message: netice && netice.message
        ? netice.message
        : "Provayder hesabdan ayrıla bilmədi.",
      serverTimeUnixMs: nowMs()
    });
  }
  catch (xeta) {
    console.error("[PROVAYDER_AYIR] Server xətası:", xeta);

    send(ws, {
      type: "account_provider_unlink_result",
      success: false,
      provider,
      message: "Provayder hesabdan ayrılarkən server xətası baş verdi.",
      serverTimeUnixMs: nowMs()
    });
  }

  return true;
}

async function hesabProvayderIdareMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);

  if (type === "account_provider_link_request") {
    return await provayderBagla(kontekst);
  }

  if (type === "account_provider_unlink_request") {
    return await provayderAyir(kontekst);
  }

  return false;
}

module.exports = {
  hesabProvayderIdareMesajiniEmalEt
};
