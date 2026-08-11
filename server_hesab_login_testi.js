"use strict";

const crypto = require("crypto");
const WebSocket = require("ws");

const {
  proqramHovuzunuAl,
  hovuzlariBagla
} = require("./verilenler_bazasi");

const TEST_ID = crypto.randomBytes(8).toString("hex");
const TEST_PLAYER_ID = `login_test_player_${TEST_ID}`;
const TEST_EMAIL = `login_test_${TEST_ID}@example.test`;
const TEST_SIFRE = "TestSifre_12345";
const TEST_CIHAZ = `test_cihaz_${TEST_ID}`;

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

async function websocketAc() {
  const ws = new WebSocket(websocketUrlAl());
  await acilmaniGozle(ws);
  return ws;
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
  let wsGuest = null;
  let wsLogin = null;
  let wsRefresh = null;
  let wsKohneToken = null;
  let wsLogoutdanSonra = null;

  console.log("[LOGIN_SESSIYA_TEST] Test başlayır...");

  try {
    await testMelumatlariniTemizle();

    // 1. Test üçün guest player yaradırıq və hesaba bağlayırıq.
    wsGuest = await websocketAc();

    const ackPromise = mesajGozle(wsGuest, "ack");
    wsGuest.send(JSON.stringify({
      type: "auth",
      playerId: TEST_PLAYER_ID
    }));
    await ackPromise;

    const bindPromise = mesajGozle(wsGuest, "account_bind_result");
    wsGuest.send(JSON.stringify({
      type: "account_bind_request",
      playerId: TEST_PLAYER_ID,
      email: TEST_EMAIL,
      sifre: TEST_SIFRE
    }));

    const bind = await bindPromise;
    if (bind.success !== true) {
      throw new Error(`Hesab bağlanmadı: ${JSON.stringify(bind)}`);
    }

    console.log("[LOGIN_SESSIYA_TEST] Test hesabı yaradıldı.");
    wsGuest.close();
    wsGuest = null;

    // 2. Email + şifrə ilə yeni WebSocket-də login.
    wsLogin = await websocketAc();

    const loginPromise = mesajGozle(wsLogin, "account_login_result");
    wsLogin.send(JSON.stringify({
      type: "account_login_request",
      email: TEST_EMAIL,
      sifre: TEST_SIFRE,
      cihazId: TEST_CIHAZ
    }));

    const login = await loginPromise;

    if (
      login.success !== true ||
      login.playerId !== TEST_PLAYER_ID ||
      !login.sessionId ||
      !login.refreshToken ||
      Number(login.expiresAtMs || 0) <= Date.now()
    ) {
      throw new Error(`Login cavabı düzgün deyil: ${JSON.stringify(login)}`);
    }

    const ilkRefreshToken = login.refreshToken;

    console.log("[LOGIN_SESSIYA_TEST] Email + şifrə login uğurludur.");

    // 3. Login socket-i artıq account_info istifadə edə bilməlidir.
    const infoPromise = mesajGozle(wsLogin, "account_info_result");
    wsLogin.send(JSON.stringify({
      type: "account_info_request",
      playerId: TEST_PLAYER_ID
    }));

    const info = await infoPromise;
    if (info.success !== true || info.isBound !== true) {
      throw new Error(`Login-dən sonra account_info uğursuzdur: ${JSON.stringify(info)}`);
    }

    console.log("[LOGIN_SESSIYA_TEST] Login socket autentifikasiya olundu.");

    // 4. Refresh token ilə başqa socket-də sessiyanı yenilə.
    wsRefresh = await websocketAc();

    const refreshPromise = mesajGozle(
      wsRefresh,
      "account_session_refresh_result"
    );

    wsRefresh.send(JSON.stringify({
      type: "account_session_refresh_request",
      refreshToken: ilkRefreshToken,
      cihazId: TEST_CIHAZ
    }));

    const refresh = await refreshPromise;

    if (
      refresh.success !== true ||
      refresh.playerId !== TEST_PLAYER_ID ||
      !refresh.refreshToken ||
      refresh.refreshToken === ilkRefreshToken
    ) {
      throw new Error(`Sessiya refresh düzgün deyil: ${JSON.stringify(refresh)}`);
    }

    const yeniRefreshToken = refresh.refreshToken;

    console.log("[LOGIN_SESSIYA_TEST] Refresh token rotasiyası uğurludur.");

    // 5. Köhnə token artıq işləməməlidir.
    wsKohneToken = await websocketAc();

    const kohnePromise = mesajGozle(
      wsKohneToken,
      "account_session_refresh_result"
    );

    wsKohneToken.send(JSON.stringify({
      type: "account_session_refresh_request",
      refreshToken: ilkRefreshToken,
      cihazId: TEST_CIHAZ
    }));

    const kohne = await kohnePromise;

    if (kohne.success !== false) {
      throw new Error("Köhnə refresh token yenidən qəbul edildi.");
    }

    console.log("[LOGIN_SESSIYA_TEST] Köhnə refresh token düzgün rədd edildi.");

    // 6. Logout yeni token-i ləğv etməlidir.
    const logoutPromise = mesajGozle(wsRefresh, "account_logout_result");

    wsRefresh.send(JSON.stringify({
      type: "account_logout_request",
      refreshToken: yeniRefreshToken
    }));

    const logout = await logoutPromise;
    if (logout.success !== true) {
      throw new Error(`Logout uğursuzdur: ${JSON.stringify(logout)}`);
    }

    console.log("[LOGIN_SESSIYA_TEST] Logout uğurludur.");

    // 7. Logout olunmuş token yenidən işləməməlidir.
    wsLogoutdanSonra = await websocketAc();

    const sonPromise = mesajGozle(
      wsLogoutdanSonra,
      "account_session_refresh_result"
    );

    wsLogoutdanSonra.send(JSON.stringify({
      type: "account_session_refresh_request",
      refreshToken: yeniRefreshToken,
      cihazId: TEST_CIHAZ
    }));

    const son = await sonPromise;

    if (son.success !== false) {
      throw new Error("Logout edilmiş refresh token qəbul edildi.");
    }

    console.log("[LOGIN_SESSIYA_TEST] Logout token-i düzgün rədd edildi.");
    console.log("[LOGIN_SESSIYA_TEST] Bütün login/sessiya testləri uğurla tamamlandı.");
  }
  catch (xeta) {
    console.error("[LOGIN_SESSIYA_TEST] Test uğursuz oldu:", xeta);
    process.exitCode = 1;
  }
  finally {
    for (const ws of [
      wsGuest,
      wsLogin,
      wsRefresh,
      wsKohneToken,
      wsLogoutdanSonra
    ]) {
      if (!ws) continue;
      try {
        ws.close();
      }
      catch {
      }
    }

    try {
      await testMelumatlariniTemizle();
      console.log("[LOGIN_SESSIYA_TEST] Test hesabı təmizləndi.");
    }
    catch (xeta) {
      console.error("[LOGIN_SESSIYA_TEST] Təmizləmə xətası:", xeta.message);
    }

    try {
      await hovuzlariBagla();
    }
    catch {
    }
  }
}

testiBaslat();
