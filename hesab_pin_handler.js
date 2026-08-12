"use strict";

const {
  pinStatusunuAl,
  pinTeyinEt,
  pinSil,
  pinYoxla
} = require("./hesab_pin_postgres");

function metnAl(deyer) {
  return typeof deyer === "string" ? deyer.trim() : "";
}

function aktivHesabSessiyasiVar(ws) {
  return Boolean(
    ws &&
    ws._authedPlayerId &&
    ws._authKind === "account" &&
    ws._accountSessionId
  );
}

function umumiNeticeGonder(send, ws, type, netice, nowMs) {
  send(ws, {
    type,
    success: netice && netice.success === true,
    hasPin: netice && netice.hasPin === true,
    locked: netice && netice.locked === true,
    tooManyAttempts: netice && netice.tooManyAttempts === true,
    attemptsRemaining: Number(netice && netice.attemptsRemaining || 0),
    retryAfterSeconds: netice && netice.retryAfterMs
      ? Math.max(1, Math.ceil(Number(netice.retryAfterMs) / 1000))
      : 0,
    message: netice && netice.message
      ? netice.message
      : "PIN əməliyyatı tamamlandı.",
    serverTimeUnixMs: nowMs()
  });
}

async function hesabPinMesajiniEmalEt(kontekst) {
  const {
    type,
    msg,
    ws,
    send,
    nowMs
  } = kontekst;

  if (!String(type || "").startsWith("account_pin_")) {
    return false;
  }

  if (!aktivHesabSessiyasiVar(ws)) {
    send(ws, {
      type: String(type || "").replace("_request", "_result"),
      success: false,
      hasPin: false,
      message: "PIN əməliyyatı üçün aktiv hesab sessiyası tələb olunur.",
      serverTimeUnixMs: nowMs()
    });

    return true;
  }

  const playerId = metnAl(ws._authedPlayerId);

  if (type === "account_pin_status_request") {
    try {
      const netice = await pinStatusunuAl(playerId);
      umumiNeticeGonder(
        send,
        ws,
        "account_pin_status_result",
        netice,
        nowMs
      );
    }
    catch (xeta) {
      console.error("[PIN] Status xətası:", xeta);

      send(ws, {
        type: "account_pin_status_result",
        success: false,
        hasPin: false,
        message: "PIN statusu oxunarkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });
    }

    return true;
  }

  if (type === "account_pin_set_request") {
    try {
      const netice = await pinTeyinEt(
        playerId,
        metnAl(msg.currentPin),
        metnAl(msg.newPin)
      );

      umumiNeticeGonder(
        send,
        ws,
        "account_pin_set_result",
        netice,
        nowMs
      );
    }
    catch (xeta) {
      console.error("[PIN] Təyin etmə xətası:", xeta);

      send(ws, {
        type: "account_pin_set_result",
        success: false,
        hasPin: false,
        message: "PIN təyin edilərkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });
    }

    return true;
  }

  if (type === "account_pin_delete_request") {
    try {
      const netice = await pinSil(
        playerId,
        metnAl(msg.currentPin)
      );

      umumiNeticeGonder(
        send,
        ws,
        "account_pin_delete_result",
        netice,
        nowMs
      );
    }
    catch (xeta) {
      console.error("[PIN] Silmə xətası:", xeta);

      send(ws, {
        type: "account_pin_delete_result",
        success: false,
        hasPin: true,
        message: "PIN silinərkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });
    }

    return true;
  }

  if (type === "account_pin_verify_request") {
    try {
      const netice = await pinYoxla(
        playerId,
        metnAl(msg.pin)
      );

      umumiNeticeGonder(
        send,
        ws,
        "account_pin_verify_result",
        netice,
        nowMs
      );
    }
    catch (xeta) {
      console.error("[PIN] Yoxlama xətası:", xeta);

      send(ws, {
        type: "account_pin_verify_result",
        success: false,
        hasPin: true,
        message: "PIN yoxlanarkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });
    }

    return true;
  }

  return false;
}

module.exports = {
  hesabPinMesajiniEmalEt
};
