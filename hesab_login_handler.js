"use strict";

const {
  emailSifreIleDaxilOl,
  sessiyaniYenile,
  sessiyaniLegvEt
} = require("./hesab_sessiya_postgres");

const {
  hesabPlayerIdIleTap
} = require("./hesab_yaddasi_postgres");

const {
  hesabiSil
} = require("./hesab_silme_postgres");

const {
  hesabBerpaSorqusuHazirla,
  hesabBerpaKodunuYenidenGonder,
  hesabBerpaKodunuYoxlaVeSessiyaYarat
} = require("./hesab_berpa_postgres");

const AUTHSIZ_ICAZELI_MESAJ_TIPLERI = new Set([
  "hello",
  "ping",
  "auth",
  "account_password_reset_send_request",
  "account_password_reset_verify_request",
  "account_password_reset_complete_request",
  "account_recovery_send_request",
  "account_recovery_resend_request",
  "account_recovery_verify_request"
]);

function metnAl(deyer) {
  return typeof deyer === "string" ? deyer.trim() : "";
}

function silmeTesdiqiDuzgundur(deyer) {
  const temiz = metnAl(deyer)
    .toUpperCase()
    .replace(/İ/g, "I");

  return temiz === "SIL";
}

function socketiOyuncuyaBagla(ws, playerId, sessiyaId, connections) {
  const kohnePlayerId = ws._authedPlayerId;

  if (
    kohnePlayerId &&
    connections.get(kohnePlayerId) === ws
  ) {
    connections.delete(kohnePlayerId);
  }

  ws._authedPlayerId = playerId;
  ws._accountSessionId = sessiyaId || null;
  ws._authKind = sessiyaId ? "account" : "guest";
  connections.set(playerId, ws);
}

function oyunStateGonder(
  ws,
  playerId,
  send,
  nowMs,
  getOrCreatePlayerState,
  updateServerTime,
  makeClientState,
  sendStateLocalMapToPlayer,
  sendWorldMapToPlayer
) {
  const state = getOrCreatePlayerState(playerId);
  updateServerTime(state);

  send(ws, {
    type: "state",
    playerId,
    serverTimeUnixMs: nowMs(),
    payloadJson: JSON.stringify(makeClientState(state))
  });

  sendStateLocalMapToPlayer(ws, playerId);
  sendWorldMapToPlayer(ws, playerId);
}

async function legacyAuthQorumasiniYoxla(type, msg, ws, send, nowMs) {
  if (type !== "auth") {
    return false;
  }

  const playerId = metnAl(msg && msg.playerId);

  if (!playerId) {
    return false;
  }

  try {
    const hesab = await hesabPlayerIdIleTap(playerId);

    if (hesab) {
      send(ws, {
        type: "auth_account_required",
        success: false,
        playerId,
        message:
          "Bu oyunçu hesabı qorunur. Sessiya bərpası və ya e-poçt ilə giriş tələb olunur.",
        serverTimeUnixMs: nowMs()
      });

      console.warn(
        "[AUTH_QORUMA] Bağlı hesab üçün legacy auth bloklandı:",
        playerId
      );

      return true;
    }
  }
  catch (xeta) {
    console.error(
      "[AUTH_QORUMA] Legacy auth hesab yoxlaması uğursuz oldu:",
      xeta
    );

    send(ws, {
      type: "auth_temporarily_unavailable",
      success: false,
      message: "Autentifikasiya xidməti müvəqqəti əlçatan deyil.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  return false;
}

function socketKimlikQorumasiniYoxla(type, msg, ws, send, nowMs) {
  if (AUTHSIZ_ICAZELI_MESAJ_TIPLERI.has(type)) {
    return false;
  }

  const socketPlayerId = metnAl(ws && ws._authedPlayerId);

  if (!socketPlayerId) {
    send(ws, {
      type: "auth_required",
      success: false,
      message: "Bu əməliyyat üçün autentifikasiya tələb olunur.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  const mesajPlayerId = metnAl(msg && msg.playerId);

  if (
    mesajPlayerId &&
    mesajPlayerId !== socketPlayerId
  ) {
    send(ws, {
      type: "identity_mismatch",
      success: false,
      playerId: socketPlayerId,
      message: "Sorğudakı oyunçu ID-si aktiv sessiya ilə uyğun deyil.",
      serverTimeUnixMs: nowMs()
    });

    console.warn(
      "[AUTH_QORUMA] Başqa playerId ilə sorğu bloklandı:",
      {
        socketPlayerId,
        mesajPlayerId,
        type
      }
    );

    return true;
  }

  if (msg && typeof msg === "object") {
    msg.playerId = socketPlayerId;
  }

  return false;
}

async function hesabLoginMesajiniEmalEt(kontekst) {
  const {
    type,
    msg,
    ws,
    send,
    nowMs,
    connections,
    getOrCreatePlayerState,
    updateServerTime,
    makeClientState,
    sendStateLocalMapToPlayer,
    sendWorldMapToPlayer
  } = kontekst;

  if (type === "account_recovery_send_request") {
    let netice;

    try {
      netice = await hesabBerpaSorqusuHazirla({
        email: metnAl(msg.email),
        oyuncuId: metnAl(msg.oyuncuId),
        komandirAdi: metnAl(msg.komandirAdi),
        elaveMelumat: metnAl(msg.elaveMelumat)
      });
    }
    catch (xeta) {
      console.error("[HESAB_BERPA] Sorğu xətası:", xeta);

      send(ws, {
        type: "account_recovery_send_result",
        success: false,
        message: "Hesab bərpa sorğusu zamanı server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    send(ws, {
      type: "account_recovery_send_result",
      success: netice && netice.success === true,
      berpaSorquId: netice && netice.berpaSorquId ? netice.berpaSorquId : "",
      cooldown: netice && netice.cooldown === true,
      retryAfterSeconds: netice && netice.retryAfterMs
        ? Math.max(1, Math.ceil(Number(netice.retryAfterMs) / 1000))
        : 0,
      message: netice && netice.message
        ? netice.message
        : "Hesab bərpa sorğusu tamamlandı.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  if (type === "account_recovery_resend_request") {
    let netice;

    try {
      netice = await hesabBerpaKodunuYenidenGonder(
        metnAl(msg.berpaSorquId)
      );
    }
    catch (xeta) {
      console.error("[HESAB_BERPA] Yenidən göndərmə xətası:", xeta);

      send(ws, {
        type: "account_recovery_resend_result",
        success: false,
        message: "Yeni təsdiq kodu göndərilərkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    send(ws, {
      type: "account_recovery_resend_result",
      success: netice && netice.success === true,
      berpaSorquId: netice && netice.berpaSorquId ? netice.berpaSorquId : metnAl(msg.berpaSorquId),
      cooldown: netice && netice.cooldown === true,
      retryAfterSeconds: netice && netice.retryAfterMs
        ? Math.max(1, Math.ceil(Number(netice.retryAfterMs) / 1000))
        : 0,
      message: netice && netice.message
        ? netice.message
        : "Yeni təsdiq kodu sorğusu tamamlandı.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  if (type === "account_recovery_verify_request") {
    const cihazId = metnAl(msg.cihazId);
    let netice;

    try {
      netice = await hesabBerpaKodunuYoxlaVeSessiyaYarat(
        metnAl(msg.berpaSorquId),
        metnAl(msg.kod),
        cihazId
      );
    }
    catch (xeta) {
      console.error("[HESAB_BERPA] Kod yoxlama xətası:", xeta);

      send(ws, {
        type: "account_recovery_verify_result",
        success: false,
        message: "Hesab bərpa edilərkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    if (!netice || netice.success !== true) {
      send(ws, {
        type: "account_recovery_verify_result",
        success: false,
        attemptsRemaining: Number(netice && netice.attemptsRemaining || 0),
        expired: netice && netice.expired === true,
        tooManyAttempts: netice && netice.tooManyAttempts === true,
        message: netice && netice.message
          ? netice.message
          : "Hesab bərpa edilə bilmədi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    const hesab = netice.account || {};
    const sessiya = netice.session || {};
    const playerId = metnAl(hesab.playerId);

    if (!playerId) {
      send(ws, {
        type: "account_recovery_verify_result",
        success: false,
        message: "Bərpa olunan hesabın oyunçu ID-si tapılmadı.",
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
      type: "account_recovery_verify_result",
      success: true,
      playerId,
      accountId: hesab.accountId || "",
      primaryEmail: hesab.primaryEmail || "",
      secondaryEmail: hesab.secondaryEmail || "",
      emailVerified: hesab.emailVerified === true,
      sessionId: sessiya.sessionId || "",
      refreshToken: sessiya.refreshToken || "",
      expiresAtMs: Number(sessiya.expiresAtMs || 0),
      message: netice.message || "Hesab uğurla bərpa edildi.",
      serverTimeUnixMs: nowMs()
    });

    oyunStateGonder(
      ws,
      playerId,
      send,
      nowMs,
      getOrCreatePlayerState,
      updateServerTime,
      makeClientState,
      sendStateLocalMapToPlayer,
      sendWorldMapToPlayer
    );

    console.log("[HESAB_BERPA] Hesab uğurla bərpa edildi:", {
      playerId,
      accountId: hesab.accountId || ""
    });

    return true;
  }

  if (type === "account_login_request") {
    const email = metnAl(msg.email);
    const sifre = typeof msg.sifre === "string" ? msg.sifre : "";
    const cihazId = metnAl(msg.cihazId);

    let netice;

    try {
      netice = await emailSifreIleDaxilOl(email, sifre, cihazId);
    }
    catch (xeta) {
      console.error("[HESAB_LOGIN] Giriş xətası:", xeta);

      send(ws, {
        type: "account_login_result",
        success: false,
        message: "Hesaba giriş zamanı server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    if (!netice || netice.success !== true) {
      send(ws, {
        type: "account_login_result",
        success: false,
        message: netice && netice.message
          ? netice.message
          : "Hesaba giriş mümkün olmadı.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    const hesab = netice.account || {};
    const sessiya = netice.session || {};
    const playerId = metnAl(hesab.playerId);

    if (!playerId) {
      send(ws, {
        type: "account_login_result",
        success: false,
        message: "Hesabın oyunçu ID-si tapılmadı.",
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
      type: "account_login_result",
      success: true,
      playerId,
      accountId: hesab.accountId || "",
      primaryEmail: hesab.primaryEmail || "",
      secondaryEmail: hesab.secondaryEmail || "",
      emailVerified: hesab.emailVerified === true,
      sessionId: sessiya.sessionId || "",
      refreshToken: sessiya.refreshToken || "",
      expiresAtMs: Number(sessiya.expiresAtMs || 0),
      message: netice.message || "Hesaba giriş uğurludur.",
      serverTimeUnixMs: nowMs()
    });

    oyunStateGonder(
      ws,
      playerId,
      send,
      nowMs,
      getOrCreatePlayerState,
      updateServerTime,
      makeClientState,
      sendStateLocalMapToPlayer,
      sendWorldMapToPlayer
    );

    console.log("[HESAB_LOGIN] Hesaba giriş uğurludur:", {
      playerId,
      accountId: hesab.accountId || "",
      email: hesab.primaryEmail || ""
    });

    return true;
  }

  if (type === "account_session_refresh_request") {
    const refreshToken = metnAl(msg.refreshToken);
    const cihazId = metnAl(msg.cihazId);

    let netice;

    try {
      netice = await sessiyaniYenile(refreshToken, cihazId);
    }
    catch (xeta) {
      console.error("[HESAB_SESSIYA] Yeniləmə xətası:", xeta);

      send(ws, {
        type: "account_session_refresh_result",
        success: false,
        message: "Sessiya yenilənərkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    if (!netice || netice.success !== true) {
      send(ws, {
        type: "account_session_refresh_result",
        success: false,
        message: netice && netice.message
          ? netice.message
          : "Sessiya yenilənə bilmədi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    const hesab = netice.account || {};
    const sessiya = netice.session || {};
    const playerId = metnAl(hesab.playerId);

    if (!playerId) {
      send(ws, {
        type: "account_session_refresh_result",
        success: false,
        message: "Hesabın oyunçu ID-si tapılmadı.",
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
      type: "account_session_refresh_result",
      success: true,
      playerId,
      accountId: hesab.accountId || "",
      primaryEmail: hesab.primaryEmail || "",
      secondaryEmail: hesab.secondaryEmail || "",
      emailVerified: hesab.emailVerified === true,
      sessionId: sessiya.sessionId || "",
      refreshToken: sessiya.refreshToken || "",
      expiresAtMs: Number(sessiya.expiresAtMs || 0),
      message: netice.message || "Sessiya yeniləndi.",
      serverTimeUnixMs: nowMs()
    });

    oyunStateGonder(
      ws,
      playerId,
      send,
      nowMs,
      getOrCreatePlayerState,
      updateServerTime,
      makeClientState,
      sendStateLocalMapToPlayer,
      sendWorldMapToPlayer
    );

    return true;
  }

  if (type === "account_logout_request") {
    const refreshToken = metnAl(msg.refreshToken);

    let netice;

    try {
      netice = await sessiyaniLegvEt(refreshToken);
    }
    catch (xeta) {
      console.error("[HESAB_LOGOUT] Sessiya ləğv xətası:", xeta);

      send(ws, {
        type: "account_logout_result",
        success: false,
        message: "Hesabdan çıxış zamanı server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    const playerId = ws._authedPlayerId;

    if (
      playerId &&
      connections.get(playerId) === ws
    ) {
      connections.delete(playerId);
    }

    ws._authedPlayerId = null;
    ws._accountSessionId = null;
    ws._authKind = null;

    send(ws, {
      type: "account_logout_result",
      success: netice.success === true,
      message: netice.message || "Hesabdan çıxış edildi.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  if (type === "account_delete_request") {
    const playerId = metnAl(ws._authedPlayerId);

    if (
      !playerId ||
      ws._authKind !== "account" ||
      !ws._accountSessionId
    ) {
      send(ws, {
        type: "account_delete_result",
        success: false,
        playerId: playerId || "",
        message: "Hesabı silmək üçün aktiv hesab sessiyası tələb olunur.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    if (!silmeTesdiqiDuzgundur(msg.confirmation)) {
      send(ws, {
        type: "account_delete_result",
        success: false,
        playerId,
        message: "Hesab silmə təsdiqi düzgün deyil.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    let netice;

    try {
      netice = await hesabiSil(playerId);
    }
    catch (xeta) {
      console.error("[HESAB_SIL] Server xətası:", xeta);

      send(ws, {
        type: "account_delete_result",
        success: false,
        playerId,
        message: "Hesab silinərkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    if (!netice || netice.success !== true) {
      send(ws, {
        type: "account_delete_result",
        success: false,
        playerId,
        message: netice && netice.message
          ? netice.message
          : "Hesab silinə bilmədi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    ws._accountSessionId = null;
    ws._authKind = "guest";
    connections.set(playerId, ws);

    send(ws, {
      type: "account_delete_result",
      success: true,
      playerId,
      message: netice.message || "Hesab uğurla silindi.",
      serverTimeUnixMs: nowMs()
    });

    console.log("[HESAB_SIL] Socket guest rejiminə keçirildi:", playerId);

    return true;
  }

  const legacyAuthBloklandi = await legacyAuthQorumasiniYoxla(
    type,
    msg,
    ws,
    send,
    nowMs
  );

  if (legacyAuthBloklandi) {
    return true;
  }

  const kimlikBloklandi = socketKimlikQorumasiniYoxla(
    type,
    msg,
    ws,
    send,
    nowMs
  );

  if (kimlikBloklandi) {
    return true;
  }

  return false;
}

module.exports = {
  hesabLoginMesajiniEmalEt
};
