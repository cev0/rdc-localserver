"use strict";

const crypto = require("crypto");
const WebSocket = require("ws");

const {
  proqramHovuzunuAl,
  hovuzlariBagla
} = require("./verilenler_bazasi");

const TEST_ID = crypto.randomBytes(8).toString("hex");
const TEST_PLAYER_ID = `ws_test_player_${TEST_ID}`;
const TEST_EMAIL = `ws_test_${TEST_ID}@example.test`;
const TEST_SIFRE = "TestSifre_12345";

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

function mesajGozle(ws, tip, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      temizle();
      reject(new Error(`${tip} cavabı ${timeoutMs} ms ərzində gəlmədi.`));
    }, timeoutMs);

    function temizle() {
      clearTimeout(timer);
      ws.off("message", mesajHandler);
      ws.off("error", errorHandler);
    }

    function errorHandler(xeta) {
      temizle();
      reject(xeta);
    }

    function mesajHandler(data) {
      let mesaj;

      try {
        mesaj = JSON.parse(data.toString());
      }
      catch {
        return;
      }

      if (mesaj && mesaj.type === tip) {
        temizle();
        resolve(mesaj);
      }
    }

    ws.on("message", mesajHandler);
    ws.on("error", errorHandler);
  });
}

function acilmaniGozle(ws, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      temizle();
      reject(new Error(`WebSocket ${timeoutMs} ms ərzində açılmadı.`));
    }, timeoutMs);

    function temizle() {
      clearTimeout(timer);
      ws.off("open", openHandler);
      ws.off("error", errorHandler);
    }

    function openHandler() {
      temizle();
      resolve();
    }

    function errorHandler(xeta) {
      temizle();
      reject(xeta);
    }

    ws.on("open", openHandler);
    ws.on("error", errorHandler);
  });
}

async function testMelumatlariniTemizle() {
  const hovuz = proqramHovuzunuAl();

  await hovuz.query(
    `DELETE FROM hesab_audit_jurnali WHERE oyuncu_id = $1`,
    [TEST_PLAYER_ID]
  );

  await hovuz.query(
    `DELETE FROM hesablar WHERE oyuncu_id = $1`,
    [TEST_PLAYER_ID]
  );
}

async function testiBaslat() {
  const url = websocketUrlAl();
  let ws = null;

  console.log("[SERVER_HESAB_TEST] Test başlayır...");
  console.log("[SERVER_HESAB_TEST] WebSocket:", url.replace(/\?.*$/, ""));

  try {
    await testMelumatlariniTemizle();

    ws = new WebSocket(url);
    await acilmaniGozle(ws);

    console.log("[SERVER_HESAB_TEST] WebSocket bağlantısı uğurludur.");

    const ackPromise = mesajGozle(ws, "ack");
    ws.send(JSON.stringify({
      type: "auth",
      playerId: TEST_PLAYER_ID
    }));

    const ack = await ackPromise;

    if (ack.playerId !== TEST_PLAYER_ID) {
      throw new Error("AUTH cavabında playerId uyğun deyil.");
    }

    console.log("[SERVER_HESAB_TEST] AUTH uğurludur.");

    const ilkInfoPromise = mesajGozle(ws, "account_info_result");
    ws.send(JSON.stringify({
      type: "account_info_request",
      playerId: TEST_PLAYER_ID
    }));

    const ilkInfo = await ilkInfoPromise;

    if (ilkInfo.success !== true || ilkInfo.isBound !== false) {
      throw new Error(
        `İlk account_info gözlənilən nəticəni vermədi: ${JSON.stringify(ilkInfo)}`
      );
    }

    console.log("[SERVER_HESAB_TEST] Bağlanmamış hesab vəziyyəti düzgündür.");

    const bindPromise = mesajGozle(ws, "account_bind_result", 15000);
    ws.send(JSON.stringify({
      type: "account_bind_request",
      playerId: TEST_PLAYER_ID,
      email: TEST_EMAIL,
      sifre: TEST_SIFRE
    }));

    const bind = await bindPromise;

    if (
      bind.success !== true ||
      bind.playerId !== TEST_PLAYER_ID ||
      String(bind.primaryEmail || "").toLowerCase() !== TEST_EMAIL.toLowerCase() ||
      !bind.accountId
    ) {
      throw new Error(
        `account_bind_request uğursuz oldu: ${JSON.stringify(bind)}`
      );
    }

    console.log("[SERVER_HESAB_TEST] Hesab PostgreSQL üzərindən uğurla bağlandı.");

    const ikinciInfoPromise = mesajGozle(ws, "account_info_result");
    ws.send(JSON.stringify({
      type: "account_info_request",
      playerId: TEST_PLAYER_ID
    }));

    const ikinciInfo = await ikinciInfoPromise;

    if (
      ikinciInfo.success !== true ||
      ikinciInfo.isBound !== true ||
      ikinciInfo.accountId !== bind.accountId ||
      String(ikinciInfo.primaryEmail || "").toLowerCase() !== TEST_EMAIL.toLowerCase()
    ) {
      throw new Error(
        `İkinci account_info düzgün deyil: ${JSON.stringify(ikinciInfo)}`
      );
    }

    console.log("[SERVER_HESAB_TEST] Hesab məlumatı WebSocket handler-dən düzgün oxundu.");
    console.log("[SERVER_HESAB_TEST] Bütün server hesab testləri uğurla tamamlandı.");
  }
  catch (xeta) {
    console.error("[SERVER_HESAB_TEST] Test uğursuz oldu:", xeta);
    process.exitCode = 1;
  }
  finally {
    if (ws) {
      try {
        ws.close();
      }
      catch {
      }
    }

    try {
      await testMelumatlariniTemizle();
      console.log("[SERVER_HESAB_TEST] Test hesabı təmizləndi.");
    }
    catch (xeta) {
      console.error(
        "[SERVER_HESAB_TEST] Test məlumatları təmizlənmədi:",
        xeta.message
      );
      process.exitCode = 1;
    }

    try {
      await hovuzlariBagla();
    }
    catch {
    }
  }
}

testiBaslat();
