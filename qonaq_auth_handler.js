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

function connectionSocketiniSil(
  connections,
  playerId,
  ws
) {
  if (
    !connections ||
    !playerId
  ) {
    return false;
  }

  if (
    typeof connections.deleteIfCurrent ===
      "function"
  ) {
    return connections.deleteIfCurrent(
      playerId,
      ws
    );
  }

  if (
    typeof connections.get ===
      "function" &&
    typeof connections.delete ===
      "function" &&
    connections.get(playerId) === ws
  ) {
    return connections.delete(
      playerId
    );
  }

  return false;
}

async function runtimePresenceQeydEt(
  runtimeBus,
  playerId
) {
  if (
    !runtimeBus ||
    typeof runtimeBus.registerLocalPlayer !==
      "function" ||
    !playerId
  ) {
    return false;
  }

  try {
    return await runtimeBus
      .registerLocalPlayer(
        playerId
      );
  }
  catch (error) {
    console.error(
      "[QONAQ_AUTH] Redis presence register xətası:",
      error && error.message
        ? error.message
        : error
    );

    return false;
  }
}

async function runtimePresenceSil(
  runtimeBus,
  connections,
  playerId
) {
  if (
    !runtimeBus ||
    typeof runtimeBus.unregisterLocalPlayer !==
      "function" ||
    !playerId
  ) {
    return false;
  }

  if (
    connections &&
    typeof connections.has ===
      "function" &&
    connections.has(playerId)
  ) {
    return false;
  }

  try {
    return await runtimeBus
      .unregisterLocalPlayer(
        playerId
      );
  }
  catch (error) {
    console.error(
      "[QONAQ_AUTH] Redis presence unregister xətası:",
      error && error.message
        ? error.message
        : error
    );

    return false;
  }
}

function socketiQonaqOyuncuyaBagla(
  ws,
  playerId,
  connections
) {
  const kohnePlayerId =
    metnAl(
      ws &&
      ws._authedPlayerId
    );

  if (
    kohnePlayerId &&
    kohnePlayerId !== playerId
  ) {
    connectionSocketiniSil(
      connections,
      kohnePlayerId,
      ws
    );
  }

  ws._authedPlayerId = playerId;
  ws._accountSessionId = null;
  ws._authKind = "guest";
  ws._pendingPinChallengeId = null;

  if (
    connections &&
    typeof connections.set ===
      "function"
  ) {
    connections.set(
      playerId,
      ws
    );
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
    runtimeBus,
    getOrCreatePlayerState,
    ensureFreshPlayerState,
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

  let state;

  try {
    state =
      typeof ensureFreshPlayerState ===
        "function"
        ? await ensureFreshPlayerState(
            playerId
          )
        : getOrCreatePlayerState(
            playerId
          );
  }
  catch (xeta) {
    console.error(
      "[QONAQ_AUTH] Gameplay state sinxronizasiyası uğursuz oldu:",
      xeta
    );

    send(ws, {
      type:
        "auth_temporarily_unavailable",
      success: false,
      message:
        "Oyunçu vəziyyəti hazırda sinxronlaşdırıla bilmir.",
      serverTimeUnixMs:
        nowMs()
    });

    return true;
  }

  const kohnePlayerId =
    metnAl(
      ws &&
      ws._authedPlayerId
    );

  socketiQonaqOyuncuyaBagla(
    ws,
    playerId,
    connections
  );

  if (
    kohnePlayerId &&
    kohnePlayerId !== playerId
  ) {
    await runtimePresenceSil(
      runtimeBus,
      connections,
      kohnePlayerId
    );
  }

  await runtimePresenceQeydEt(
    runtimeBus,
    playerId
  );

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
  qonaqPlayerIdYarat,
  connectionSocketiniSil,
  runtimePresenceQeydEt,
  runtimePresenceSil
};
