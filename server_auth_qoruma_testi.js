"use strict";

const crypto = require("crypto");
const WebSocket = require("ws");

const {
  proqramHovuzunuAl,
  hovuzlariBagla
} = require("./verilenler_bazasi");

const TEST_ID = crypto.randomBytes(8).toString("hex");
const TEST_PLAYER_ID = `auth_qoruma_player_${TEST_ID}`;
const BASQA_GUEST_ID = `auth_qoruma_guest_${TEST_ID}`;
const TEST_EMAIL = `auth_qoruma_${TEST_ID}@example.test`;
const TEST_SIFRE = "TestSifre_12345";
const TEST_CIHAZ = `auth_qoruma_cihaz_${TEST_ID}`;

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
  const socketler = [];

  console.log("[AUTH_QORUMA_TEST] Test başlayır...");

  try {
    await testMelumatlariniTemizle();

    // 1. Əvvəl guest player yaradıb hesaba bağlayırıq.
    const wsIlkin = await websocketAc();
    socketler.push(wsIlkin);

    const ackPromise = mesajGozle(wsIlkin, "ack");

    wsIlkin.send(JSON.stringify({
      type: "auth",
      playerId: TEST_PLAYER_ID
    }));

    await ackPromise;

    const bindPromise = mesajGozle(wsIlkin, "account_bind_result");

    wsIlkin.send(JSON.stringify({
      type: "account_bind_request",
      playerId: TEST_PLAYER_ID,
      email: TEST_EMAIL,
      sifre: TEST_SIFRE
    }));

    const bind = await bindPromise;

    if (bind.success !== true) {
      throw new Error(`Test hesabı bağlanmadı: ${JSON.stringify(bind)}`);
    }

    wsIlkin.close();

    console.log("[AUTH_QORUMA_TEST] Test hesabı yaradıldı və bağlandı.");

    // 2. Bağlanmış hesab artıq tək playerId ilə legacy auth ola bilməz.
    const wsLegacy = await websocketAc();
    socketler.push(wsLegacy);

    const legacyPromise = mesajGozle(
      wsLegacy,
      "auth_account_required"
    );

    wsLegacy.send(JSON.stringify({
      type: "auth",
      playerId: TEST_PLAYER_ID
    }));

    const legacy = await legacyPromise;

    if (legacy.success !== false) {
      throw new Error(
        `Bağlı hesab legacy auth ilə açıldı: ${JSON.stringify(legacy)}`
      );
    }

    console.log("[AUTH_QORUMA_TEST] Bağlı hesab üçün playerId-only auth bloklandı.");

    // 3. Auth olunmamış socket gameplay sorğusu verə bilməz.
    const wsAuthsiz = await websocketAc();
    socketler.push(wsAuthsiz);

    const authsizPromise = mesajGozle(
      wsAuthsiz,
      "auth_required"
    );

    wsAuthsiz.send(JSON.stringify({
      type: "build_request",
      playerId: TEST_PLAYER_ID,
      buildingId: "house",
      x: 10,
      z: 10
    }));

    const authsiz = await authsizPromise;

    if (authsiz.success !== false) {
      throw new Error(
        `Auth-sız gameplay sorğusu qəbul edildi: ${JSON.stringify(authsiz)}`
      );
    }

    console.log("[AUTH_QORUMA_TEST] Auth-sız gameplay sorğusu bloklandı.");

    // 4. Bir guest socket başqa playerId ilə sorğu verə bilməz.
    const wsBasqaGuest = await websocketAc();
    socketler.push(wsBasqaGuest);

    const basqaAckPromise = mesajGozle(
      wsBasqaGuest,
      "ack"
    );

    wsBasqaGuest.send(JSON.stringify({
      type: "auth",
      playerId: BASQA_GUEST_ID
    }));

    await basqaAckPromise;

    const mismatchPromise = mesajGozle(
      wsBasqaGuest,
      "identity_mismatch"
    );

    wsBasqaGuest.send(JSON.stringify({
      type: "build_request",
      playerId: TEST_PLAYER_ID,
      buildingId: "house",
      x: 10,
      z: 10
    }));

    const mismatch = await mismatchPromise;

    if (mismatch.success !== false) {
      throw new Error(
        `Başqa playerId ilə sorğu qəbul edildi: ${JSON.stringify(mismatch)}`
      );
    }

    console.log("[AUTH_QORUMA_TEST] Socket/playerId uyğunsuzluğu bloklandı.");

    // 5. Normal e-poçt + şifrə login hələ də işləməlidir.
    const wsLogin = await websocketAc();
    socketler.push(wsLogin);

    const loginPromise = mesajGozle(
      wsLogin,
      "account_login_result"
    );

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
      !login.refreshToken
    ) {
      throw new Error(
        `Normal hesab login-i uğursuz oldu: ${JSON.stringify(login)}`
      );
    }

    console.log("[AUTH_QORUMA_TEST] Təhlükəsiz hesab login-i işləyir.");
    console.log("[AUTH_QORUMA_TEST] Bütün təhlükəsizlik testləri uğurludur.");
  }
  catch (xeta) {
    console.error("[AUTH_QORUMA_TEST] Test uğursuz oldu:", xeta);
    process.exitCode = 1;
  }
  finally {
    for (const ws of socketler) {
      if (!ws) continue;

      try {
        ws.close();
      }
      catch {
      }
    }

    try {
      await testMelumatlariniTemizle();
      console.log("[AUTH_QORUMA_TEST] Test hesabı təmizləndi.");
    }
    catch (xeta) {
      console.error(
        "[AUTH_QORUMA_TEST] Təmizləmə xətası:",
        xeta.message
      );
    }

    try {
      await hovuzlariBagla();
    }
    catch {
    }
  }
}

testiBaslat();
