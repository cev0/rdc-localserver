"use strict";

const crypto = require("crypto");
const { hesabPlayerIdIleTap } = require("./hesab_yaddasi_postgres");

function metnAl(deyer, max = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, max)
    : "";
}

function qonaqPlayerIdYarat() {
  return crypto.randomBytes(12).toString("hex");
}

function socketiQonaqOyuncuyaBagla(ws, playerId, connections) {
  const kohnePlayerId = metnAl(ws && ws._authedPlayerId);

  if (
    kohnePlayerId &&
    connections &&
    typeof connections.get === "function" &&
    connections.get(kohnePlayerId) === ws
  ) {
    connections.delete(kohnePlayerId);
  }

  ws._authedPlayerId = playerId;
  ws._accountSessionId = null;
  ws._authKind = "guest";
  ws._pendingPinChallengeId = null;

  if (connections && typeof connections.set === "function") {
    connections.set(playerId, ws);
  }
}

async function qonaqAuthMesajiniEmalEt(kontekst) {
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
  } = kontekst || {};

  if (type !== "auth") {
    return false;
  }

  if (!ws || typeof send !== "function") {
    return false;
  }

  let playerId = metnAl(msg && msg.playerId);
  if (!playerId) {
    playerId = qonaqPlayerIdYarat();
  }

  // Əgər bu playerId artıq email/şifrə ilə qorunan hesaba bağlanıbsa,
  // qonaq auth ilə həmin hesabı ələ keçirmək olmaz.
  try {
    const bagliHesab = await hesabPlayerIdIleTap(playerId);

    if (bagliHesab) {
      send(ws, {
        type: "auth_account_required",
        success: false,
        playerId,
        message:
          "Bu oyunçu hesabı artıq qorunur. Hesaba giriş və ya sessiya bərpası tələb olunur.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }
  }
  catch (xeta) {
    console.error("[QONAQ_AUTH] Hesab yoxlaması uğursuz oldu:", xeta);

    send(ws, {
      type: "auth_temporarily_unavailable",
      success: false,
      message: "Autentifikasiya xidməti müvəqqəti əlçatan deyil.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  socketiQonaqOyuncuyaBagla(
    ws,
    playerId,
    connections
  );

  const state = getOrCreatePlayerState(playerId);
  updateServerTime(state);

  send(ws, {
    type: "ack",
    playerId,
    authKind: "guest",
    isGuest: true,
    accountBound: false,
    gameplayAllowed: true,
    serverTimeUnixMs: nowMs()
  });

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

  console.log("[QONAQ_AUTH] Qonaq oyunçu daxil oldu:", {
    playerId,
    authKind: ws._authKind
  });

  return true;
}

module.exports = {
  qonaqAuthMesajiniEmalEt,
  socketiQonaqOyuncuyaBagla,
  qonaqPlayerIdYarat
};
