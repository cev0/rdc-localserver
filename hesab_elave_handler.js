"use strict";

const {
  provayderMelumatiniYoxla,
  provayderKonfiqurasiyaStatusu
} = require("./hesab_provayder_yoxlayici");

const {
  hesabMelumatiniPlayerIdIleAl,
  provayderLoginHesabiniHazirla,
  provayderSessiyasiYarat,
  sessiyaniIdIleLegvEt,
  yeniGuestPlayerIdYarat
} = require("./hesab_provayder_postgres");

const {
  hesabUcunPinTelebiLazimdir,
  cihazPinSorqusuYarat
} = require("./hesab_cihaz_pin_qoruma");

function metnAl(deyer, maksimum = 512) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

function socketiOyuncuyaBagla(ws, playerId, sessiyaId, connections) {
  const kohnePlayerId = metnAl(ws && ws._authedPlayerId, 128);

  if (
    kohnePlayerId &&
    connections &&
    connections.get(kohnePlayerId) === ws
  ) {
    connections.delete(kohnePlayerId);
  }

  ws._authedPlayerId = playerId;
  ws._accountSessionId = sessiyaId || null;
  ws._authKind = sessiyaId ? "account" : "guest";
  ws._pendingPinChallengeId = null;

  if (connections) {
    connections.set(playerId, ws);
  }
}

function socketiPinGozlemeyeAl(ws, connections, challengeId) {
  const kohnePlayerId = metnAl(ws && ws._authedPlayerId, 128);

  if (
    kohnePlayerId &&
    connections &&
    connections.get(kohnePlayerId) === ws
  ) {
    connections.delete(kohnePlayerId);
  }

  ws._authedPlayerId = null;
  ws._accountSessionId = null;
  ws._authKind = "pin_pending";
  ws._pendingPinChallengeId = metnAl(challengeId, 128);
}

function oyunStateGonder(kontekst, playerId) {
  const {
    ws,
    send,
    nowMs,
    getOrCreatePlayerState,
    updateServerTime,
    makeClientState,
    sendStateLocalMapToPlayer,
    sendWorldMapToPlayer
  } = kontekst;

  if (
    typeof getOrCreatePlayerState !== "function" ||
    typeof updateServerTime !== "function" ||
    typeof makeClientState !== "function"
  ) {
    return;
  }

  const state = getOrCreatePlayerState(playerId);
  updateServerTime(state);

  send(ws, {
    type: "state",
    playerId,
    serverTimeUnixMs: nowMs(),
    payloadJson: JSON.stringify(makeClientState(state))
  });

  if (typeof sendStateLocalMapToPlayer === "function") {
    sendStateLocalMapToPlayer(ws, playerId);
  }

  if (typeof sendWorldMapToPlayer === "function") {
    sendWorldMapToPlayer(ws, playerId);
  }
}

function cihazPinTelebiGonder(kontekst, challenge) {
  const { ws, send, nowMs } = kontekst;

  send(ws, {
    type: "account_device_pin_required",
    success: false,
    pinRequired: true,
    challengeId: challenge && challenge.challengeId
      ? challenge.challengeId
      : "",
    reason: challenge && challenge.reason
      ? challenge.reason
      : "login",
    expiresAtMs: Number(challenge && challenge.expiresAtMs || 0),
    message: challenge && challenge.message
      ? challenge.message
      : "Bu cihaz üçün PIN təsdiqi tələb olunur.",
    serverTimeUnixMs: nowMs()
  });
}

async function hesabInfoSorqusunuEmalEt(kontekst) {
  const { ws, send, nowMs } = kontekst;
  const playerId = metnAl(ws && ws._authedPlayerId, 128);

  if (!playerId) {
    send(ws, {
      type: "account_info_result",
      success: false,
      linked: false,
      providerConfig: provayderKonfiqurasiyaStatusu(),
      message: "Hesab məlumatı üçün autentifikasiya tələb olunur.",
      serverTimeUnixMs: nowMs()
    });
    return true;
  }

  try {
    const netice = await hesabMelumatiniPlayerIdIleAl(playerId);

    send(ws, {
      type: "account_info_result",
      success: netice && netice.success === true,
      linked: netice && netice.linked === true,
      playerId,
      account: netice && netice.account ? netice.account : null,
      providerConfig: provayderKonfiqurasiyaStatusu(),
      message: netice && netice.message
        ? netice.message
        : "Hesab məlumatı alına bilmədi.",
      serverTimeUnixMs: nowMs()
    });
  }
  catch (xeta) {
    console.error("[HESAB_INFO] Server xətası:", xeta);

    send(ws, {
      type: "account_info_result",
      success: false,
      linked: false,
      playerId,
      providerConfig: provayderKonfiqurasiyaStatusu(),
      message: "Hesab məlumatı oxunarkən server xətası baş verdi.",
      serverTimeUnixMs: nowMs()
    });
  }

  return true;
}

async function yeniOyunSorqusunuEmalEt(kontekst) {
  const {
    ws,
    send,
    nowMs,
    connections
  } = kontekst;

  const kohnePlayerId = metnAl(ws && ws._authedPlayerId, 128);

  if (!kohnePlayerId) {
    send(ws, {
      type: "account_new_game_result",
      success: false,
      message: "Yeni oyun başlatmaq üçün aktiv oyun sessiyası tələb olunur.",
      serverTimeUnixMs: nowMs()
    });
    return true;
  }

  try {
    if (ws._accountSessionId) {
      await sessiyaniIdIleLegvEt(ws._accountSessionId);
    }

    const yeniPlayerId = yeniGuestPlayerIdYarat();

    socketiOyuncuyaBagla(
      ws,
      yeniPlayerId,
      null,
      connections
    );

    send(ws, {
      type: "account_new_game_result",
      success: true,
      previousPlayerId: kohnePlayerId,
      playerId: yeniPlayerId,
      guest: true,
      clearStoredSession: true,
      message: "Yeni oyun yaradıldı. Əvvəlki hesab və tərəqqi silinmədi.",
      serverTimeUnixMs: nowMs()
    });

    oyunStateGonder(kontekst, yeniPlayerId);

    console.log("[YENI_OYUN] Yeni guest oyun yaradıldı:", {
      previousPlayerId: kohnePlayerId,
      newPlayerId: yeniPlayerId
    });
  }
  catch (xeta) {
    console.error("[YENI_OYUN] Server xətası:", xeta);

    send(ws, {
      type: "account_new_game_result",
      success: false,
      message: "Yeni oyun yaradıla bilmədi.",
      serverTimeUnixMs: nowMs()
    });
  }

  return true;
}

async function provayderLoginSorqusunuEmalEt(kontekst) {
  const {
    msg,
    ws,
    send,
    nowMs,
    connections
  } = kontekst;

  const provayder = metnAl(msg && msg.provider, 32).toLowerCase();
  const cihazId = metnAl(msg && msg.cihazId, 128);
  const kohnePlayerId = metnAl(ws && ws._authedPlayerId, 128);
  const kohneAuthKind = metnAl(ws && ws._authKind, 32);
  const kohneSessiyaId = metnAl(ws && ws._accountSessionId, 128);

  let yoxlama;

  try {
    yoxlama = await provayderMelumatiniYoxla(
      provayder,
      msg || {}
    );
  }
  catch (xeta) {
    console.error("[PROVAYDER_LOGIN] Token yoxlama xətası:", xeta);

    send(ws, {
      type: "account_provider_login_result",
      success: false,
      provider: provayder,
      message: "Provayder giriş yoxlaması zamanı server xətası baş verdi.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  if (!yoxlama || yoxlama.success !== true) {
    send(ws, {
      type: "account_provider_login_result",
      success: false,
      provider: provayder,
      notConfigured: yoxlama && yoxlama.notConfigured === true,
      temporary: yoxlama && yoxlama.temporary === true,
      message: yoxlama && yoxlama.message
        ? yoxlama.message
        : "Provayder giriş məlumatı təsdiqlənmədi.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  let hazirliq;

  try {
    hazirliq = await provayderLoginHesabiniHazirla({
      provider: yoxlama.provider,
      providerUserId: yoxlama.providerUserId,
      email: yoxlama.email,
      emailVerified: yoxlama.emailVerified,
      displayName: yoxlama.displayName,
      currentPlayerId: kohnePlayerId,
      currentAuthKind: kohneAuthKind,
      mode: "login"
    });
  }
  catch (xeta) {
    console.error("[PROVAYDER_LOGIN] Hesab hazırlama xətası:", xeta);

    send(ws, {
      type: "account_provider_login_result",
      success: false,
      provider: provayder,
      message: "Provayder hesabı hazırlanarkən server xətası baş verdi.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  if (!hazirliq || hazirliq.success !== true || !hazirliq.rawAccount) {
    send(ws, {
      type: "account_provider_login_result",
      success: false,
      provider: provayder,
      message: hazirliq && hazirliq.message
        ? hazirliq.message
        : "Provayder hesabı açıla bilmədi.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  const hedefHesab = hazirliq.rawAccount;

  try {
    if (kohneSessiyaId) {
      await sessiyaniIdIleLegvEt(kohneSessiyaId);
    }

    if (await hesabUcunPinTelebiLazimdir(hedefHesab, cihazId)) {
      const challenge = await cihazPinSorqusuYarat(
        hedefHesab,
        cihazId,
        "login"
      );

      if (!challenge || challenge.success !== true) {
        send(ws, {
          type: "account_provider_login_result",
          success: false,
          provider: provayder,
          message: challenge && challenge.message
            ? challenge.message
            : "Cihaz PIN yoxlaması başlana bilmədi.",
          serverTimeUnixMs: nowMs()
        });
        return true;
      }

      socketiPinGozlemeyeAl(
        ws,
        connections,
        challenge.challengeId
      );

      cihazPinTelebiGonder(kontekst, challenge);
      return true;
    }

    const sessiyaNeticesi = await provayderSessiyasiYarat(
      hedefHesab,
      cihazId,
      provayder
    );

    if (!sessiyaNeticesi || sessiyaNeticesi.success !== true) {
      send(ws, {
        type: "account_provider_login_result",
        success: false,
        provider: provayder,
        message: sessiyaNeticesi && sessiyaNeticesi.message
          ? sessiyaNeticesi.message
          : "Provayder sessiyası yaradıla bilmədi.",
        serverTimeUnixMs: nowMs()
      });
      return true;
    }

    const hesab = sessiyaNeticesi.account || {};
    const sessiya = sessiyaNeticesi.session || {};
    const playerId = metnAl(hesab.playerId, 128);

    if (!playerId) {
      send(ws, {
        type: "account_provider_login_result",
        success: false,
        provider: provayder,
        message: "Provayder hesabının oyunçu ID-si tapılmadı.",
        serverTimeUnixMs: nowMs()
      });
      return true;
    }

    socketiOyuncuyaBagla(
      ws,
      playerId,
      sessiya.sessionId,
      connections
    );

    send(ws, {
      type: "account_provider_login_result",
      success: true,
      provider: provayder,
      isNewAccount: hazirliq.isNewAccount === true,
      guestProgressBound: hazirliq.linked === true,
      playerId,
      account: hesab,
      accountId: hesab.accountId || "",
      primaryEmail: hesab.primaryEmail || "",
      emailVerified: hesab.emailVerified === true,
      sessionId: sessiya.sessionId || "",
      refreshToken: sessiya.refreshToken || "",
      expiresAtMs: Number(sessiya.expiresAtMs || 0),
      message: hazirliq.message || "Provayder ilə giriş uğurludur.",
      serverTimeUnixMs: nowMs()
    });

    oyunStateGonder(kontekst, playerId);
  }
  catch (xeta) {
    console.error("[PROVAYDER_LOGIN] Sessiya/PIN xətası:", xeta);

    send(ws, {
      type: "account_provider_login_result",
      success: false,
      provider: provayder,
      message: "Provayder girişinin tamamlanması zamanı server xətası baş verdi.",
      serverTimeUnixMs: nowMs()
    });
  }

  return true;
}

async function hesabElaveMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);

  if (type === "account_info_request") {
    return await hesabInfoSorqusunuEmalEt(kontekst);
  }

  if (type === "account_new_game_request") {
    return await yeniOyunSorqusunuEmalEt(kontekst);
  }

  if (type === "account_provider_login_request") {
    return await provayderLoginSorqusunuEmalEt(kontekst);
  }

  return false;
}

module.exports = {
  hesabElaveMesajiniEmalEt
};
