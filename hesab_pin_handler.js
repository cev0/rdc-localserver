"use strict";

const {
  pinStatusunuAl,
  pinTeyinEt,
  pinSil,
  pinYoxla
} = require("./hesab_pin_postgres");

const {
  cihaziEtibarliEtPlayerIdIle,
  cihazEtibarlariniLegvEtPlayerIdIle
} = require("./hesab_cihaz_pin_qoruma");

const {
  pinIcazesiYarat
} = require("./hesab_pin_icaze_postgres");

const {
  hesabiSil
} = require("./hesab_silme_postgres");

const {
  pinBerpaKodunuHazirla,
  pinBerpaSorqusunuLegvEt,
  pinBerpaKodunuYoxla,
  pinBerpasiniTamamla
} = require("./hesab_pin_berpa_postgres");

const {
  pinBerpaKoduEmailiGonder
} = require("./hesab_pin_berpa_email_gonderici");

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

function silmeTesdiqiDuzgundur(deyer) {
  const temiz = metnAl(deyer)
    .toUpperCase()
    .replace(/İ/g, "I");

  return temiz === "SIL";
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
    nowMs,
    connections
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

  if (type === "account_pin_recovery_send_request") {
    let netice;

    try {
      netice = await pinBerpaKodunuHazirla(playerId);

      if (
        netice &&
        netice.success === true &&
        netice.emailGonderilmeli === true &&
        netice.email &&
        netice.kod
      ) {
        const emailNeticesi =
          await pinBerpaKoduEmailiGonder(
            netice.email,
            netice.kod
          );

        if (!emailNeticesi || emailNeticesi.success !== true) {
          try {
            await pinBerpaSorqusunuLegvEt(
              netice.sorquId
            );
          }
          catch {
          }

          send(ws, {
            type: "account_pin_recovery_send_result",
            success: false,
            hasPin: true,
            recoveryRequestId: "",
            maskedEmail: netice.maskedEmail || "",
            message: emailNeticesi && emailNeticesi.message
              ? emailNeticesi.message
              : "PIN bərpa kodu e-poçta göndərilə bilmədi.",
            serverTimeUnixMs: nowMs()
          });

          return true;
        }
      }

      send(ws, {
        type: "account_pin_recovery_send_result",
        success: netice && netice.success === true,
        hasPin: netice && netice.hasPin === true,
        cooldown: netice && netice.cooldown === true,
        retryAfterSeconds: netice && netice.retryAfterMs
          ? Math.max(1, Math.ceil(Number(netice.retryAfterMs) / 1000))
          : 0,
        recoveryRequestId: netice && netice.sorquId
          ? netice.sorquId
          : "",
        maskedEmail: netice && netice.maskedEmail
          ? netice.maskedEmail
          : "",
        expiresAtMs: Number(netice && netice.expiresAtMs || 0),
        message: netice && netice.message
          ? netice.message
          : "PIN bərpa sorğusu tamamlandı.",
        serverTimeUnixMs: nowMs()
      });
    }
    catch (xeta) {
      console.error("[PIN_BERPA] Kod göndərmə xətası:", xeta);

      send(ws, {
        type: "account_pin_recovery_send_result",
        success: false,
        hasPin: true,
        recoveryRequestId: "",
        message: "PIN bərpa kodu hazırlanarkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });
    }

    return true;
  }

  if (type === "account_pin_recovery_verify_request") {
    try {
      const netice = await pinBerpaKodunuYoxla(
        playerId,
        metnAl(msg.recoveryRequestId),
        metnAl(msg.kod)
      );

      send(ws, {
        type: "account_pin_recovery_verify_result",
        success: netice && netice.success === true,
        attemptsRemaining: Number(netice && netice.attemptsRemaining || 0),
        expired: netice && netice.expired === true,
        tooManyAttempts: netice && netice.tooManyAttempts === true,
        resetToken: netice && netice.success === true
          ? netice.resetToken || ""
          : "",
        expiresAtMs: Number(netice && netice.expiresAtMs || 0),
        message: netice && netice.message
          ? netice.message
          : "PIN bərpa kodu yoxlanmadı.",
        serverTimeUnixMs: nowMs()
      });
    }
    catch (xeta) {
      console.error("[PIN_BERPA] Kod yoxlama xətası:", xeta);

      send(ws, {
        type: "account_pin_recovery_verify_result",
        success: false,
        resetToken: "",
        message: "PIN bərpa kodu yoxlanarkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });
    }

    return true;
  }

  if (type === "account_pin_recovery_complete_request") {
    try {
      const netice = await pinBerpasiniTamamla(
        playerId,
        metnAl(msg.resetToken),
        metnAl(msg.newPin),
        metnAl(ws._accountSessionId)
      );

      if (netice && netice.success === true) {
        await cihaziEtibarliEtPlayerIdIle(
          playerId,
          metnAl(msg.cihazId)
        );
      }

      send(ws, {
        type: "account_pin_recovery_complete_result",
        success: netice && netice.success === true,
        hasPin: netice && netice.hasPin === true,
        expired: netice && netice.expired === true,
        message: netice && netice.message
          ? netice.message
          : "PIN yenilənə bilmədi.",
        serverTimeUnixMs: nowMs()
      });
    }
    catch (xeta) {
      console.error("[PIN_BERPA] Tamamlama xətası:", xeta);

      send(ws, {
        type: "account_pin_recovery_complete_result",
        success: false,
        hasPin: true,
        message: "PIN yenilənərkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });
    }

    return true;
  }

  if (type === "account_pin_sensitive_authorize_request") {
    try {
      const netice = await pinIcazesiYarat(
        playerId,
        metnAl(msg.operation),
        metnAl(msg.pin)
      );

      send(ws, {
        type: "account_pin_sensitive_authorize_result",
        success: netice && netice.success === true,
        hasPin: netice && netice.hasPin === true,
        locked: netice && netice.locked === true,
        tooManyAttempts: netice && netice.tooManyAttempts === true,
        attemptsRemaining: Number(netice && netice.attemptsRemaining || 0),
        retryAfterSeconds: netice && netice.retryAfterMs
          ? Math.max(1, Math.ceil(Number(netice.retryAfterMs) / 1000))
          : 0,
        operation: netice && netice.operation
          ? netice.operation
          : metnAl(msg.operation),
        authorizationToken: netice && netice.success === true
          ? netice.authorizationToken || ""
          : "",
        expiresAtMs: Number(netice && netice.expiresAtMs || 0),
        message: netice && netice.message
          ? netice.message
          : "PIN icazəsi yaradıla bilmədi.",
        serverTimeUnixMs: nowMs()
      });
    }
    catch (xeta) {
      console.error("[PIN_ICAZE] İcazə yaratma xətası:", xeta);

      send(ws, {
        type: "account_pin_sensitive_authorize_result",
        success: false,
        operation: metnAl(msg.operation),
        authorizationToken: "",
        message: "PIN icazəsi yaradılarkən server xətası baş verdi.",
        serverTimeUnixMs: nowMs()
      });
    }

    return true;
  }

  if (type === "account_pin_protected_delete_request") {
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
      netice = await hesabiSil(
        playerId,
        metnAl(msg.pinAuthorizationToken)
      );
    }
    catch (xeta) {
      console.error("[HESAB_SIL_PIN] Server xətası:", xeta);

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
        pinRequired: netice && netice.pinRequired === true,
        message: netice && netice.message
          ? netice.message
          : "Hesab silinə bilmədi.",
        serverTimeUnixMs: nowMs()
      });

      return true;
    }

    ws._accountSessionId = null;
    ws._authKind = "guest";
    ws._pendingPinChallengeId = null;

    if (connections) {
      connections.set(playerId, ws);
    }

    send(ws, {
      type: "account_delete_result",
      success: true,
      playerId,
      message: netice.message || "Hesab uğurla silindi.",
      serverTimeUnixMs: nowMs()
    });

    console.log(
      "[HESAB_SIL_PIN] Hesab PIN icazəsi ilə silindi, socket guest rejiminə keçirildi:",
      playerId
    );

    return true;
  }

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

      if (netice && netice.success === true) {
        await cihazEtibarlariniLegvEtPlayerIdIle(playerId);
        await cihaziEtibarliEtPlayerIdIle(
          playerId,
          metnAl(msg.cihazId)
        );
      }

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

      if (netice && netice.success === true) {
        await cihazEtibarlariniLegvEtPlayerIdIle(playerId);
      }

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
