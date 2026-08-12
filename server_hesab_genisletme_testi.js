"use strict";

const crypto = require("crypto");
const WebSocket = require("ws");

const TEST_ID = crypto.randomBytes(8).toString("hex");
const ILK_PLAYER_ID = `hesab_genisletme_test_${TEST_ID}`;

function websocketUrlAl() {
  const manual = String(process.env.TEST_WS_URL || "").trim();
  if (manual) return manual;

  const publicDomain = String(process.env.KOYEB_PUBLIC_DOMAIN || "").trim();
  if (publicDomain) {
    const temiz = publicDomain
      .replace(/^https?:\/\//i, "")
      .replace(/^wss?:\/\//i, "")
      .replace(/\/$/, "");

    return `wss://${temiz}`;
  }

  const port = Number(process.env.PORT || 8000);
  return `ws://127.0.0.1:${port}`;
}

function acilmaniGozle(ws, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      temizle();
      reject(new Error("WebSocket vaxtında açılmadı."));
    }, timeoutMs);

    function temizle() {
      clearTimeout(timer);
      ws.off("open", acildi);
      ws.off("error", xeta);
    }

    function acildi() {
      temizle();
      resolve();
    }

    function xeta(err) {
      temizle();
      reject(err);
    }

    ws.on("open", acildi);
    ws.on("error", xeta);
  });
}

function mesajGozle(ws, tip, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      temizle();
      reject(new Error(`${tip} cavabı vaxtında gəlmədi.`));
    }, timeoutMs);

    function temizle() {
      clearTimeout(timer);
      ws.off("message", mesaj);
      ws.off("error", xeta);
    }

    function xeta(err) {
      temizle();
      reject(err);
    }

    function mesaj(data) {
      let obyekt;

      try {
        obyekt = JSON.parse(data.toString());
      }
      catch {
        return;
      }

      if (obyekt && obyekt.type === tip) {
        temizle();
        resolve(obyekt);
      }
    }

    ws.on("message", mesaj);
    ws.on("error", xeta);
  });
}

async function testiBaslat() {
  let ws = null;

  console.log("[HESAB_GENISLETME_TEST] Test başlayır...");

  try {
    ws = new WebSocket(websocketUrlAl());
    await acilmaniGozle(ws);

    const ackPromise = mesajGozle(ws, "ack");
    ws.send(JSON.stringify({
      type: "auth",
      playerId: ILK_PLAYER_ID
    }));

    const ack = await ackPromise;
    if (!ack) {
      throw new Error("Guest auth ack alınmadı.");
    }

    console.log("[HESAB_GENISLETME_TEST] Guest auth uğurludur.");

    const ilkInfoPromise = mesajGozle(ws, "account_info_result");
    ws.send(JSON.stringify({
      type: "account_info_request"
    }));

    const ilkInfo = await ilkInfoPromise;

    if (
      ilkInfo.success !== true ||
      ilkInfo.isBound !== false ||
      ilkInfo.linked !== false ||
      ilkInfo.playerId !== ILK_PLAYER_ID ||
      !ilkInfo.providerConfig ||
      typeof ilkInfo.providerConfig !== "object"
    ) {
      throw new Error(
        `Guest account_info düzgün deyil: ${JSON.stringify(ilkInfo)}`
      );
    }

    console.log("[HESAB_GENISLETME_TEST] Guest account_info uğurludur.");

    const tesdiqsizPromise = mesajGozle(ws, "account_new_game_result");
    ws.send(JSON.stringify({
      type: "account_new_game_request"
    }));

    const tesdiqsiz = await tesdiqsizPromise;

    if (
      tesdiqsiz.success !== false ||
      tesdiqsiz.confirmationRequired !== true
    ) {
      throw new Error(
        `Təsdiqsiz yeni oyun bloklanmadı: ${JSON.stringify(tesdiqsiz)}`
      );
    }

    console.log("[HESAB_GENISLETME_TEST] Təsdiqsiz yeni oyun düzgün bloklandı.");

    const yeniOyunPromise = mesajGozle(ws, "account_new_game_result");
    ws.send(JSON.stringify({
      type: "account_new_game_request",
      confirmation: "YENI_OYUN"
    }));

    const yeniOyun = await yeniOyunPromise;

    if (
      yeniOyun.success !== true ||
      yeniOyun.previousPlayerId !== ILK_PLAYER_ID ||
      typeof yeniOyun.playerId !== "string" ||
      !yeniOyun.playerId.startsWith("guest_") ||
      yeniOyun.playerId === ILK_PLAYER_ID ||
      yeniOyun.clearStoredSession !== true
    ) {
      throw new Error(
        `Yeni oyun cavabı düzgün deyil: ${JSON.stringify(yeniOyun)}`
      );
    }

    const yeniPlayerId = yeniOyun.playerId;
    console.log("[HESAB_GENISLETME_TEST] Yeni guest oyun uğurludur.");

    const yeniInfoPromise = mesajGozle(ws, "account_info_result");
    ws.send(JSON.stringify({
      type: "account_info_request"
    }));

    const yeniInfo = await yeniInfoPromise;

    if (
      yeniInfo.success !== true ||
      yeniInfo.isBound !== false ||
      yeniInfo.playerId !== yeniPlayerId
    ) {
      throw new Error(
        `Yeni oyundan sonra account_info düzgün deyil: ${JSON.stringify(yeniInfo)}`
      );
    }

    console.log("[HESAB_GENISLETME_TEST] Yeni playerId socket-ə düzgün bağlandı.");

    const provayderPromise = mesajGozle(
      ws,
      "account_provider_login_result"
    );

    ws.send(JSON.stringify({
      type: "account_provider_login_request",
      provider: "desteklenmir",
      cihazId: `test_cihaz_${TEST_ID}`
    }));

    const provayder = await provayderPromise;

    if (provayder.success !== false) {
      throw new Error(
        `Dəstəklənməyən provayder qəbul edildi: ${JSON.stringify(provayder)}`
      );
    }

    console.log("[HESAB_GENISLETME_TEST] Dəstəklənməyən provayder düzgün rədd edildi.");
    console.log("[HESAB_GENISLETME_TEST] Bütün testlər uğurla tamamlandı.");
  }
  catch (xeta) {
    console.error("[HESAB_GENISLETME_TEST] Test uğursuz oldu:", xeta);
    process.exitCode = 1;
  }
  finally {
    if (ws) {
      try { ws.close(); } catch {}
    }
  }
}

testiBaslat();
